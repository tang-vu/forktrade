import {openDatabase,openPostgres,bindDataMode,mode} from '../src/server/database';
import {migrateDatabase} from '../db/migrate';

// Explicit deployment/setup command; application requests and builds never migrate Neon.
const url=process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL||process.env.POSTGRES_URL;
if(!url&&(process.env.VERCEL||mode()!=='offline'))throw new Error('Configure the target Neon database before migration');
const connection=url?openPostgres(url):await openDatabase(process.env.FORKTRADE_LOCAL_DB||'.local/offline-pg');
try {
  await migrateDatabase(connection.db);
  await bindDataMode(connection,mode()==='offline'?'offline':'testnet');
  console.log(`PostgreSQL migrations verified (${mode()} mode). No fixtures seeded or existing records deleted.`);
} catch {
  console.error('Database migration failed. Connection details were withheld; check the selected target and migration checksums.');
  process.exitCode=1;
} finally{await connection.close();}
