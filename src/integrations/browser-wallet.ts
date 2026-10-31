import {createWalletClient,custom,isAddress,numberToHex,type EIP1193Provider,type Hex} from 'viem';
import {hidekiTestnet} from '@somnia-chain/markets-sdk/chains';
import {parseSiweMessage} from 'viem/siwe';
import type {OrderPayload} from '../domain/plan';
import {invariant} from '../domain/errors';
import {EXPECTED_CHAIN,EXPECTED_GENESIS_HASH,RPC,EXPLORER} from './network';
import {orderCall} from './order-call';

export type WalletProvider=EIP1193Provider;
export type WalletReport={kind:'hash';hash:Hex}|{kind:'rejected'|'interrupted'|'context_changed'};
export async function walletContext(provider:WalletProvider,owner:string) {
  const [accounts,chain]=await Promise.all([provider.request({method:'eth_accounts'}),provider.request({method:'eth_chainId'})]);
  invariant(accounts.length>0 && isAddress(accounts[0]) && accounts[0].toLowerCase()===owner.toLowerCase(),'Wallet account changed or disconnected; fresh review required');
  invariant(BigInt(chain)===BigInt(EXPECTED_CHAIN),'Wallet network changed; switch manually and review again');
  const genesis=await provider.request({method:'eth_getBlockByNumber',params:['0x0',false]});
  invariant(genesis?.hash?.toLowerCase()===EXPECTED_GENESIS_HASH,'Wallet RPC does not match the verified Hideki testnet. Update its RPC to '+RPC+' and connect again');
  return {owner:accounts[0],chainId:EXPECTED_CHAIN};
}
/** Only called from the user's explicit network-setup button; never signs or sends. */
export async function prepareWalletNetwork(provider:WalletProvider|undefined,enabled:boolean) {
  invariant(enabled,'Wallet network setup is disabled');
  invariant(provider,'No supported injected wallet found');
  const chainId=numberToHex(EXPECTED_CHAIN);
  if(BigInt(await provider.request({method:'eth_chainId'}))===BigInt(EXPECTED_CHAIN))return;
  try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId}]});}
  catch(error){
    if(!walletErrorCode(error,4902))throw error;
    await provider.request({method:'wallet_addEthereumChain',params:[{chainId,chainName:hidekiTestnet.name,nativeCurrency:hidekiTestnet.nativeCurrency,rpcUrls:[RPC],blockExplorerUrls:[EXPLORER]}]});
    // Adding a chain need not select it. Re-read the wallet's authoritative context.
    if(BigInt(await provider.request({method:'eth_chainId'}))!==BigInt(EXPECTED_CHAIN))await provider.request({method:'wallet_switchEthereumChain',params:[{chainId}]});
  }
  invariant(BigInt(await provider.request({method:'eth_chainId'}))===BigInt(EXPECTED_CHAIN),'Wallet is still on another network; select Hideki testnet (50383) and connect again');
}
export async function connectWallet(provider:WalletProvider|undefined,enabled:boolean) {
  invariant(enabled,'Wallet connection/authentication is disabled until the session is authorized');
  invariant(provider,'No supported injected wallet found');
  const accounts=await provider.request({method:'eth_requestAccounts'});
  invariant(accounts.length>0 && isAddress(accounts[0]),'Wallet connection was not granted');
  return walletContext(provider,accounts[0]);
}
export async function signOwnership(provider:WalletProvider,owner:string,message:string,enabled:boolean,expectedOrigin:string) {
  invariant(enabled,'Ownership signing is disabled');await walletContext(provider,owner);
  const challenge=parseSiweMessage(message),url=new URL(expectedOrigin),now=Date.now();
  invariant(challenge.domain===url.host && challenge.uri===url.origin && challenge.chainId===EXPECTED_CHAIN && challenge.address?.toLowerCase()===owner.toLowerCase() && challenge.nonce && challenge.expirationTime && challenge.expirationTime.getTime()>now && challenge.issuedAt && challenge.issuedAt.getTime()<=now+5000,'Ownership challenge has wrong domain, account, network or expiry');
  const wallet=createWalletClient({chain:hidekiTestnet,transport:custom(provider,{retryCount:0})});
  return wallet.signMessage({account:owner as `0x${string}`,message});
}
export function watchWallet(provider:WalletProvider,onChange:()=>void) {
  provider.on('accountsChanged',onChange);provider.on('chainChanged',onChange);provider.on('disconnect',onChange);
  return ()=>{provider.removeListener('accountsChanged',onChange);provider.removeListener('chainChanged',onChange);provider.removeListener('disconnect',onChange);};
}
type Claim={claimed:boolean;attemptId:string;payload:OrderPayload};
type SendOptions={
  approvalId:string;owner:string;enabled:boolean;provider:WalletProvider|undefined;
  contextValid:()=>boolean;claim:()=>Promise<Claim>;report:(id:string,result:WalletReport)=>Promise<void>;
  rememberHash?:(id:string,hash:Hex)=>void;
};
export class BrowserOrderSender {
  private flights=new Map<string,Promise<{attemptId:string;outcome:string}>>();
  send(options:SendOptions) {
    const existing=this.flights.get(options.approvalId);if(existing)return existing;
    const pending=this.run(options);this.flights.set(options.approvalId,pending);return pending;
  }
  private async run(o:SendOptions) {
    invariant(o.enabled,'Live execution is disabled until separately authorized');
    invariant(o.provider,'No supported injected wallet found');
    invariant(o.contextValid(),'Context changed before approval');await walletContext(o.provider,o.owner);
    const claim=await o.claim(); // durable server claim completes BEFORE the signer can run
    if(!claim.claimed)return {attemptId:claim.attemptId,outcome:'existing_request'};
    let invoked=false;
    try {
      invariant(o.contextValid(),'Wallet/context changed during request claim');
      await walletContext(o.provider,o.owner);
      invariant(o.contextValid(),'Wallet/context changed before signing');
      const call=orderCall(claim.payload);
      invariant(call.account.toLowerCase()===o.owner.toLowerCase(),'Claim belongs to another owner');
      invoked=true;
      // One explicit provider request. Do not use an action that can fall back to
      // another send method after an RPC error; an uncertain call must reconcile.
      const hash=await o.provider.request({method:'eth_sendTransaction',params:[{from:call.account,to:call.to,data:call.data,value:'0x0',gas:numberToHex(call.gas),maxFeePerGas:numberToHex(call.maxFeePerGas),maxPriorityFeePerGas:numberToHex(call.maxPriorityFeePerGas),chainId:numberToHex(EXPECTED_CHAIN)}]});
      try{o.rememberHash?.(claim.attemptId,hash);}catch{/* Still persist the known hash at the server if local storage is unavailable. */}
      // Even after an account switch, report/reconcile under the original claim.
      // A report failure must not send again. The stable server request remains.
      await o.report(claim.attemptId,{kind:'hash',hash});
      return {attemptId:claim.attemptId,outcome:'hash_reported'};
    } catch(error) {
      const rejected=invoked && isUserRejection(error);
      try {await o.report(claim.attemptId,{kind:rejected?'rejected':invoked?'interrupted':'context_changed'});}catch{/* The durable claim is recovered as unknown after reconnect. */}
      return {attemptId:claim.attemptId,outcome:rejected?'wallet_rejected':'unknown'};
    }
  }
}
function isUserRejection(error:unknown):boolean {return walletErrorCode(error,4001);}
function walletErrorCode(error:unknown,code:number):boolean {
  let current:unknown=error;
  for(let i=0;i<5 && current && typeof current==='object';i++) {
    if('code' in current && current.code===code)return true;
    current='cause' in current?current.cause:undefined;
  }
  return false;
}
