import {existsSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium,type Browser,type Page,type BrowserContext} from '@playwright/test';
import {getAddress} from 'viem';
import {z} from 'zod';
import {connectReadOnly} from '../../src/integrations/read-connection';
import {readPublicMarket} from '../../src/integrations/read-context';
import type {StoredPreview} from '../../src/server/repository';
import {formatAmount} from '../../src/domain/amounts';
import {invariant} from '../../src/domain/errors';
import {ApprovalWindow} from './approval';
import {installLocalWalletProvider} from './provider';
import {walletLocation,unlockLocalWallet} from './keystore';
import {WalletJournal} from './journal';
import {localOrigin,ownershipMessage,requestFingerprint,transactionTag,walletOrder} from './policy';
import {recoverDiagnosticRoot,type SavedPlan} from './resume';

const args=process.argv.slice(2),option=(name:string)=>{const index=args.indexOf(name);return index<0?undefined:args[index+1];};
const walletDirectory=option('--wallet-dir');
if(!walletDirectory){console.error('Usage: npm run wallet:testnet -- --wallet-dir .local/wallets/<wallet> [--origin http://127.0.0.1:3000] [--prepare-root | --remix <publication-UUID>]');process.exit(1);}
const prepareRoot=args.includes('--prepare-root');
const remixPublication=option('--remix');
if(args.includes('--remix')&&(!z.string().uuid().safeParse(remixPublication).success||prepareRoot)){
  console.error('Use --remix with one visible publication UUID, separately from --prepare-root.');process.exit(1);
}
let origin:string,location:ReturnType<typeof walletLocation>,journal:WalletJournal,lockFile:string|undefined;
let lockOwned=false,stopping=false,browser:Browser|undefined,connection:ReturnType<typeof connectReadOnly>|undefined,rpc:ReturnType<typeof connectReadOnly>['rpc'];
let stage='application-readiness';
const stop=()=>{stopping=true;void browser?.close();};process.on('SIGINT',stop);process.on('SIGTERM',stop);
async function main(){
  origin=localOrigin(option('--origin')||'http://127.0.0.1:3000');
  stage='wallet-configuration';invariant(process.platform==='win32','DPAPI companion requires the original Windows profile');location=walletLocation(walletDirectory!);journal=new WalletJournal(location.directory);lockFile=resolve(location.directory,'interactive-wallet.lock');
  connection=connectReadOnly();rpc=connection.rpc;stage='application-readiness';
  const response=await fetch(`${origin}/api/session`,{signal:AbortSignal.timeout(10000)});
  const settings=await response.json() as {mode:string;authEnabled:boolean;executionEnabled:boolean;environmentConfirmed:boolean};
  invariant(response.ok&&['readonly','testnet'].includes(settings.mode)&&settings.authEnabled,'Start the local app with a permitted nonoffline ownership session first');
  invariant(!existsSync(lockFile),'This wallet already has a companion lock; inspect the existing process and requests before retrying');
  writeFileSync(lockFile,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()})+'\n',{flag:'wx',mode:0o600});lockOwned=true;
  const market=await readPublicMarket();
  invariant(!stopping&&await rpc.getChainId()===50383,'Wrong wallet RPC network or stopped startup');
  stage='interactive-wallet';
  browser=await chromium.launch({headless:false});
  if(stopping){await browser.close();return;}
  const appContext=await browser.newContext({viewport:{width:1280,height:900}}),walletContext=await browser.newContext({viewport:{width:740,height:850}});
  const walletPage=await walletContext.newPage(),approval=new ApprovalWindow(walletPage,false,remixPublication?'remix':'original');
  await approval.initialize();
  const appPage=await appContext.newPage();
  let connected=false,preparing=false;
  const flights=new Map<string,{fingerprint:string;work:Promise<unknown>}>();
  async function appJson(path:string,body?:unknown){
    const sessionResponse=await appContext.request.get(`${origin}/api/session`);
    const session=await sessionResponse.json() as {session:{owner:string;csrf:string}|null};
    invariant(session.session&&getAddress(session.session.owner)===location.owner,'Authenticate the selected wallet in the app');
    const result=body===undefined?await appContext.request.get(`${origin}/api/${path}`):await appContext.request.post(`${origin}/api/${path}`,{headers:{origin,'x-csrf-token':session.session.csrf},data:body});
    invariant(result.ok(),'App review expired, changed or unavailable; create a fresh review');
    return result.json();
  }
  async function reconcileWallet(){
    for(const [key,record] of Object.entries(journal.entries()))if(record.hash&&['signed','broadcasting','submitted','unknown'].includes(record.state)){
      try{
        const receipt=await rpc.getTransactionReceipt({hash:record.hash});
        const [tx,block]=await Promise.all([rpc.getTransaction({hash:record.hash}),rpc.getBlock({blockNumber:receipt.blockNumber})]);
        invariant(receipt.transactionHash===record.hash&&block.hash===receipt.blockHash&&getAddress(tx.from)===location.owner&&tx.nonce===record.nonce,'Wallet receipt identity conflict');
        journal.update(key,{...record,state:receipt.status==='success'?'confirmed':'reverted'});
      }catch{/* Unknown original requests remain blocked for any new send. */}
    }
  }
  async function request(method:string,params:unknown):Promise<unknown>{
    invariant(await rpc.getChainId()===50383,'Wallet RPC network changed');
    if(method==='eth_chainId')return '0xc4cf';
    if(method==='eth_accounts')return connected?[location.owner]:[];
    if(method==='eth_requestAccounts'){
      const allowed=await approval.request({title:'Connect this testnet wallet?',rows:[['App origin',origin],['Owner',location.owner],['Network','Hideki / 50383']],expiresAt:Date.now()+300000,note:'Connection reveals this address to the local app. It signs no message or transaction.'});
      invariant(allowed,'Wallet declined');connected=true;await approval.idle('Connected to the local app. Return there to review the ownership challenge.');await appPage.bringToFront();return [location.owner];
    }
    invariant(connected,'Connect the wallet before requesting a signature');
    if(method==='personal_sign'){
      const ownership=ownershipMessage(params,location.owner,origin);
      const allowed=await approval.request({title:'Authenticate wallet ownership',rows:[['App origin',origin],['Owner',location.owner],['Exact message',ownership.message]],expiresAt:ownership.expiresAt,note:'This signature authenticates private plans only. It grants no order, allowance, funding or delegation authority.'});
      invariant(allowed,'Wallet declined');ownershipMessage(params,location.owner,origin);
      invariant(await rpc.getChainId()===50383,'Wallet network changed');
      const signer=unlockLocalWallet(location);
      const signature=await signer.signMessage({message:ownership.message});await approval.idle('Ownership signature returned only to the local app. No transaction authority was granted.');await appPage.bringToFront();return signature;
    }
    invariant(method==='eth_sendTransaction'&&settings.mode==='testnet'&&settings.executionEnabled&&settings.environmentConfirmed,'Unsupported or disabled wallet method');
    const raw=z.tuple([z.unknown()]).parse(params)[0],tag=transactionTag(raw),fingerprint=requestFingerprint(raw);
    const existing=flights.get(tag);if(existing){invariant(existing.fingerprint===fingerprint,'Used wallet request cannot change its payload');return existing.work;}
    const work=(async()=>{
      const {preview,attemptId}=await appJson(`wallet-requests/${tag}`) as {preview:StoredPreview;attemptId:string};
      const reviewed=walletOrder(raw,preview,market,location.owner),p=preview.payload,c=preview.context;
      await reconcileWallet();
      const previous=journal.get(reviewed.requestKey);
      if(previous){invariant(previous.requestHash===reviewed.requestHash&&previous.hash,'Existing wallet request requires reconciliation');return previous.hash;}
      invariant(!journal.list().some(value=>['claimed','signed','broadcasting','submitted','unknown'].includes(value.state)),'Earlier wallet request unresolved');
      const allowed=await approval.request({title:'Sign this exact BTC testnet order?',rows:[['Owner / signer',location.owner],['Network / chain','Hideki / 50383'],['Market / pool',`${c.symbol}\n${p.pool}`],['Side / price / quantity',`${p.side.toUpperCase()} / ${formatAmount(p.price,c.quoteDecimals)} USDso / ${formatAmount(p.quantity,c.baseDecimals)} BTC`],['Order flags','Limit / GTC / reduce-only off / cancel taker'],['Builder / fee / value','None / 0 / 0'],['Margin / fee reserve',`${formatAmount(preview.estimatedMargin,c.quoteDecimals)} / ${formatAmount(preview.estimatedFee,c.quoteDecimals)} USDso`],['Gas / max fee / priority',`${p.gas} / ${p.maxFeePerGas} / ${p.maxPriorityFeePerGas} wei per gas`],['Maximum native cost',`${formatAmount(BigInt(p.gas)*BigInt(p.maxFeePerGas),18)} STT`],['Expiry nanoseconds / request tag',`${p.expireTimestampNs} / ${p.userData}`]],expiresAt:preview.expiresAt,note:'Real testnet transaction. A resting GTC order remains exposed. This approves only the displayed order; the app rechecks fresh context before signing.'});
      invariant(allowed,'Wallet declined or review expired');
      await appJson(`wallet-requests/${tag}/validate`,{payloadHash:preview.payloadHash});
      walletOrder(raw,preview,market,location.owner);
      const [nonce,pending,native]=await Promise.all([rpc.getTransactionCount({address:location.owner,blockTag:'latest'}),rpc.getTransactionCount({address:location.owner,blockTag:'pending'}),rpc.getBalance({address:location.owner})]);
      invariant(nonce===pending&&native>=reviewed.call.gas*reviewed.call.maxFeePerGas,'Wallet nonce/native context changed');
      let hash:string;
      try{hash=await journal.broadcast(reviewed.requestKey,reviewed.requestHash,nonce,async()=>{
        const signer=unlockLocalWallet(location);
        walletOrder(raw,preview,market,location.owner);
        return signer.signTransaction({type:'eip1559',chainId:50383,to:reviewed.call.to,data:reviewed.call.data,value:0n,gas:reviewed.call.gas,nonce,maxFeePerGas:reviewed.call.maxFeePerGas,maxPriorityFeePerGas:reviewed.call.maxPriorityFeePerGas});
      },serializedTransaction=>rpc.sendRawTransaction({serializedTransaction}),{attemptId,tag});}
      catch{
        const known=journal.get(reviewed.requestKey);
        if(known?.hash)hash=known.hash;
        else if(known?.state==='claimed')throw Object.assign(new Error('Wallet result uncertain'),{walletCode:-32000});
        else throw new Error('Wallet declined before broadcast');
      }
      try{await approval.idle(`Known transaction hash: ${hash}. The app independently reconciles transaction and order state. A hash is not a fill. No automatic resend.`);await appPage.bringToFront();}catch{/* A closed UI must not erase a known signed hash or label it rejected. */}
      return hash;
    })();flights.set(tag,{fingerprint,work});return work;
  }
  await installLocalWalletProvider(appPage,origin,request);
  appPage.on('response',response=>{
    if(!preparing&&response.url()===`${origin}/api/auth/verify`&&response.status()===200){preparing=true;void (async()=>{
      await appPage.getByRole('heading',{name:'Authenticated owner'}).waitFor({timeout:15000});
      for(const known of journal.list())if(known.hash&&known.attemptId){try{await appJson(`attempts/${known.attemptId}/report`,{kind:'hash',hash:known.hash});}catch{/* Preserve local known hashes and server unknown states when observation is unavailable. */}}
      await reconcileWallet();
      if(prepareRoot)await preparePrivateRoot(appPage,appContext,origin,location.owner);
      console.log('Ownership session authenticated. Known requests reconciled; the app is ready for user review. No order was automatically approved.');
    })().catch(()=>console.error('Session recovery/private draft preparation unavailable; existing identities and drafts were preserved.'));}
  });
  await appPage.goto(remixPublication?`${origin}/?remix=${encodeURIComponent(remixPublication)}`:origin);
  stage='provider-readiness';
  const providerReady=await appPage.evaluate("(async()=>typeof window.ethereum==='object'&&window.ethereum.isForkTradeLocalTestWallet===true&&await window.ethereum.request({method:'eth_chainId'})==='0xc4cf')()");
  invariant(providerReady===true,'Wallet provider/bridge failed to initialize');
  await appPage.bringToFront();
  console.log('Local testnet wallet provider and bridge verified. Connect/sign in the app, then review each exact request in the separate wallet window. No key is exposed to the app/server.');
  await new Promise<void>(resolve=>{browser!.once('disconnected',()=>resolve());walletPage.once('close',()=>{approval.cancel();void browser!.close();});});
}
async function preparePrivateRoot(page:Page,context:BrowserContext,origin:string,owner:string){
  await page.getByRole('heading',{name:'Authenticated owner'}).waitFor({timeout:15000});
  if(await page.getByLabel('Thesis title').inputValue())return;
  const session=await (await context.request.get(`${origin}/api/session`)).json() as {session:{owner:string;csrf:string}|null};
  invariant(session.session&&getAddress(session.session.owner)===owner,'Owner session unavailable');
  const plans=await (await context.request.get(`${origin}/api/plans`)).json() as SavedPlan[];
  if(plans.length){
    // Reopening the companion must not leave a returning owner on a blank draft.
    // Recover only the unambiguous diagnostic root; never create another plan,
    // replace entered text or choose among the owner's unrelated plans.
    await recoverDiagnosticRoot(page,plans);
    return;
  }
  const snapshot=await readPublicMarket(),m=snapshot.market,bid=snapshot.book.tops[m.id]?.bestBid;
  invariant(bid,'Current BTC book unavailable');
  const quantity=formatAmount(m.minQuantity,m.baseDecimals),price=formatAmount(BigInt(bid)-100n*BigInt(m.tickSize),m.quoteDecimals);
  const input={title:'BTC testnet integration check',rationale:'Agent-prepared testnet intent: verify the thesis, review, separately approved order and truthful receipt workflow. This is not a market recommendation or performance claim.',invalidation:'Stop if account/network/market context changes, risk data becomes unavailable or the preview expires.',riskNotes:'Prepared for user review only; no order, publication or cleanup is authorized by saving.',side:'buy',price,quantity,quantityCap:quantity,notionalCap:'20'};
  const saved=await context.request.post(`${origin}/api/plans`,{headers:{origin,'x-csrf-token':session.session.csrf},data:{input}});invariant(saved.ok(),'Private draft save unavailable');
  await page.reload();await page.getByRole('button',{name:input.title,exact:false}).click();await page.bringToFront();
}
void main().catch(()=>{console.error(`Local wallet stopped at ${stage}. No key, message, signature, cookie or raw transaction was logged. Inspect existing requests before retrying.`);process.exitCode=1;}).finally(async()=>{
  await browser?.close();await connection?.close();if(lockOwned&&lockFile)unlinkSync(lockFile);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
});
