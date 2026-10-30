import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {and,count,eq,sql} from 'drizzle-orm';
import {openPostgres,bindDataMode,database,type DatabaseConnection} from '../src/server/database';
import {migrateDatabase} from '../db/migrate';
import {Repository} from '../src/server/repository';
import {attempts,observations,versions,publications,sessions,rateLimits,challenges} from '../db/schema';
import {hash} from '../src/domain/plan';
import * as auth from '../src/server/auth';
import {handle} from '../src/server/api';

// Actual PostgreSQL on loopback only; never target the app/Neon database by accident.
const target=process.env.FORKTRADE_POSTGRES_TEST_URL;
const schema=`forktrade_spec_${randomUUID().replaceAll('-','')}`;
let admin:Pool,a:DatabaseConnection,b:DatabaseConnection,url:string;
const saved={DATABASE_URL:process.env.DATABASE_URL,FORKTRADE_MODE:process.env.FORKTRADE_MODE,FORKTRADE_ORIGIN:process.env.FORKTRADE_ORIGIN};
const input={title:'SYNTHETIC PostgreSQL concurrency test',rationale:'Isolated database test only',invalidation:'Synthetic condition',riskNotes:'PRIVATE_PG_CANARY',side:'buy' as const,price:'82000',quantity:'0.0002',quantityCap:'0.001',notionalCap:'100'};

