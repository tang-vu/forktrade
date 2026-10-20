import {describe,it,expect,vi} from 'vitest';
import {encodeFunctionData,decodeFunctionData,zeroAddress,type EIP1193Provider} from 'viem';
import {perpPoolWriteAbi} from '@somnia-chain/markets-sdk';
import {prepareLiveContext} from '../src/integrations/prepare-order';
import {makePreview,verifyPreview} from '../src/domain/plan';
import {orderCall} from '../src/integrations/order-call';
import {BrowserOrderSender,connectWallet,watchWallet} from '../src/integrations/browser-wallet';
import {readFixture,SYNTHETIC_OWNER} from './helpers/read-fixture';
import {openDatabase} from '../src/server/database';
import {Repository,correlationTag} from '../src/server/repository';
const input={title:'SYNTHETIC wallet contract test',rationale:'Mock only; no real wallet',invalidation:'Synthetic condition',riskNotes:'PRIVATE_CANARY',side:'buy' as const,price:'82000',quantity:'0.0002',quantityCap:'0.001',notionalCap:'100'};
async function ready() {const f=readFixture(),tag=correlationTag(),context=await prepareLiveContext(SYNTHETIC_OWNER,input,tag,undefined,f.connect);return {f,tag,context,preview:makePreview(input,context,Date.now(),tag)};}
function walletFixture() {
  const controls={owner:SYNTHETIC_OWNER as string,chain:'0xc4cf',error:null as {code:number;message:string}|null,afterSend:()=>{}};
  const listeners=new Map<string,Set<()=>void>>();
  const request=vi.fn(async({method}:{method:string})=>{
    if(method==='eth_accounts'||method==='eth_requestAccounts')return [controls.owner];
    if(method==='eth_chainId')return controls.chain;
    if(method==='eth_sendTransaction'){controls.afterSend();if(controls.error)throw controls.error;return `0x${'11'.repeat(32)}`;}
    throw new Error(`Unexpected mock wallet method ${method}`);
  });
  const provider={request,on:(name:string,fn:()=>void)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name)!.add(fn);},removeListener:(name:string,fn:()=>void)=>listeners.get(name)?.delete(fn)} as unknown as EIP1193Provider;
  return {provider,request,controls,emit:(name:string)=>listeners.get(name)?.forEach(fn=>fn())};
}
describe('M5 exact payload and gas preparation',()=>{
  it('encodes the exact official SDK ABI with one correlation tag, GTC expiry, no value/builder/approval',async()=>{
    const {preview,f}=await ready(),p=preview.payload,call=orderCall(p);
    expect(call.data).toBe(encodeFunctionData({abi:perpPoolWriteAbi,functionName:'placeOrder',args:[true,BigInt(p.userData),BigInt(p.price),BigInt(p.quantity),BigInt(p.expireTimestampNs),0,0,zeroAddress,0n]}));
    const decoded=decodeFunctionData({abi:perpPoolWriteAbi,data:call.data});expect(decoded.functionName).toBe('placeOrder');
    expect(call.value).toBe(0n);expect(f.rpc.call).toHaveBeenCalledWith(expect.objectContaining({data:call.data,gas:10_000_000n}));expect(f.forbidden).not.toHaveBeenCalled();
  });
  it('fails closed for native funds, gas cap, stale context and changed fee conditions',async()=>{
    const {preview,context,f}=await ready();f.rpc.getBalance.mockResolvedValue(1n);
    await expect(prepareLiveContext(SYNTHETIC_OWNER,input,preview.payload.userData,context.transaction,f.connect)).rejects.toThrow(/Native balance/);
    expect(()=>orderCall({...preview.payload,chainId:1})).toThrow();expect(()=>orderCall({...preview.payload,expireTimestampNs:'0'})).toThrow();
    expect(()=>orderCall({...preview.payload,gas:'100'})).toThrow();expect(()=>orderCall({...preview.payload,builderFee:'1'})).toThrow();
    expect(()=>verifyPreview(preview,{...context,risk:{...context.risk!,accountStateHash:'changed'}})).toThrow(/changed/);
  });
  it('persists a unique tag/request before wallet effects and coalesces previews across tabs',async()=>{
    const {context,tag}=await ready(),db=openDatabase(':memory:'),repo=new Repository(db,'testnet');
    try {
      const plan=repo.create(SYNTHETIC_OWNER,input,undefined,context),p=repo.preview(SYNTHETIC_OWNER,plan.id,plan.versions[0].id,context,tag);
      const q=repo.preview(SYNTHETIC_OWNER,plan.id,plan.versions[0].id,context,correlationTag());
      const a=repo.claim(SYNTHETIC_OWNER,plan.id,p.id,p.payloadHash,context),b=repo.claim(SYNTHETIC_OWNER,plan.id,q.id,q.payloadHash,context);
      expect(a.claimed).toBe(true);expect(b.claimed).toBe(false);expect(b.attempt.id).toBe(a.attempt.id);
      expect(repo.getAttempt(SYNTHETIC_OWNER,a.attempt.id).preview.payload.userData).toBe(tag);
      expect(()=>repo.preview(SYNTHETIC_OWNER,plan.id,p.versionId,context,tag)).toThrow();
      expect(()=>new Repository(db).get(SYNTHETIC_OWNER,plan.id)).toThrow(/unavailable/);
      expect(()=>repo.create(SYNTHETIC_OWNER,input)).toThrow(/Verified owner/);
    } finally{db.sqlite.close();}
  });
});
describe('W01 W03–W07 browser signer without real wallet operations',()=>{
  it('does not touch a provider unless authorized, and rejects absent/wrong-network connections',async()=>{
    const w=walletFixture();await expect(connectWallet(w.provider,false)).rejects.toThrow(/disabled/);expect(w.request).not.toHaveBeenCalled();
    await expect(connectWallet(undefined,true)).rejects.toThrow(/No supported/);
    w.controls.chain='0x1';await expect(connectWallet(w.provider,true)).rejects.toThrow(/network/);
  });
  it('claims durably before exactly one signing request under repeated calls',async()=>{
    const {preview}=await ready(),w=walletFixture(),events:string[]=[],sender=new BrowserOrderSender();
    w.controls.afterSend=()=>events.push('wallet');
    const options={approvalId:'synthetic-approval',owner:SYNTHETIC_OWNER,enabled:true,provider:w.provider,contextValid:()=>true,
      claim:async()=>{events.push('persisted');return {claimed:true,attemptId:'synthetic-request',payload:preview.payload};},
      rememberHash:()=>events.push('hash_saved'),report:async()=>{events.push('reported');}};
    const results=await Promise.all([sender.send(options),sender.send(options),sender.send(options)]);
    expect(events).toEqual(['persisted','wallet','hash_saved','reported']);expect(new Set(results.map(r=>r.attemptId)).size).toBe(1);
    expect(w.request.mock.calls.filter(([p])=>p.method==='eth_sendTransaction')).toHaveLength(1);
  });
  it('does not sign a claim already used by another tab',async()=>{
    const {preview}=await ready(),w=walletFixture();await new BrowserOrderSender().send({approvalId:'already-used',owner:SYNTHETIC_OWNER,enabled:true,provider:w.provider,contextValid:()=>true,claim:async()=>({claimed:false,attemptId:'existing',payload:preview.payload}),report:async()=>{}});
    expect(w.request.mock.calls.filter(([p])=>p.method==='eth_sendTransaction')).toHaveLength(0);
  });
  for(const code of [4001,-32000,-32602,-32601])it(`preserves rejection/uncertain error ${code} without retry or alternate send method`,async()=>{
    const {preview}=await ready(),w=walletFixture(),reports:unknown[]=[],sender=new BrowserOrderSender();w.controls.error={code,message:'SYNTHETIC_SECRET_CANARY'};
    const o={approvalId:`error-${code}`,owner:SYNTHETIC_OWNER,enabled:true,provider:w.provider,contextValid:()=>true,claim:async()=>({claimed:true,attemptId:'retained',payload:preview.payload}),report:async(_id:string,value:unknown)=>{reports.push(value);}};
    await sender.send(o);await sender.send(o);expect(w.request.mock.calls.filter(([p])=>p.method.includes('sendTransaction'))).toHaveLength(1);
    expect(reports).toEqual([{kind:code===4001?'rejected':'interrupted'}]);expect(JSON.stringify(reports)).not.toContain('SECRET_CANARY');
  });
  it('invalidates before signing on account/network events; post-call switches still report original identity',async()=>{
    const {preview}=await ready(),w=walletFixture();let valid=true;const reports:unknown[]=[];
    const dispose=watchWallet(w.provider,()=>{valid=false;});
    await new BrowserOrderSender().send({approvalId:'switch-before',owner:SYNTHETIC_OWNER,enabled:true,provider:w.provider,contextValid:()=>valid,claim:async()=>{w.emit('chainChanged');return {claimed:true,attemptId:'original',payload:preview.payload};},report:async(_id,value)=>{reports.push(value);}});
    expect(reports).toEqual([{kind:'context_changed'}]);expect(w.request.mock.calls.filter(([p])=>p.method==='eth_sendTransaction')).toHaveLength(0);
    valid=true;w.controls.afterSend=()=>{w.controls.owner=zeroAddress;w.emit('accountsChanged');};
    await new BrowserOrderSender().send({approvalId:'switch-after',owner:SYNTHETIC_OWNER,enabled:true,provider:w.provider,contextValid:()=>valid,claim:async()=>({claimed:true,attemptId:'original-after',payload:preview.payload}),report:async(id,value)=>{reports.push({id,...value});}});
    expect(reports[1]).toMatchObject({id:'original-after',kind:'hash'});dispose();
  });
});
