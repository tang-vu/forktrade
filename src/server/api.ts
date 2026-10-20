import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {eq} from 'drizzle-orm';
import {isAddress,createPublicClient,http} from 'viem';
import {sessions} from '../../db/schema';
import {database,mode} from './database';
import {Repository,publicFields} from './repository';
import {DomainError,invariant} from '../domain/errors';
import {planInput} from '../domain/plan';
import * as auth from './auth';
import {readPublicMarket,jsonSafe,RPC} from '../integrations/readonly';

const id=z.string().uuid();
export async function handle(request:Request) {
  const headers=new Headers({'Cache-Control':'no-store, private','Content-Type':'application/json'});
  const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
  try {
    const path=new URL(request.url).pathname.replace(/^\/api\//,'').split('/');
    const method=request.method,appMode=mode();
    if(method==='GET' && path.join('/')==='session') {
      let current:null|{owner:string;csrf:string;expiresAt:number}=null;
      try {const s=auth.session(request);current={owner:s.owner,csrf:s.csrf,expiresAt:s.expiresAt};} catch(error){if(!(error instanceof DomainError && error.status===401))throw error;}
      return reply({mode:appMode,session:current,authEnabled:process.env.FORKTRADE_AUTH_ENABLED==='true',executionEnabled:false});
    }
    if(method==='GET' && path.join('/')==='market') {
      auth.rateLimit('public-market');return reply(jsonSafe(await readPublicMarket()));
    }
    const repo=new Repository(database());
    if(method==='GET' && path[0]==='cards' && path.length===2)return reply(repo.publicCard(id.parse(path[1])));
    let body:unknown={};
    if(method==='POST') {
      auth.sameOrigin(request);const raw=await request.text();invariant(raw.length<=16000,'Request is too large',413);
      try{body=raw?JSON.parse(raw):{};}catch{throw new DomainError('Invalid JSON');}
    }
    if(method==='POST' && path.join('/')==='session/offline') {
      invariant(appMode==='offline','Offline sessions are disabled in this mode',403);auth.rateLimit('offline-session');
      const s=auth.createSession(`offline:${randomUUID()}`,'offline');headers.set('Set-Cookie',auth.cookie(s.raw));
      return reply({owner:s.owner,csrf:s.csrf,expiresAt:s.expiresAt});
    }
    if(method==='POST' && path[0]==='auth') {
      invariant(appMode!=='offline' && process.env.FORKTRADE_AUTH_ENABLED==='true','Wallet authentication requires a separately authorized session; disabled',403);
      auth.rateLimit('wallet-auth');
      if(path[1]==='challenge') {
        const b=z.object({address:z.string().refine(isAddress)}).strict().parse(body);
        const rpc=createPublicClient({transport:http(RPC,{timeout:10000,retryCount:0})});
        invariant(await rpc.getChainId()===50383,'Wrong RPC chain');
        const code=await rpc.getCode({address:b.address as `0x${string}`});
        invariant(!code || code==='0x','Contract wallets are not supported in v1; no EOA ownership claim made');
        return reply(auth.issueChallenge(b.address as `0x${string}`));
      }
      if(path[1]==='verify') {
        const b=z.object({nonce:z.string().regex(/^[a-f0-9]{32}$/),address:z.string().refine(isAddress),signature:z.string().regex(/^0x[a-fA-F0-9]{130}$/)}).strict().parse(body);
        const s=await auth.verifyChallenge(b.nonce,b.address as `0x${string}`,b.signature as `0x${string}`);headers.set('Set-Cookie',auth.cookie(s.raw));return reply({owner:s.owner,csrf:s.csrf,expiresAt:s.expiresAt});
      }
    }
    const s=auth.session(request,method==='POST');
    if(method==='POST' && path.join('/')==='session/logout') {
      database().db.delete(sessions).where(eq(sessions.tokenHash,s.tokenHash)).run();headers.set('Set-Cookie',auth.cookie('',0));return reply({loggedOut:true});
    }
    // This increment implements the complete offline path. Live mutations fail closed.
    invariant(appMode==='offline' && s.mode==='offline','Live plan/execution integration is not enabled in this increment',403);
    if(method==='GET' && path.join('/')==='plans')return reply(repo.list(s.owner));
    if(method==='POST' && path.join('/')==='plans') {
      const b=z.object({input:planInput,source:z.object({publicationId:id,revision:z.number().int().positive()}).strict().optional()}).strict().parse(body);
      return reply(repo.create(s.owner,b.input,b.source),201);
    }
    if(path[0]==='plans' && path[1]) {
      const planId=id.parse(path[1]);
      if(method==='GET' && path.length===2)return reply(repo.get(s.owner,planId));
      if(method==='POST' && path[2]==='versions') {const b=z.object({expectedVersion:z.number().int().positive(),input:planInput}).strict().parse(body);return reply(repo.save(s.owner,planId,b.expectedVersion,b.input));}
      if(method==='POST' && path[2]==='preview') {const b=z.object({versionId:id}).strict().parse(body);return reply(repo.preview(s.owner,planId,b.versionId));}
      if(method==='POST' && path[2]==='approve') {
        const b=z.object({previewId:id,payloadHash:z.string().regex(/^[a-f0-9]{64}$/),scenario:z.enum(['open','partial_cancelled','rejected','unknown','wallet_rejected','reverted'])}).strict().parse(body);
        const claim=repo.claim(s.owner,planId,b.previewId,b.payloadHash);
        const result=claim.claimed?repo.simulate(s.owner,claim.attempt.id,b.scenario):claim.attempt;
        return reply(result);
      }
      if(method==='POST' && path[2]==='publish') {const b=z.object({versionId:id,fields:publicFields,confirmed:z.literal(true)}).strict().parse(body);return reply(repo.publish(s.owner,planId,b.versionId,b.fields));}
    }
    if(method==='POST' && path[0]==='attempts' && path[2]==='refresh') {z.object({}).strict().parse(body);return reply(repo.refresh(s.owner,id.parse(path[1])));}
    if(method==='POST' && path[0]==='publications' && path[2]==='unpublish') {z.object({}).strict().parse(body);return reply(repo.unpublish(s.owner,id.parse(path[1])));}
    return reply({error:'Route unavailable'},404);
  }catch(error) {
    if(error instanceof DomainError)return reply({error:error.message},error.status);
    if(error instanceof z.ZodError)return reply({error:'Invalid request. Check required fields and allowed values.'},400);
    // Keep arbitrary upstream errors, request contents and session material out of logs/responses.
    return reply({error:'Operation unavailable. Your saved records were preserved; refresh before continuing.'},503);
  }
}
