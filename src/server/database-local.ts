import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import {resolve,relative,isAbsolute} from 'node:path';
import {existsSync,statSync,mkdirSync} from 'node:fs';
import {invariant} from '../domain/errors';
import {migrateDatabase} from '../../db/migrate';
import type {DatabaseConnection} from './database';

export async function openLocalDatabase(path:string):Promise<DatabaseConnection> {
  if(path!==':memory:') {
    const absolute=resolve(path),offset=relative(process.cwd(),absolute);
    invariant(offset&&!offset.startsWith('..')&&!isAbsolute(offset),'Local database must stay inside this project');
    invariant(!existsSync(absolute)||statSync(absolute).isDirectory(),'Existing SQLite files are preserved; select a new PostgreSQL directory');
    mkdirSync(absolute,{recursive:true});path=absolute;
  }
  const client=new PGlite(path===':memory:'?undefined:path);
  const connection={db:drizzle({client}),close:()=>client.close()};
  try{await client.waitReady;await migrateDatabase(connection.db);return connection;}
  catch(error){await client.close();throw error;}
}
