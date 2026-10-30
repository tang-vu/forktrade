import {randomBytes} from 'node:crypto';
import {and,eq,gt,sql} from 'drizzle-orm';
import {createSiweMessage} from 'viem/siwe';
import {verifyMessage,getAddress,type Address,type Hex} from 'viem';
import {sessions,challenges,rateLimits} from '../../db/schema';
import {database,mode,type Db} from './database';
import {hash} from '../domain/plan';
import {invariant} from '../domain/errors';
export const COOKIE='forktrade_session';
export function origin(){
  const value=process.env.FORKTRADE_ORIGIN;
  invariant(value||!process.env.VERCEL,'Configure the canonical HTTPS application origin',503);
  const parsed=new URL(value||'http://127.0.0.1:3000');
  invariant(parsed.origin===parsed.href.replace(/\/$/,'')&&!parsed.username&&!parsed.password,'Application origin must not contain paths or credentials',503);
  invariant(!process.env.VERCEL||parsed.protocol==='https:','Hosted application origin must use HTTPS',503);
  return parsed.origin;
}
export function sameOrigin(request:Request) {
  invariant(request.headers.get('origin')===origin(),'Same-origin request required',403);
  invariant(!['cross-site'].includes(request.headers.get('sec-fetch-site')||''),'Cross-site mutation denied',403);
}
export function token(request:Request) {
  return request.headers.get('cookie')?.split(';').map(p=>p.trim()).find(p=>p.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1)||'';
}
export async function session(request:Request,mutation=false) {
  const raw=token(request); invariant(/^[a-f0-9]{64}$/.test(raw),'Start an offline session or authenticate ownership',401);
  const [row]=await (await database()).db.select().from(sessions).where(and(eq(sessions.tokenHash,hash(raw)),gt(sessions.expiresAt,Date.now())));
  invariant(row,'Session expired; authenticate again',401);
  invariant((mode()==='offline' && row.mode==='offline') || (mode()!=='offline' && row.mode==='testnet'),'Session belongs to another mode',401);
  if(mutation){sameOrigin(request);invariant(request.headers.get('x-csrf-token')===row.csrf,'Session verification failed',403);}
  return row;
}
export async function createSession(owner:string,sessionMode:'offline'|'testnet',transaction?:Db) {
  const raw=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex'),expiresAt=Date.now()+8*60*60*1000;
  const db=transaction||(await database()).db;
  await db.insert(sessions).values({tokenHash:hash(raw),owner,mode:sessionMode,csrf,expiresAt});
  return {raw,csrf,owner,expiresAt,mode:sessionMode};
}
export function cookie(raw:string,maxAge=8*60*60){return `${COOKIE}=${raw}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${origin().startsWith('https:')?'; Secure':''}`;}

export async function rateLimit(key:string,limit=20) {
  const db=(await database()).db,now=Date.now(),until=now+60000;
  // Atomic UPSERT shares the counter across instances; no process-local bypass.
  const [row]=await db.insert(rateLimits).values({key:hash(key),count:1,until}).onConflictDoUpdate({target:rateLimits.key,set:{
    count:sql`CASE WHEN ${rateLimits.until} <= ${now} THEN 1 ELSE ${rateLimits.count} + 1 END`,
    until:sql`CASE WHEN ${rateLimits.until} <= ${now} THEN ${until} ELSE ${rateLimits.until} END`
  }}).returning({count:rateLimits.count});
  invariant(row.count<=limit,'Too many requests; wait one minute',429);
}
export async function issueChallenge(address:Address) {
  const domain=new URL(origin()).host;const nonce=randomBytes(16).toString('hex'),expiresAt=Date.now()+5*60_000;
  const normalized=getAddress(address);
  const message=createSiweMessage({address:normalized,chainId:50383,domain,uri:origin(),version:'1',nonce,
    issuedAt:new Date(),expirationTime:new Date(expiresAt),statement:'Authenticate ownership for private ForkTrade testnet plans. This grants no trading authority.'});
  await (await database()).db.insert(challenges).values({nonce,address:normalized.toLowerCase(),message,domain,expiresAt,used:false});
  return {nonce,message,expiresAt};
}
export async function verifyChallenge(nonce:string,address:Address,signature:Hex,verifier=verifyMessage) {
  const db=(await database()).db;
  const [row]=await db.select().from(challenges).where(eq(challenges.nonce,nonce));
  invariant(row && !row.used && row.expiresAt>Date.now() && row.domain===new URL(origin()).host && row.address===address.toLowerCase(),'Challenge invalid, expired or already used',401);
  const valid=await verifier({address,message:row.message,signature});
  invariant(valid,'Ownership signature rejected',401);
  return db.transaction(async tx=>{
    const used=await tx.update(challenges).set({used:true}).where(and(eq(challenges.nonce,nonce),eq(challenges.used,false),gt(challenges.expiresAt,Date.now()))).returning({nonce:challenges.nonce});
    invariant(used.length===1,'Challenge already consumed or expired',401);
    return createSession(address.toLowerCase(),'testnet',tx);
  });
}
