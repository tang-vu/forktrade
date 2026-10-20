import {mkdirSync,writeFileSync} from 'node:fs';
import {readPublicMarket,jsonSafe} from '../src/integrations/readonly';
try {
  const result=jsonSafe(await readPublicMarket());
  mkdirSync('evidence',{recursive:true});
  const output=process.argv[2] || 'evidence/read-only-latest.json';
  if(!/^evidence\/[a-z0-9-]+\.json$/.test(output))throw new Error('Invalid local evidence filename');
  writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} catch(error) {
  // Do not serialize RPC error causes or payloads.
  console.error('Read-only verification failed:', error instanceof Error ? error.name : 'UnknownError');
  process.exitCode=1;
}
