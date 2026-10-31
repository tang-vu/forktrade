import {existsSync,readFileSync,writeFileSync,mkdirSync,realpathSync,renameSync,unlinkSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {keccak256,toHex} from 'viem';
import {z} from 'zod';
import {database as appDatabase,mode} from '../../src/server/database';
import {Repository} from '../../src/server/repository';
import {invariant} from '../../src/domain/errors';
import {verifyPreview} from '../../src/domain/plan';
import {prepareLiveContext} from '../../src/integrations/prepare-order';
import {readPublicMarket} from '../../src/integrations/read-context';
import {connectReadOnly} from '../../src/integrations/read-connection';
import {walletLocation,unlockLocalWallet} from './keystore';
import {WalletJournal} from './journal';
import {ownershipMessage,requestFingerprint,transactionTag,walletOrder} from './policy';
import {edgeScopeSchema,edgeRequestSchema,verifyEdgeScope,verifyEdgeOrder} from './edge-policy';
import {edgeProviderScript} from './edge-provider';

const args=process.argv.slice(2),option=(key:string)=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
let stopRequested=false,stage='configuration';
const stop=()=>{stopRequested=true;};process.on('SIGINT',stop);process.on('SIGTERM',stop);
async function main(){
  invariant(args.includes('--authorized-one-order'),'This temporary transport requires an explicitly authorized one-order session');
  const location=walletLocation(option('--wallet-dir')||''),scopeFile=realpathSync(resolve(option('--scope')||'')),offset=relative(location.directory,scopeFile);
  invariant(offset&&!offset.startsWith('..')&&!isAbsolute(offset)&&statSync(scopeFile).size<=8192,'Scope file must be inside the protected wallet directory');
  const scope=edgeScopeSchema.parse(JSON.parse(readFileSync(scopeFile,'utf8')));verifyEdgeScope(scope,location.owner);
  const directory=resolve(location.directory,'edge-bridge');mkdirSync(directory,{recursive:true});
  invariant(relative(location.directory,realpathSync(directory))==='edge-bridge','Edge inbox must stay inside the protected wallet directory');
  const lock=resolve(location.directory,'interactive-wallet.lock'),requestFile=resolve(directory,'request.json'),responseFile=resolve(directory,'response.json'),stopFile=resolve(directory,'stop.json');
  invariant(!existsSync(lock)&&!existsSync(requestFile)&&!existsSync(responseFile)&&!existsSync(stopFile),'Inspect existing wallet process/inbox before starting');
  writeFileSync(lock,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString(),purpose:'temporary-one-order-edge-transport'})+'\n',{flag:'wx',mode:0o600});
  invariant(mode()!=='offline','The scoped local acceptance companion requires the same configured testnet PostgreSQL database as the app');
  const connection=connectReadOnly(),database=await appDatabase();
  const repo=new Repository(database,'testnet'),journal=new WalletJournal(location.directory),cache=new Map<string,{fingerprint:string;reply:unknown}>();
  const stateFile=resolve(directory,`state-${scope.id}.json`);
  const state=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')) as {authSigned:boolean}:{authSigned:false};
  const saveState=()=>{writeFileSync(stateFile+'.tmp',JSON.stringify(state)+'\n',{mode:0o600});renameSync(stateFile+'.tmp',stateFile);};
  try{
    stage='public-verification';const market=await readPublicMarket();
    invariant(await connection.rpc.getChainId()===50383,'Wallet RPC network differs');
    const plan=await repo.get(location.owner.toLowerCase(),scope.planId);
    invariant(plan.currentVersion===scope.version&&plan.versions[0].id===scope.versionId&&plan.depth===1,'Authorized child version differs');
    writeFileSync(resolve(directory,'provider.js'),edgeProviderScript(location.owner,scope.origin,scope.id,scope.expiresAt),{mode:0o600});
    console.log('Temporary Edge wallet transport ready for the exact scoped child order. No HTTP listener, key export or signature yet.');
    async function handle(value:unknown){
      const request=edgeRequestSchema.parse(value);invariant(request.scopeId===scope.id,'Different Edge wallet scope');verifyEdgeScope(scope,location.owner);
      const fingerprint=keccak256(toHex(JSON.stringify(request))),known=cache.get(request.id);
      if(known){invariant(known.fingerprint===fingerprint,'Used Edge request cannot change');return known.reply;}
      const reply={id:request.id,scopeId:scope.id,ok:false,value:undefined as unknown,code:4001};
      try{
        invariant(await connection.rpc.getChainId()===50383,'Wallet network changed');
        if(request.method==='eth_getBlockByNumber'){
          z.tuple([z.literal('0x0'),z.literal(false)]).parse(request.params);reply.value=await connection.rpc.request({method:'eth_getBlockByNumber',params:['0x0',false]});reply.ok=true;
        }else if(request.method==='personal_sign'){
          invariant(!state.authSigned,'Ownership signature already used for this scoped transport');
          const ownership=ownershipMessage(request.params,location.owner,scope.origin);state.authSigned=true;saveState();
          verifyEdgeScope(scope,location.owner);reply.value=await unlockLocalWallet(location).signMessage({message:ownership.message});reply.ok=true;
        }else{
          const raw=Array.isArray(request.params)&&request.params.length===1?request.params[0]:undefined;
          const tag=transactionTag(raw),requestHash=requestFingerprint(raw),requestKey=keccak256(toHex(`${location.owner.toLowerCase()}:50383:${market.market.poolAddress.toLowerCase()}:${tag}`));
          const prior=journal.get(requestKey);
          if(prior){invariant(prior.requestHash===requestHash&&prior.hash,'Existing signed request needs reconciliation');reply.value=prior.hash;reply.ok=true;}
          else{
            const current=await repo.walletRequest(location.owner.toLowerCase(),tag),planNow=await repo.get(location.owner.toLowerCase(),scope.planId);
            invariant(planNow.currentVersion===scope.version,'Authorized child version changed');
            verifyEdgeOrder(scope,current.preview,planNow.id,market);
            const reviewed=walletOrder(raw,current.preview,market,location.owner);
            const fresh=await prepareLiveContext(location.owner.toLowerCase(),current.input,tag,current.preview.context.transaction);
            verifyPreview(current.preview,fresh);await repo.walletRequest(location.owner.toLowerCase(),tag);
            walletOrder(raw,current.preview,market,location.owner);
            const [nonce,pending,native]=await Promise.all([connection.rpc.getTransactionCount({address:location.owner,blockTag:'latest'}),connection.rpc.getTransactionCount({address:location.owner,blockTag:'pending'}),connection.rpc.getBalance({address:location.owner})]);
            invariant(nonce===pending&&native>=reviewed.call.gas*reviewed.call.maxFeePerGas,'Wallet nonce/native context changed');
            reply.value=await journal.broadcast(reviewed.requestKey,reviewed.requestHash,nonce,async()=>{
              verifyEdgeScope(scope,location.owner);const signer=unlockLocalWallet(location);verifyEdgeScope(scope,location.owner);walletOrder(raw,current.preview,market,location.owner);
              return signer.signTransaction({type:'eip1559',chainId:50383,to:reviewed.call.to,data:reviewed.call.data,value:0n,gas:reviewed.call.gas,nonce,maxFeePerGas:reviewed.call.maxFeePerGas,maxPriorityFeePerGas:reviewed.call.maxPriorityFeePerGas});
            },serializedTransaction=>connection.rpc.sendRawTransaction({serializedTransaction}),{attemptId:current.attempt.id,tag});
            reply.ok=true;
          }
        }
      }catch{
        // A pre-sign validation decline is distinct from any claimed/signed/
        // possibly broadcast result. Never turn the latter into a retry.
        if(journal.list().some(r=>['claimed','signed','broadcasting','submitted','unknown'].includes(r.state))){reply.code=-32000;}
      }
      cache.set(request.id,{fingerprint,reply});return reply;
    }
    stage='request-loop';
    while(!stopRequested&&Date.now()<scope.expiresAt&&!existsSync(stopFile)){
      if(existsSync(requestFile)&&!existsSync(responseFile)){
        try{
          invariant(statSync(requestFile).size<=16000,'Wallet request too large');
          const result=await handle(JSON.parse(readFileSync(requestFile,'utf8')));
          writeFileSync(responseFile+'.tmp',JSON.stringify(result)+'\n',{mode:0o600});renameSync(responseFile+'.tmp',responseFile);
        }catch{console.error('Edge request rejected before parsing; inbox preserved for inspection.');stopRequested=true;}
      }
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    console.log('Temporary Edge wallet transport stopped. Request identities/hashes remain preserved; no automatic resend.');
  }finally{
    await database.close();await connection.close();unlinkSync(lock);if(existsSync(stopFile))unlinkSync(stopFile);
  }
}
void main().catch(()=>{console.error(`Temporary Edge wallet stopped at ${stage}. No key, challenge, signature, cookie or raw payload logged. Inspect existing request state before any retry.`);process.exitCode=1;}).finally(()=>{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);});
