import {Pool} from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {eq,ne} from 'drizzle-orm';
import type {PgAsyncDatabase,PgQueryResultHKT} from 'drizzle-orm/pg-core';
import {attachDatabasePool} from '@vercel/functions';
import {dataModes,plans} from '../../db/schema';
import {invariant} from '../domain/errors';

export type Db=PgAsyncDatabase<PgQueryResultHKT>;
export type DatabaseConnection={db:Db;close:()=>Promise<void>};

export function postgresUrl(value=process.env.DATABASE_URL||process.env.POSTGRES_URL) {
  invariant(value,'Configure the Neon DATABASE_URL before using the hosted workspace',503);
  let parsed:URL;try{parsed=new URL(value);}catch{throw new Error('Invalid database configuration');}
  invariant(['postgres:','postgresql:'].includes(parsed.protocol),'PostgreSQL connection URL required',503);
  invariant(parsed.hostname && parsed.pathname.length>1,'Incomplete database configuration',503);
  return value;
}

export function openPostgres(url:string):DatabaseConnection {
  // Each instance owns a small pool; Neon multiplexes through its pooled URL.
  // Never close a pool per request or retain a checked-out client.
  const pool=new Pool({connectionString:postgresUrl(url),max:3,idleTimeoutMillis:5000,connectionTimeoutMillis:10000});
  pool.on('error',()=>{/* Idle disconnects are discarded; request errors stay redacted. */});
  if(process.env.VERCEL)attachDatabasePool(pool);
  return {db:drizzle({client:pool}),close:()=>pool.end()};
}

/** Embedded PostgreSQL is exclusively for local synthetic development/tests. */
export async function openDatabase(path=':memory:'):Promise<DatabaseConnection> {
  invariant(!process.env.VERCEL,'Hosted instances require Neon; local database fallback is disabled',503);
  const {openLocalDatabase}=await import('./database-local');
  return openLocalDatabase(path);
}
export function mode() {
  const value=process.env.FORKTRADE_MODE || 'offline';
  invariant(['offline','readonly','testnet'].includes(value),'Unsupported application mode');
  return value as 'offline'|'readonly'|'testnet';
}
export async function bindDataMode(opened:DatabaseConnection,desired:'offline'|'testnet') {
  await opened.db.transaction(async tx=>{
    await tx.insert(dataModes).values({singleton:1,mode:desired}).onConflictDoNothing();
    const [stored]=await tx.select().from(dataModes).where(eq(dataModes.singleton,1));
    const [conflicting]=await tx.select({id:plans.id}).from(plans).where(ne(plans.mode,desired)).limit(1);
    invariant(stored?.mode===desired&&!conflicting,'Database contains a different data mode; fixtures cannot cross into live evidence');
  });
}

let connection:Promise<DatabaseConnection>|undefined;
export function database():Promise<DatabaseConnection> {
  if(!connection)connection=(async()=>{
    const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;
    invariant(url || !process.env.VERCEL && mode()==='offline','Configure Neon DATABASE_URL; local fallback is only available for offline development',503);
    const opened=url?openPostgres(url):await openDatabase(process.env.FORKTRADE_LOCAL_DB||'.local/offline-pg');
    try{await bindDataMode(opened,mode()==='offline'?'offline':'testnet');return opened;}
    catch(error){await opened.close();throw error;}
  })().catch(error=>{connection=undefined;throw error;});
  return connection;
}
