import {describe,it,expect} from 'vitest';
import {readFixture,SYNTHETIC_OWNER} from './helpers/read-fixture';
import {readAccountContext,readPublicMarket} from '../src/integrations/read-context';
import {makePreview} from '../src/domain/plan';
const input={title:'Synthetic account read',rationale:'Explicit fixture only',invalidation:'Synthetic condition',riskNotes:'',side:'buy' as const,price:'82000',quantity:'0.0002',quantityCap:'0.001',notionalCap:'100'};
describe('M4 N04 S02 verified public and owner-derived read context',()=>{
  it('checks public chain, factory, bank, collateral, precision, grid and book without a signing capability',async()=>{
    const f=readFixture(),result=await readPublicMarket(f.connect);
    expect(result.bytecodePresent).toEqual({pool:true,marginBank:true,factory:true});
    expect(result.accountContext).toContain('Not requested');expect(f.reader.getMarginAccount).not.toHaveBeenCalled();
    expect(f.forbidden).not.toHaveBeenCalled();expect(f.close).toHaveBeenCalledOnce();
  });
  it('fails closed before discovery on wrong chain and always disposes connections',async()=>{
    const f=readFixture();f.controls.chainId=1;
    await expect(readPublicMarket(f.connect)).rejects.toThrow(/network identity/);
    expect(f.reader.listPerpMarkets).not.toHaveBeenCalled();expect(f.close).toHaveBeenCalledOnce();
  });
  for(const problem of ['stale','bank','collateral','factory','code','precision','tick','deployed','registration','pool','scale'] as const)it(`rejects ${problem} mismatch`,async()=>{
    const f=readFixture();
    switch(problem) {
      case 'stale':f.controls.headAgeMs=40_000;break;
      case 'bank':f.controls.bank=SYNTHETIC_OWNER;break;
      case 'collateral':f.system.collateralToken=SYNTHETIC_OWNER;break;
      case 'factory':f.system.perpPoolFactory=SYNTHETIC_OWNER;break;
      case 'code':f.controls.code='0x';break;
      case 'precision':f.controls.baseDecimals=18;break;
      case 'tick':f.controls.tick=1n;break;
      case 'deployed':f.controls.deployed=false;break;
      case 'registration':f.controls.registered=false;break;
      case 'pool':f.controls.factoryPool=SYNTHETIC_OWNER;break;
      case 'scale':f.controls.oneBase=10n**18n;break;
    }
    await expect(readPublicMarket(f.connect)).rejects.toThrow();expect(f.close).toHaveBeenCalledOnce();expect(f.forbidden).not.toHaveBeenCalled();
  });
  it('uses protocol lock/reserve and fractional bps rather than notional times static IMF',async()=>{
    const f=readFixture(),context=await readAccountContext(SYNTHETIC_OWNER,input,f.connect),preview=makePreview(input,context);
    expect(context.marginMode).toBe('cross');expect(context.feeBps).toBe('1.5');
    expect(preview.estimatedMargin).toBe((2n*10n**18n).toString());expect(preview.estimatedFee).toBe((5n*10n**15n).toString());
    expect(f.reader.getMaxPerpOrderSize).toHaveBeenCalledWith(expect.objectContaining({account:SYNTHETIC_OWNER,autoPull:false,builderFeeBpsTimes1k:0n}));
    expect(f.forbidden).not.toHaveBeenCalled();expect(f.close).toHaveBeenCalledOnce();
  });
  for(const problem of ['mark','sizing','voucher','isolated','restriction','funding','allowance','payer','collateral','smart-wallet'] as const)it(`blocks unresolved owner context: ${problem}`,async()=>{
    const f=readFixture();
    switch(problem) {
      case 'mark':f.state.markPriceOk=false;break;
      case 'sizing':f.max.maxQuantity=1n;break;
      case 'voucher':f.margin.voucherBlocked=true;break;
      case 'isolated':f.margin.isolationBlocked=true;break;
      case 'restriction':f.margin.restrictedBlocked=true;break;
      case 'funding':f.margin.ownWalletPull=1n;break;
      case 'allowance':f.controls.allowance=1n;break;
      case 'payer':f.controls.payer=SYNTHETIC_OWNER;break;
      case 'collateral':f.balance.unlockedCollateralBalance=1n;break;
      case 'smart-wallet':f.controls.ownerCode='0xef0100';break;
    }
    await expect(readAccountContext(SYNTHETIC_OWNER,input,f.connect)).rejects.toThrow();expect(f.close).toHaveBeenCalledOnce();expect(f.forbidden).not.toHaveBeenCalled();
  });
  it('rejects non-wallet owners and never returns an unknown mode as cross',async()=>{
    const f=readFixture();await expect(readAccountContext('offline:fixture',input,f.connect)).rejects.toThrow(/EOA/);
    f.controls.isolated=true;expect((await readAccountContext(SYNTHETIC_OWNER,input,f.connect)).marginMode).toBe('isolated');
  });
});
