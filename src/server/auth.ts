import {randomBytes} from 'node:crypto';
import {and,eq,gt} from 'drizzle-orm';
import {createSiweMessage} from 'viem/siwe';
import {verifyMessage,getAddress,type Address,type Hex} from 'viem';
import {sessions,challenges} from '../../db/schema';
import {database,mode} from './database';
import {hash} from '../domain/plan';
import {invariant} from '../domain/errors';
export const COOKIE='forktrade_session';
export function origin(){return process.env.FORKTRADE_ORIGIN || 'http://127.0.0.1:3000';}
export function sameOrigin(request:Request) {
  invariant(request.headers.get('origin')===origin(),'Same-origin request required',403);
  invariant(!['cross-site'].includes(request.headers.get('sec-fetch-site')||''),'Cross-site mutation denied',403);
}
export function token(request:Request) {
  return request.headers.get('cookie')?.split(';').map(p=>p.trim()).find(p=>p.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1)||'';
}
export function session(request:Request,mutation=false) {
  const raw=token(request); invariant(/^[a-f0-9]{64}$/.test(raw),'Start an offline session or authenticate ownership',401);
  const row=database().db.select().from(sessions).where(and(eq(sessions.tokenHash,hash(raw)),gt(sessions.expiresAt,Date.now()))).get();
  invariant(row,'Session expired; authenticate again',401);
  invariant((mode()==='offline' && row.mode==='offline') || (mode()!=='offline' && row.mode==='testnet'),'Session belongs to another mode',401);
  if(mutation){sameOrigin(request);invariant(request.headers.get('x-csrf-token')===row.csrf,'Session verification failed',403);}
  return row;
}
export function createSession(owner:string,sessionMode:'offline'|'testnet') {
  const raw=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex'),expiresAt=Date.now()+8*60*60*1000;
  database().db.insert(sessions).values({tokenHash:hash(raw),owner,mode:sessionMode,csrf,expiresAt}).run();
  return {raw,csrf,owner,expiresAt,mode:sessionMode};
}
export function cookie(raw:string,maxAge=8*60*60){return `${COOKIE}=${raw}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${origin().startsWith('https:')?'; Secure':''}`;}

const limits=new Map<string,{count:number;until:number}>();
export function rateLimit(key:string) {
  const now=Date.now();const old=limits.get(key);
  if(limits.size>1000)for(const [k,v]of limits)if(v.until<now)limits.delete(k);
  if(!old || old.until<now)limits.set(key,{count:1,until:now+60_000});
  else {invariant(old.count<20,'Too many requests; wait one minute',429);old.count++;}
}
export function issueChallenge(address:Address) {
  const domain=new URL(origin()).host;const nonce=randomBytes(16).toString('hex'),expiresAt=Date.now()+5*60_000;
  const normalized=getAddress(address);
  const message=createSiweMessage({address:normalized,chainId:50383,domain,uri:origin(),version:'1',nonce,
    issuedAt:new Date(),expirationTime:new Date(expiresAt),statement:'Authenticate ownership for private ForkTrade testnet plans. This grants no trading authority.'});
  database().db.insert(challenges).values({nonce,address:normalized.toLowerCase(),message,domain,expiresAt,used:false}).run();
  return {nonce,message,expiresAt};
}
export async function verifyChallenge(nonce:string,address:Address,signature:Hex,verifier=verifyMessage) {
  const row=database().db.select().from(challenges).where(eq(challenges.nonce,nonce)).get();
  invariant(row && !row.used && row.expiresAt>Date.now() && row.domain===new URL(origin()).host && row.address===address.toLowerCase(),'Challenge invalid, expired or already used',401);
  const valid=await verifier({address,message:row.message,signature});
  invariant(valid,'Ownership signature rejected',401);
  const used=database().db.update(challenges).set({used:true}).where(and(eq(challenges.nonce,nonce),eq(challenges.used,false),gt(challenges.expiresAt,Date.now()))).run();
  invariant(used.changes===1,'Challenge already consumed or expired',401);
  return createSession(address.toLowerCase(),'testnet');
}
