import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';
import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {Pool} from 'pg';
import {openPostgres,bindDataMode} from '../src/server/database';
import {migrateDatabase} from '../db/migrate';
import {invariant} from '../src/domain/errors';

// Explicit synthetic production HTTP check, restricted to an isolated local DB.
const target=process.env.FORKTRADE_POSTGRES_TEST_URL;
invariant(target,'Set FORKTRADE_POSTGRES_TEST_URL to an isolated loopback forktrade_test database');
const parsed=new URL(target);
invariant(['127.0.0.1','localhost','[::1]'].includes(parsed.hostname)&&parsed.pathname.startsWith('/forktrade_test'),'Only an isolated loopback forktrade_test database is permitted');
const schema=`forktrade_http_${randomUUID().replaceAll('-','')}`,admin=new Pool({connectionString:target,max:1});
let server:ChildProcess|undefined,created=false;
const canonical='https://forktrade.example';
const input={title:'SYNTHETIC hosted HTTP check',rationale:'Explicit local test only',invalidation:'Synthetic condition',riskNotes:'PRIVATE_HTTP_CANARY',side:'buy',price:'82000',quantity:'0.0002',quantityCap:'0.001',notionalCap:'100'};
type Login={cookie:string;csrf:string};
const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));
const port=(probe.address() as {port:number}).port;await new Promise<void>(resolve=>probe.close(()=>resolve()));
const base=`http://127.0.0.1:${port}`;
async function start(){
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{
    windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_ENV:'production',VERCEL:'1',DATABASE_URL:parsed.toString(),POSTGRES_URL:'',FORKTRADE_MODE:'offline',FORKTRADE_ORIGIN:canonical,FORKTRADE_AUTH_ENABLED:'false',FORKTRADE_EXECUTION_ENABLED:'false',FORKTRADE_ENVIRONMENT_CONFIRMED:'false'}
  });
  server.stdout?.on('data',()=>{});server.stderr?.on('data',()=>{});
  for(let i=0;i<100;i++){
    try{const result=await fetch(`${base}/api/health`);if(result.ok)return;}catch{/* Startup polling only; no state was changed. */}
    invariant(server.exitCode===null,'Production server exited during startup');
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw new Error('Production HTTP startup timed out');
}
async function stop(){if(server?.exitCode===null){const exited=once(server,'exit');server.kill();await exited;}}
async function call(path:string,body?:unknown,login?:Login){
  return fetch(`${base}/api/${path}`,{method:body===undefined?'GET':'POST',headers:{Origin:canonical,'Content-Type':'application/json',...(login?{Cookie:login.cookie,'X-CSRF-Token':login.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
}
async function json(path:string,body?:unknown,login?:Login){const response=await call(path,body,login);invariant(response.ok,`Synthetic HTTP operation failed at ${path.split('/')[0]} (${response.status})`);return response.json();}
async function login():Promise<Login>{const response=await call('session/offline',{});invariant(response.ok&&response.headers.get('set-cookie')?.includes('; Secure'),'Hosted session requires a secure cookie');const body=await response.json();return {cookie:response.headers.get('set-cookie')!.split(';')[0],csrf:body.csrf};}
try{
  await admin.query(`CREATE SCHEMA "${schema}"`);created=true;
  parsed.searchParams.set('options',`-c search_path=${schema}`);
  const setup=openPostgres(parsed.toString());
  try{await migrateDatabase(setup.db);await bindDataMode(setup,'offline');}finally{await setup.close();}
  await start();
  const health=await json('health');invariant(health.hosted&&health.storage==='postgresql'&&health.mode==='offline','Hosted synthetic PostgreSQL profile required');
  const owner=await login(),other=await login();
  const root=await json('plans',{input},owner),versionId=root.versions[0].id;
  invariant((await call(`plans/${root.id}`,undefined,other)).status===404,'Cross-owner read must be denied');
  const preview=await json(`plans/${root.id}/preview`,{versionId},owner);
  const approvals=await Promise.all(Array.from({length:4},()=>json(`plans/${root.id}/approve`,{previewId:preview.id,payloadHash:preview.payloadHash,scenario:'open'},owner)));
  invariant(new Set(approvals.map(item=>item.id)).size===1,'Concurrent HTTP approvals must retain one identity');
  const fields=['title','parameters','lineage','evidence'];
  const card=await json(`plans/${root.id}/publish`,{versionId,fields,confirmed:true},owner);
  const shared=await json(`cards/${card.id}`);
  invariant(shared.hosted&&shared.evidence.level==='synthetic'&&!JSON.stringify(shared).includes('PRIVATE_HTTP_CANARY'),'Hosted public projection must be labelled and redacted');
  const child=await json('plans',{input:{...input,price:'81500',riskNotes:''},source:{publicationId:card.id,revision:card.revision}},other);
  const childCard=await json(`plans/${child.id}/publish`,{versionId:child.versions[0].id,fields,confirmed:true},other);
  invariant(childCard.comparison?.sourceVersion===1&&child.depth===1,'Independent remix must pin one source version');
  await stop();await start();
  const restored=await json(`plans/${root.id}`,undefined,owner);
  invariant(restored.attempts.length===1&&restored.attempts[0].id===approvals[0].id,'Restart must retain session, plan and original execution identity');
  await json(`publications/${card.id}/unpublish`,{},owner);
  invariant((await call(`cards/${card.id}`)).status===404,'Withdrawn card must be unavailable');
  invariant((await json(`cards/${childCard.id}`)).comparison===null,'Withdrawn source must stop appearing in public comparisons');
  const flags=await json('session');invariant(!flags.authEnabled&&!flags.executionEnabled,'No wallet or real transaction may be enabled in this check');
  console.log('PASS: production HTTP + actual PostgreSQL; concurrency, ownership, public projection/remix, restart persistence and withdrawal. Synthetic only; not a Vercel/Neon deployment.');
}catch(error){console.error('Hosted HTTP check failed: '+(error instanceof Error?error.message:'Unknown failure'));process.exitCode=1;}
finally{await stop();if(created)await admin.query(`DROP SCHEMA "${schema}" CASCADE`);await admin.end();}
