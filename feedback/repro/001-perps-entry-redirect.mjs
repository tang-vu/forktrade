import {writeFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';

// Public GETs only. No wallet, cookies, credentials, signing or trading calls.
// This captures the bounded server redirect chain. Actual rendered market UI
// is documented separately by Edge observations and screenshots.
const origin='https://app.testnet.dreamdex.io';
let url=new URL('/perps',origin);
const hops=[];
for(let hop=0;hop<3;hop++){
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  const location=response.headers.get('location');
  hops.push({observedAt:new Date().toISOString(),requested:url.href,status:response.status,location});
  await response.body?.cancel();
  if(response.status<300||response.status>=400||!location)break;
  const next=new URL(location,url);
  if(next.origin!==origin)throw new Error('Unexpected cross-origin redirect; stopped');
  url=next;
}
const record={kind:'actual-public-http-redirect',authenticated:false,method:'GET',hops,
  limitations:['HTTP-only capture; it does not execute client JavaScript or establish the final browser market','No account, signature, transaction or order involved']};
const output=JSON.stringify(record,null,2)+'\n';
if(process.argv.length>2){
  if(process.argv.length!==4||process.argv[2]!=='--out')throw new Error('Optional usage: --out feedback/evidence/<name>.json');
  const root=resolve('feedback/evidence'),target=resolve(process.argv[3]),offset=relative(root,target);
  if(!offset||offset.startsWith('..')||isAbsolute(offset)||!target.endsWith('.json'))throw new Error('Evidence output must be a JSON file in feedback/evidence');
  await writeFile(target,output,{flag:'wx'}); // preserve earlier observations
}
process.stdout.write(output);
