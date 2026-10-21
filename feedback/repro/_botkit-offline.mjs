// Test infrastructure only. No wallet/RPC/key access. Source GETs are separate
// from offline execution, which receives only explicitly supplied test doubles.
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
export const revision='25798660bbe4674a6f83a960b202852896e2fed4';
export function outputPath(){
  if(!vm.SourceTextModule)throw new Error('Use Node 24 with --experimental-vm-modules');
  if(process.argv.length===2)return undefined;
  if(process.argv.length!==4||process.argv[2]!=='--out')throw new Error('Optional usage: --out feedback/evidence/<new-file>.json');
  const root=resolve('feedback/evidence'),target=resolve(process.argv[3]),offset=relative(root,target);
  if(!offset||offset.startsWith('..')||isAbsolute(offset)||!target.endsWith('.json'))throw new Error('Evidence output must be a JSON file inside feedback/evidence');
  return target;
}
export async function loadSources(files){
  const sources={};
  for(const f of files){
    const response=await fetch(`https://raw.githubusercontent.com/somnia-chain/dreamdex-bot-kit/${revision}/${f.path}`,{redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Public pinned source HTTP ${response.status}`);
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length>512000||createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw new Error('Pinned source hash/size mismatch; stopped');
    sources[f.path]=stripTypeScriptTypes(new TextDecoder().decode(bytes),{mode:'strip'});
  }
  return sources;
}
class ExitSignal extends Error{constructor(code){super('Virtualized process.exit');this.code=code;}}
export async function runStrategy({sources,entry,env={},buildCore}){
  const logs=[],boundaries=[];
  const context=vm.createContext({console:{log:(...args)=>logs.push(args.join(' ')),error:(...args)=>logs.push(args.join(' '))},
    process:{env:{...env,DRY_RUN:'true'},exit:code=>{throw new ExitSignal(code);}}});
  const reject=()=>{throw new Error('OFFLINE TEST: unexpected signing/write/control path');};
  function bindings(values){const names=Object.keys(values);return new vm.SyntheticModule(names,function(){for(const name of names)this.setExport(name,values[name]);},{context});}
  async function helper(path,imports={}){
    if(!(path in sources))throw new Error('Unpinned helper');
    const mod=new vm.SourceTextModule(sources[path],{context,identifier:path});
    await mod.link(name=>{if(!(name in imports))throw new Error(`Unexpected helper import: ${name}`);return bindings(imports[name]);});
    await mod.evaluate({timeout:1000});return mod.namespace;
  }
  const core=await buildCore({helper,reject,boundaries,logs});
  const code=sources[entry],footer=code.lastIndexOf('\nmain().then(');
  if(footer<0)throw new Error('Expected auto-start footer missing');
  // Only the auto-start/exit footer is replaced. All strategy/helper bodies and
  // conditions are unchanged; virtual process.exit aborts main immediately.
  const mod=new vm.SourceTextModule(code.slice(0,footer)+'\nexport {main as offlineMain};\n',{context,identifier:entry});
  await mod.link(name=>{if(name!=='@dreamdex-bot-kit/perp-core')throw new Error(`Unexpected strategy import: ${name}`);return bindings(core);});
  await mod.evaluate({timeout:1000});let timer;
  try{
    await Promise.race([mod.namespace.offlineMain(),new Promise((_,rejectTimeout)=>{timer=setTimeout(()=>rejectTimeout(new Error('Offline fixture timed out')),3000);})]);
    return {termination:'returned',exitCode:0,logs,boundaries};
  }catch(e){if(e instanceof ExitSignal)return {termination:'process.exit',exitCode:e.code,logs,boundaries};throw e;}
  finally{clearTimeout(timer);}
}
export async function finish(target,record){
  const output=JSON.stringify({kind:'OFFLINE SYNTHETIC SOURCE TEST - NOT LIVE EVIDENCE',observedAt:new Date().toISOString(),upstreamRevision:revision,nodeVersion:process.version,
    execution:{mode:'offline-synthetic',network:false,signer:false,privateKey:false,transactions:false},
    sourceHandling:'Public GETs/hash checks before execution; TypeScript stripped and only auto-start footer replaced. Original function bodies unchanged.',...record},null,2)+'\n';
  if(target)await writeFile(target,output,{flag:'wx'});process.stdout.write(output);
}
export const fixtureAccount='0x0000000000000000000000000000000000000000';
export const fixtureMarket={symbol:'OFFLINE-BTC-PERP',display:'OFFLINE TEST BTC',info:{baseSymbol:'OFFLINE-BTC',baseDecimals:8,quoteDecimals:18,
  tickSize:'100000000000000000',lotSize:'1000',minQuantity:'1000',markPrice:'100000000000000000000',marginBank:fixtureAccount}};