describe.skipIf(!target)('actual PostgreSQL: independent pools, durable identity and atomic mutations',()=>{
  beforeAll(async()=>{
    const parsed=new URL(target!);
    if(!['127.0.0.1','localhost','[::1]'].includes(parsed.hostname)||!parsed.pathname.startsWith('/forktrade_test'))throw new Error('Use an isolated loopback forktrade_test database');
    admin=new Pool({connectionString:target,max:1});
    await admin.query(`CREATE SCHEMA "${schema}"`);
    parsed.searchParams.set('options',`-c search_path=${schema}`);url=parsed.toString();
    a=openPostgres(url);b=openPostgres(url);
    await Promise.all([migrateDatabase(a.db),migrateDatabase(b.db)]);
    await Promise.all([bindDataMode(a,'offline'),bindDataMode(b,'offline')]);
    process.env.DATABASE_URL=url;process.env.FORKTRADE_MODE='offline';process.env.FORKTRADE_ORIGIN='https://forktrade.example';
  });
  afterAll(async()=>{
    if(a)await a.close();if(b)await b.close();
    if(url)await (await database()).close();
    if(admin){await admin.query(`DROP SCHEMA "${schema}" CASCADE`);await admin.end();}
    for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;
  });

  it('commits one signer claim across independent pools and returns the same identity after reconnect',async()=>{
    const first=new Repository(a),second=new Repository(b),owner='offline:pg-claim';
    const plan=await first.create(owner,input),version=plan.versions[0].id;
    const p=await first.preview(owner,plan.id,version),q=await second.preview(owner,plan.id,version);
    const claims=await Promise.all(Array.from({length:8},(_,i)=>(i%2?first:second).claim(owner,plan.id,i%2?p.id:q.id,i%2?p.payloadHash:q.payloadHash)));
    expect(claims.filter(c=>c.claimed)).toHaveLength(1);
    expect(new Set(claims.map(c=>c.attempt.id)).size).toBe(1);
    const [requests]=await a.db.select({n:count()}).from(attempts).where(eq(attempts.planId,plan.id));
    const [history]=await a.db.select({n:count()}).from(observations).where(eq(observations.attemptId,claims[0].attempt.id));
    expect(requests.n).toBe(1);expect(history.n).toBe(1);
    const restarted=openPostgres(url);
    try{
      const repo=new Repository(restarted),recovered=await repo.getAttempt(owner,claims[0].attempt.id);
      expect(recovered.attempt.execution.tx).toBe('submitting');
      expect((await repo.refresh(owner,recovered.attempt.id)).execution.tx).toBe('unknown');
      await repo.save(owner,plan.id,1,{...input,title:'SYNTHETIC changed version'});
      await expect(repo.preview(owner,plan.id,(await repo.get(owner,plan.id)).versions[0].id)).rejects.toThrow(/unresolved/);
    }finally{await restarted.close();}
    const [record]=await a.db.select().from(attempts).where(eq(attempts.planId,plan.id));
    await expect(b.db.insert(attempts).values({...record,id:randomUUID()})).rejects.toMatchObject({cause:{code:'23505'}});
  });

  it('serializes optimistic saves and rolls back losing writes without appending a spare version',async()=>{
    const owner='offline:pg-save',first=new Repository(a),second=new Repository(b),plan=await first.create(owner,input);
    const results=await Promise.allSettled([first.save(owner,plan.id,1,{...input,title:'SYNTHETIC first'}),second.save(owner,plan.id,1,{...input,title:'SYNTHETIC second'})]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{status:409}});
    const current=await first.get(owner,plan.id);expect(current.currentVersion).toBe(2);expect(current.versions).toHaveLength(2);
    await expect(b.db.update(versions).set({hash:'tampered'}).where(eq(versions.id,plan.versions[0].id))).rejects.toMatchObject({cause:{code:'P0001'}});
  });

  it('serializes publication revisions and makes withdrawn sources unavailable without leaking private notes',async()=>{
    const owner='offline:pg-publication',first=new Repository(a),second=new Repository(b),plan=await first.create(owner,input),version=plan.versions[0].id;
    const cards=await Promise.all(Array.from({length:4},(_,i)=>(i%2?first:second).publish(owner,plan.id,version,['title','parameters','lineage'])));
    expect(new Set(cards.map(c=>c.id)).size).toBe(1);expect(cards.map(c=>c.revision).sort()).toEqual([1,2,3,4]);
    const card=await first.publicCard(cards[0].id);
    const child=await second.create('offline:pg-child',input,{publicationId:card.id,revision:card.revision});
    const childCard=await second.publish('offline:pg-child',child.id,child.versions[0].id,['title','parameters','lineage']);
    expect(childCard.comparison?.sourceVersion).toBe(1);
    await first.unpublish(owner,card.id);
    await expect(second.publicCard(card.id)).rejects.toThrow(/withdrawn/);
    expect((await second.publicCard(childCard.id)).comparison).toBeNull();
    expect(JSON.stringify(await second.publicCard(childCard.id))).not.toContain('PRIVATE_PG_CANARY');
    const [row]=await b.db.select().from(publications).where(eq(publications.id,card.id));expect(row.revision).toBe(5);
    await expect(second.create('offline:pg-late',input,{publicationId:card.id,revision:card.revision})).rejects.toThrow(/unavailable/);
  });

  it('keeps sessions and rate limits in PostgreSQL instead of instance memory',async()=>{
    const owner='offline:pg-session',session=await auth.createSession(owner,'offline',a.db);
    const request=new Request('https://forktrade.example/api/plans',{headers:{cookie:`${auth.COOKIE}=${session.raw}`}});
    expect((await auth.session(request)).owner).toBe(owner);
    const key=`SYNTHETIC shared limit ${randomUUID()}`;
    const limits=await Promise.allSettled(Array.from({length:4},()=>auth.rateLimit(key,3)));
    expect(limits.filter(r=>r.status==='fulfilled')).toHaveLength(3);
    expect(limits.find(r=>r.status==='rejected')).toMatchObject({reason:{status:429}});
    const [row]=await b.db.select().from(rateLimits).where(eq(rateLimits.key,hash(key)));expect(row.count).toBe(4);
    await b.db.delete(sessions).where(eq(sessions.owner,owner));
    await expect(auth.session(request)).rejects.toThrow(/expired/);
    expect(auth.cookie('synthetic')).toContain('Secure');
  });

  it('atomically consumes a challenge with its session even when verification races',async()=>{
    const address='0x0000000000000000000000000000000000000001',signature=`0x${'ab'.repeat(65)}` as const;
    const challenge=await auth.issueChallenge(address);
    const results=await Promise.allSettled([auth.verifyChallenge(challenge.nonce,address,signature,async()=>true),auth.verifyChallenge(challenge.nonce,address,signature,async()=>true)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const [row]=await b.db.select({n:count()}).from(sessions).where(and(eq(sessions.owner,address),eq(sessions.mode,'testnet')));expect(row.n).toBe(1);
    const [consumed]=await b.db.select().from(challenges).where(eq(challenges.nonce,challenge.nonce));expect(consumed.used).toBe(true);
    await expect(auth.verifyChallenge(challenge.nonce,address,signature,async()=>true)).rejects.toThrow(/used/);
  });

  it('makes data-mode binding immutable and retains rows across independent instances',async()=>{
    await expect(bindDataMode(b,'testnet')).rejects.toThrow(/different data mode/);
    await expect(a.db.execute(sql`UPDATE app_data_mode SET mode='testnet'`)).rejects.toMatchObject({cause:{code:'P0001'}});
    const plans=await new Repository(b).list('offline:pg-claim');expect(plans).toHaveLength(1);
  });

  it('serves hosted storage/session APIs without a local database or a signer',async()=>{
    const savedVercel=process.env.VERCEL;process.env.VERCEL='1';
    try{
      const response=await handle(new Request('https://forktrade.example/api/health'));
      expect(response.status).toBe(200);expect(await response.json()).toEqual({status:'ok',mode:'offline',storage:'postgresql',hosted:true});
      const session=await handle(new Request('https://forktrade.example/api/session/offline',{method:'POST',headers:{origin:'https://forktrade.example'},body:'{}'}));
      expect(session.status).toBe(200);expect(session.headers.get('set-cookie')).toContain('; Secure');
      const flags=await (await handle(new Request('https://forktrade.example/api/session'))).json();
      expect(flags).toMatchObject({hosted:true,authEnabled:false,executionEnabled:false});
    }finally{if(savedVercel===undefined)delete process.env.VERCEL;else process.env.VERCEL=savedVercel;}
  });
});
