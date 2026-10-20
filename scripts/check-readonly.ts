import {mkdirSync,writeFileSync} from 'node:fs';
import {readPublicMarket,jsonSafe} from '../src/integrations/readonly';
try {
  const result=jsonSafe(await readPublicMarket());
  mkdirSync('evidence',{recursive:true});
  writeFileSync('evidence/read-only-2026-10-20.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} catch(error) {
  // Do not serialize RPC error causes or payloads.
  console.error('Read-only verification failed:', error instanceof Error ? error.name : 'UnknownError');
  process.exitCode=1;
}
