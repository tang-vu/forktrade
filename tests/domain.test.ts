import {describe,it,expect} from 'vitest';
import {parseAmount,formatAmount,UINT256_MAX} from '../src/domain/amounts';
import {hash,normalizePlan,makePreview,verifyPreview,type PlanInput} from '../src/domain/plan';
import {initialExecution,reconcile,simulate} from '../src/domain/execution';
import {offlineContext} from '../src/integrations/offline';
import {Generation} from '../src/domain/generation';
const input:PlanInput={title:'Synthetic thesis',rationale:'Offline exercise',invalidation:'Synthetic condition',riskNotes:'Private canary',side:'buy',price:'82000',quantity:'0.0002',quantityCap:'0.001',notionalCap:'100'};
it('W06 rejects a late response after edits or a new account/network generation',async()=>{
  const generation=new Generation(),old=generation.capture();
  let finish!:(value:string)=>void;const read=new Promise<string>(resolve=>{finish=resolve;});
  generation.invalidate();finish('old context');await read;
  expect(generation.accepts(old)).toBe(false);expect(generation.accepts(generation.capture())).toBe(true);
});
describe('N01–N04 exact amounts and fresh bounded context',()=>{
  for(const decimals of [6,7,8,9,18,24])it(`round trips ${decimals} decimals with a distinct quote scale`,()=>{
    const text=`12.${'1'.repeat(decimals)}`;expect(formatAmount(parseAmount(text,decimals),decimals)).toBe(text);
    expect(parseAmount('1',decimals)).toBe(10n**BigInt(decimals));
    const ctx={...offlineContext('offline:test'),baseDecimals:decimals,quoteDecimals:6,lot:'1',minQuantity:'1'};
    const value=normalizePlan({...input,price:'1.000000',quantity:`0.${'0'.repeat(decimals-1)}1`,quantityCap:'1'}, {...ctx,tick:'1'});
    expect(value.price).toBe('1');expect(value.quantity).toBe(`0.${'0'.repeat(decimals-1)}1`);
  });
  for(const bad of ['0','-1','+1','1e3','1,000',' 1','1.','NaN','01','0.0000001',UINT256_MAX.toString()+'0'])it(`rejects ambiguous/out-of-range ${bad}`,()=>expect(()=>parseAmount(bad,6)).toThrow());
  it('rejects unsupported decimals, tick/lot/minimum and caps without rounding',()=>{
    expect(()=>parseAmount('1',37)).toThrow();const ctx=offlineContext('offline:test');
    for(const patch of [{price:'82000.01'},{quantity:'0.000201'},{quantity:'0.00012'},{quantityCap:'0.0001'},{notionalCap:'1'}])expect(()=>makePreview({...input,...patch},ctx)).toThrow();
    expect(makePreview(input,ctx).amounts.notional).toBe('16400000000000000000');
  });
  it('blocks stale/missing prices, unavailable sizing, voucher/isolated restrictions and bounds',()=>{
    for(const patch of [{observedAt:Date.now()-11000},{markPrice:'0'},{priceable:false},{placeable:false,limitedBy:'voucherBlocked'},{permissions:false},{maxQuantity:'1'},{availableCollateral:'1'},{maxNotional:'1'},{tick:'0'},{chainId:1},{feeBps:'-1'},{initialMarginBps:'0'}])expect(()=>makePreview(input,{...offlineContext('offline:test'),...patch})).toThrow();
  });
  it('normalizes equivalent inputs and binds every executable economic field',()=>{
    const ctx=offlineContext('offline:test');expect(normalizePlan({...input,price:'82000.0'},ctx)).toEqual(input);
    const p=makePreview(input,ctx);
    for(const [key,value] of Object.entries(p.payload))expect(hash({...p.payload,[key]:`${value}-changed`})).not.toBe(p.payloadHash);
    expect(hash({b:2,a:1})).toBe(hash({a:1,b:2}));
  });
  it('invalidates expired/changed owner, signer, network, decimals, balance, fees or risk',()=>{
    const ctx=offlineContext('offline:test'),p=makePreview(input,ctx);
    expect(()=>verifyPreview(p,ctx,p.expiresAt)).toThrow(/expired/);
    for(const patch of [{owner:'offline:other'},{signer:'offline:other'},{chainId:1},{baseDecimals:9},{availableCollateral:'1'},{feeBps:'1'},{maxQuantity:'10'}])expect(()=>verifyPreview(p,{...ctx,...patch})).toThrow(/changed/);
  });
  it('rechecks moving mark/capacity for the fixed order without enlarging reviewed amounts',()=>{
    const ctx=offlineContext('offline:test'),p=makePreview(input,ctx);
    expect(()=>verifyPreview(p,{...ctx,markPrice:(BigInt(ctx.markPrice)+1n).toString(),maxQuantity:p.payload.quantity,maxNotional:p.amounts.notional,limitedBy:'current capacity'})).not.toThrow();
    expect(p.payload.quantity).toBe('20000');expect(p.payload.price).toBe('82000000000000000000000');
    for(const patch of [{markPrice:'0'},{priceable:false},{placeable:false},{permissions:false},{maxQuantity:'19999'},{maxNotional:(BigInt(p.amounts.notional)-1n).toString()}])expect(()=>verifyPreview(p,{...ctx,...patch})).toThrow(/changed/);
  });
  it('permits only no-higher refreshed margin/fee estimates with identical account/rules/funding context',()=>{
    const risk={requiredMargin:'100',feeReserve:'10',initialMarginPortion:'100',adverseGapPortion:'0',leverageSurcharge:'0',equity:'10000',lockedCollateral:'0',accountStateHash:'SYNTHETIC-state',walletPull:'0',mainWalletPull:'0',autoFundingPrevented:true};
    const ctx={...offlineContext('offline:test'),risk,configurationHash:'SYNTHETIC-config'},p=makePreview(input,ctx);
    expect(()=>verifyPreview(p,{...ctx,markPrice:(BigInt(ctx.markPrice)+1n).toString(),risk:{...risk,requiredMargin:'99',initialMarginPortion:'99',feeReserve:'9'}})).not.toThrow();
    for(const change of [{requiredMargin:'101'},{feeReserve:'11'},{accountStateHash:'changed'},{equity:'9999'},{lockedCollateral:'1'},{walletPull:'1'},{mainWalletPull:'1'},{autoFundingPrevented:false}])expect(()=>verifyPreview(p,{...ctx,risk:{...risk,...change}})).toThrow();
    expect(()=>verifyPreview(p,{...ctx,configurationHash:'changed'})).toThrow(/changed/);
    expect(()=>verifyPreview(p,{...ctx,transaction:{gas:'10000000',maxFeePerGas:'2',maxPriorityFeePerGas:'0',nativeBalance:'1000000000',nativeDecimals:18,nativeSymbol:'STT'}})).toThrow(/changed/);
  });
});
describe('R01–R07 conservative independent transaction/order evidence',()=>{
  const base=()=>initialExecution('offline:test',0,'synthetic:pool','20000','offline');
  it('a hash and confirmation never infer acceptance or fill',()=>{
    const first=reconcile(base(),{...base(),hash:'synthetic-not-a-tx-hash',tx:'submitted',authoritative:true});
    const second=reconcile(first,{...first,tx:'confirmed',authoritative:true});
    expect(second.order).toBe('unobserved');expect(second.filled).toBe('0');
  });
  it('retains cumulative partial fills after cancellation without double counting',()=>{
    const partial=reconcile(base(),{...base(),authoritative:true,tx:'confirmed',order:'partial',filled:'10000',remaining:'10000'});
    const cancelled=reconcile(partial,{...partial,authoritative:true,order:'cancelled'});
    expect(reconcile(cancelled,{...cancelled,authoritative:true}).filled).toBe('10000');
    expect(cancelled.remaining).toBe('10000');
  });
  it('preserves rejection, revert, interrupted and unknown results',()=>{
    expect(simulate(base(),'rejected')).toMatchObject({tx:'confirmed',order:'rejected'});
    expect(simulate(base(),'reverted')).toMatchObject({tx:'reverted',order:'unobserved'});
    expect(simulate(base(),'unknown')).toMatchObject({tx:'unknown',order:'unknown'});
    expect(simulate(base(),'wallet_rejected').tx).toBe('not_submitted');
  });
  it('rejects identity/quantity/order mismatches and untrusted observations',()=>{
    for(const patch of [{owner:'other'},{chainId:1},{pool:'other'},{quantity:'1'},{filled:'20001'},{remaining:'0'},{order:'filled' as const},{order:'partial' as const},{authoritative:false}])expect(()=>reconcile(base(),{...base(),authoritative:true,...patch})).toThrow();
  });
  it('refuses synthetic/live crossover and requires live order/block identity',()=>{
    const live={...base(),mode:'testnet' as const,chainId:50383};
    expect(()=>simulate(live,'open')).toThrow();
    expect(()=>reconcile(live,{...live,authoritative:true,tx:'confirmed',order:'open'})).toThrow(/identity/);
  });
  it('labels downgraded/corrected evidence rather than freezing a green badge',()=>{
    const prior=simulate(base(),'partial_cancelled');
    expect(reconcile(prior,{...prior,authoritative:true,tx:'unknown',order:'unknown',filled:'0',remaining:'20000'}).reason).toContain('corrected');
  });
});
