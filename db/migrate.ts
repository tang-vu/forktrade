import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {sql} from 'drizzle-orm';
import {pgTable,text} from 'drizzle-orm/pg-core';
import type {Db} from '../src/server/database';
import {invariant} from '../src/domain/errors';

const migrations=pgTable('forktrade_migrations',{name:text().primaryKey(),checksum:text().notNull()});
export async function migrateDatabase(db:Db) {
  await db.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(824102026)`);
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS forktrade_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL)`);
    const applied=await tx.select().from(migrations);
    for(const name of readdirSync('db/postgres').filter(n=>n.endsWith('.sql')).sort()) {
      // Git checkouts on Windows and Linux must bind the same SQL identity.
      const statement=readFileSync(`db/postgres/${name}`,'utf8').replace(/\r\n/g,'\n'),checksum=createHash('sha256').update(statement).digest('hex');
      const previous=applied.find(row=>row.name===name);
      if(previous){invariant(previous.checksum===checksum,'Applied migration checksum changed');continue;}
      for(const chunk of statement.split('--> statement-breakpoint').filter(part=>part.trim()))await tx.execute(sql.raw(chunk));
      await tx.insert(migrations).values({name,checksum});
    }
  });
}
