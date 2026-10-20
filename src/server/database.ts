import {DatabaseSync} from 'node:sqlite';
import {drizzle} from 'drizzle-orm/node-sqlite';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {invariant} from '../domain/errors';
class LocalDatabase extends DatabaseSync {
  transaction<T>(fn:()=>T) {
    const run=()=>{
      invariant(!this.isTransaction,'Nested write transaction is unsupported');
      this.exec('BEGIN IMMEDIATE');
      try {const result=fn();this.exec('COMMIT');return result;}
      catch(error){this.exec('ROLLBACK');throw error;}
    };
    return Object.assign(run,{immediate:run});
  }
}
export function openDatabase(path:string) {
  if(path !== ':memory:') {
    const absolute=resolve(path), offset=relative(process.cwd(),absolute);
    invariant(offset && !offset.startsWith('..') && !isAbsolute(offset), 'Database must stay inside this project');
    mkdirSync(dirname(absolute),{recursive:true});
  }
  const sqlite=new LocalDatabase(path);
  sqlite.exec('PRAGMA foreign_keys = ON'); sqlite.exec('PRAGMA journal_mode = WAL'); sqlite.exec('PRAGMA busy_timeout = 5000');
  sqlite.exec('CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
  sqlite.transaction(()=>{
    for(const name of readdirSync('db/migrations').filter(n=>n.endsWith('.sql')).sort()) {
      const sql=readFileSync(`db/migrations/${name}`,'utf8'); const checksum=createHash('sha256').update(sql).digest('hex');
      const applied=sqlite.prepare('SELECT checksum FROM migrations WHERE name=?').get(name) as {checksum:string}|undefined;
      if(applied) {invariant(applied.checksum===checksum,'Applied migration checksum changed');continue;}
      sqlite.exec(sql);sqlite.prepare('INSERT INTO migrations(name,checksum) VALUES (?,?)').run(name,checksum);
    }
  })();
  return {sqlite,db:drizzle({client:sqlite})};
}
export function mode() {
  const value=process.env.FORKTRADE_MODE || 'offline';
  invariant(['offline','readonly','testnet'].includes(value),'Unsupported application mode');
  return value as 'offline'|'readonly'|'testnet';
}
let connection:ReturnType<typeof openDatabase>|undefined;
export function database() {
  if(!connection) {
    const file=process.env.FORKTRADE_DB || (mode()==='offline'?'.local/offline.db':'.local/testnet.db');
    invariant(mode()==='offline' || !file.includes('offline'), 'Live mode cannot use an offline database');
    connection=openDatabase(file);
  }
  return connection;
}
