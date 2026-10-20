import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {isAddress,createPublicClient,http} from 'viem';
import {sessions} from '../../db/schema';
import {database,mode} from './database';
import {Repository,publicFields,correlationTag} from './repository';
import {DomainError,invariant} from '../domain/errors';
import {planInput} from '../domain/plan';
import type {Observation} from '../domain/execution';
import * as auth from './auth';
import {capabilities} from './capabilities';
import {readPublicMarket,jsonSafe,RPC} from '../integrations/readonly';
import {authoringContext} from '../integrations/read-context';
import {prepareLiveContext} from '../integrations/prepare-order';
import {observeOrder} from '../integrations/observe-order';

const id=z.string().uuid();
const walletReport=z.discriminatedUnion('kind',[
  z.object({kind:z.literal('hash'),hash:z.string().regex(/^0x[a-fA-F0-9]{64}$/)}).strict(),
  z.object({kind:z.enum(['rejected','interrupted','context_changed'])}).strict()
]);
async function refreshLive(repo:Repository,owner:string,attemptId:string,strict=false) {
  const {attempt,preview}=repo.getAttempt(owner,attemptId);
  if(attempt.execution.tx==='not_submitted'&&!attempt.candidateHash)return attempt;
  try {return repo.recordObservation(owner,attemptId,await observeOrder(attempt.execution,preview.payload,attempt.candidateHash));}
  catch(error) {
    const e=attempt.execution;
    const observation:Observation={...e,authoritative:false,tx:'unknown',order:'unknown',coverage:'unavailable',observedAt:Date.now(),source:'observation conflict/unavailable; earlier evidence retained',reason:error instanceof DomainError?error.message:'Observation unavailable; no automatic retry'};
    const result=repo.recordObservation(owner,attemptId,observation);
    if(strict)throw error;return result;
  }
}
export async function handle(request:Request) {
  const headers=new Headers({'Cache-Control':'no-store, private','Content-Type':'application/json'});
  const reply=(data:unknown,status=200)=>Response.json(jsonSafe(data),{status,headers});
  try {
    const path=new URL(request.url).pathname.replace(/^\/api\//,'').split('/'),route=path.join('/');
    const method=request.method,appMode=mode(),caps=capabilities();
    if(method==='GET'&&route==='session') {
      let current:null|{owner:string;csrf:string;expiresAt:number}=null;
      try{const s=auth.session(request);current={owner:s.owner,csrf:s.csrf,expiresAt:s.expiresAt};}catch(error){if(!(error instanceof DomainError&&error.status===401))throw error;}
      return reply({mode:appMode,session:current,...caps});
    }
    if(method==='GET'&&route==='market'){auth.rateLimit('public-market');return reply(await readPublicMarket());}
    const repo=new Repository(database(),appMode==='offline'?'offline':'testnet');
    if(method==='GET'&&path[0]==='cards'&&path.length===2) {
      const publicId=id.parse(path[1]);repo.publicCard(publicId); // Validate publication BEFORE any external observation.
      auth.rateLimit(`card:${publicId}`);
      if(appMode!=='offline'){const attempt=repo.publishedAttempt(publicId);if(attempt)await refreshLive(repo,attempt.owner,attempt.id);}
      return reply(repo.publicCard(publicId)); // Recheck withdrawal/allowlist after async work.
    }
    let body:unknown={};
    if(method==='POST') {
      auth.sameOrigin(request);const raw=await request.text();invariant(raw.length<=16000,'Request is too large',413);
      try{body=raw?JSON.parse(raw):{};}catch{throw new DomainError('Invalid JSON');}
    }
    if(method==='POST'&&route==='session/offline') {
      invariant(appMode==='offline','Offline sessions are disabled in this mode',403);auth.rateLimit('offline-session');
      const s=auth.createSession(`offline:${randomUUID()}`,'offline');headers.set('Set-Cookie',auth.cookie(s.raw));return reply({owner:s.owner,csrf:s.csrf,expiresAt:s.expiresAt});
    }
    if(method==='POST'&&path[0]==='auth'&&path.length===2) {
      invariant(caps.authEnabled,'Wallet authentication requires a separately authorized session; disabled',403);auth.rateLimit('wallet-auth');
      if(path[1]==='challenge') {
        const b=z.object({address:z.string().refine(isAddress)}).strict().parse(body);
        const rpc=createPublicClient({transport:http(RPC,{timeout:10000,retryCount:0})});invariant(await rpc.getChainId()===50383,'Wrong RPC chain');
        const code=await rpc.getCode({address:b.address as `0x${string}`});invariant(!code||code==='0x','Contract wallets/delegated EOAs are unsupported in v1');return reply(auth.issueChallenge(b.address as `0x${string}`));
      }
      if(path[1]==='verify') {
        const b=z.object({nonce:z.string().regex(/^[a-f0-9]{32}$/),address:z.string().refine(isAddress),signature:z.string().regex(/^0x[a-fA-F0-9]{130}$/)}).strict().parse(body);
        const s=await auth.verifyChallenge(b.nonce,b.address as `0x${string}`,b.signature as `0x${string}`);headers.set('Set-Cookie',auth.cookie(s.raw));return reply({owner:s.owner,csrf:s.csrf,expiresAt:s.expiresAt});
      }
    }
    const s=auth.session(request,method==='POST');
    if(method==='POST'&&route==='session/logout'){database().db.delete(sessions).where(eq(sessions.tokenHash,s.tokenHash)).run();headers.set('Set-Cookie',auth.cookie('',0));return reply({loggedOut:true});}
    if(method==='GET'&&route==='plans')return reply(repo.list(s.owner));
    if(method==='POST'&&route==='plans') {
      const b=z.object({input:planInput,source:z.object({publicationId:id,revision:z.number().int().positive()}).strict().optional()}).strict().parse(body);
      const context=appMode==='offline'?undefined:authoringContext(await readPublicMarket(),s.owner);
      return reply(repo.create(s.owner,b.input,b.source,context),201);
    }
    if(path[0]==='plans'&&path[1]) {
      const planId=id.parse(path[1]);
      if(method==='GET'&&path.length===2)return reply(repo.get(s.owner,planId));
      if(method==='POST'&&path.length===3) {
        if(path[2]==='versions') {
          const b=z.object({expectedVersion:z.number().int().positive(),input:planInput}).strict().parse(body);repo.get(s.owner,planId);
          const context=appMode==='offline'?undefined:authoringContext(await readPublicMarket(),s.owner);
          return reply(repo.save(s.owner,planId,b.expectedVersion,b.input,context));
        }
        if(path[2]==='preview') {
          const b=z.object({versionId:id}).strict().parse(body),plan=repo.get(s.owner,planId),version=plan.versions.find(v=>v.id===b.versionId);
          invariant(version,'Version unavailable',404);
          if(appMode==='offline')return reply(repo.preview(s.owner,planId,b.versionId));
          invariant(caps.authEnabled,'Account reads require the authorized ownership session',403);
          const tag=correlationTag(),context=await prepareLiveContext(s.owner,version.input,tag);
          return reply(repo.preview(s.owner,planId,b.versionId,context,tag));
        }
        if(path[2]==='approve') {
          if(appMode==='offline') {
            const b=z.object({previewId:id,payloadHash:z.string().regex(/^[a-f0-9]{64}$/),scenario:z.enum(['open','partial_cancelled','rejected','unknown','wallet_rejected','reverted'])}).strict().parse(body);
            const claim=repo.claim(s.owner,planId,b.previewId,b.payloadHash);return reply(claim.claimed?repo.simulate(s.owner,claim.attempt.id,b.scenario):claim.attempt);
          }
          invariant(caps.executionEnabled,caps.disabledReason||'Live execution disabled',403);
          const b=z.object({previewId:id,payloadHash:z.string().regex(/^[a-f0-9]{64}$/),confirmed:z.literal(true)}).strict().parse(body);
          const preview=repo.getPreview(s.owner,planId,b.previewId);invariant(preview.payloadHash===b.payloadHash,'Approved payload does not match preview',409);
          const plan=repo.get(s.owner,planId),version=plan.versions.find(v=>v.id===preview.versionId)!;
          const existing=plan.attempts.find(a=>a.versionId===preview.versionId);
          const context=existing?undefined:await prepareLiveContext(s.owner,version.input,preview.payload.userData,preview.context.transaction);
          const claim=repo.claim(s.owner,planId,b.previewId,b.payloadHash,context);
          return reply({...claim,attemptId:claim.attempt.id,payload:preview.payload});
        }
        if(path[2]==='publication-preview') {
          const b=z.object({versionId:id,fields:publicFields}).strict().parse(body);return reply(repo.publicationPreview(s.owner,planId,b.versionId,b.fields));
        }
        if(path[2]==='publish') {
          const b=z.object({versionId:id,fields:publicFields,confirmed:z.literal(true)}).strict().parse(body);return reply(repo.publish(s.owner,planId,b.versionId,b.fields));
        }
      }
    }
    if(method==='POST'&&path[0]==='attempts'&&path.length===3) {
      const attemptId=id.parse(path[1]);
      if(path[2]==='refresh'){z.object({}).strict().parse(body);return reply(appMode==='offline'?repo.refresh(s.owner,attemptId):await refreshLive(repo,s.owner,attemptId));}
      if(path[2]==='report') {
        invariant(appMode!=='offline','Wallet results cannot enter offline records',403);const result=walletReport.parse(body);
        const reported=repo.recordWalletResult(s.owner,attemptId,result as Parameters<Repository['recordWalletResult']>[2]);
        return reply(result.kind==='hash'?await refreshLive(repo,s.owner,attemptId,true):reported);
      }
    }
    if(method==='POST'&&path[0]==='publications'&&path[2]==='unpublish'&&path.length===3){z.object({}).strict().parse(body);return reply(repo.unpublish(s.owner,id.parse(path[1])));}
    return reply({error:'Route unavailable'},404);
  } catch(error) {
    if(error instanceof DomainError)return reply({error:error.message},error.status);
    if(error instanceof z.ZodError)return reply({error:'Invalid request. Check required fields and allowed values.'},400);
    return reply({error:'Operation unavailable. Saved identities were preserved; refresh before continuing.'},503);
  }
}
