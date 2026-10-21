import {runStrategy,fixtureAccount,fixtureMarket} from './_botkit-offline.mjs';
export const entry='strategies/perp-maker/src/index.ts';
export const files=[{path:entry,sha256:'ed8ccfafe233796f9764ea6f946c8450fd732754f3abcc853f74dd46a9c62e32'},
  {path:'packages/perp-core/src/markets.ts',sha256:'95dfbbb84d114927f5a5df87f4a0d96114d3904cb98a8c06c42c3823880a0520'},
  {path:'packages/perp-core/src/orders.ts',sha256:'a9ed57032c74315deafaea99a9ce349875b5bcd4b6eb0d09e2c5065c9402c583'}];
// Matches SDK 0.32.1 dist/trade.js; the SDK is not loaded by this test.
const ORDER_TYPE={LIMIT:0,FILL_OR_KILL:1,MARKET:2,POST_ONLY:3};
const formatUnits=(value,decimals)=>{
  const negative=value<0n,raw=(negative?-value:value).toString().padStart(decimals+1,'0');
  const whole=decimals?raw.slice(0,-decimals):raw,fraction=decimals?raw.slice(-decimals).replace(/0+$/,''):'';
  return (negative?'-':'')+whole+(fraction?'.'+fraction:'');
};
export async function makerCase(sources,{inventoryRaw=0n,marks=[100],ready=[true]}){
  let cycle=0;const calls={sizingReads:[],quoteIntents:[],positionReads:0};
  const result=await runStrategy({sources,entry,buildCore:async({helper,reject,boundaries})=>{
    const markets=await helper('packages/perp-core/src/markets.ts');
    const orders=await helper('packages/perp-core/src/orders.ts',{
      '@somnia-chain/markets-sdk':{ORDER_TYPE},viem:{formatUnits},'./markets.js':markets,
      './exchange.js':{assertTxOk:reject},'./operator.js':{placeFor:reject,cancelFor:reject},
    });
    const exchange={walletAddress:fixtureAccount,client:{getMaxPerpOrderSize:async req=>{
      calls.sizingReads.push({cycle:cycle+1,isBid:req.isBid});const okay=ready[cycle]??ready.at(-1);
      return {priceable:okay,placeable:okay,maxQuantity:10000000000n,limitedBy:'collateral',effectiveImfBps:500n};
    }},fetchPositions:async()=>{calls.positionReads++;return inventoryRaw===0n?[]:[{symbol:fixtureMarket.symbol,
      side:inventoryRaw>0n?'long':'short',contracts:Number(inventoryRaw<0n?-inventoryRaw:inventoryRaw)/100000000}];}};
    return {ORDER_TYPE,loadEnv(){},envNum:(_n,d)=>d,createExchange:opts=>{if(opts.withSigner!==false)reject();boundaries.push('withSigner:false');return {config:{dryRun:true},exchange};},
      onStop:()=>()=>cycle>=marks.length,requireMarket:async()=>fixtureMarket,tradingKeyCheck:async()=>({ok:true}),
      preflight:async()=>({ok:true,message:'OFFLINE TEST: synthetic sufficient account'}),ensureLeverage:async()=>({dryRun:true}),
      liveMark:async()=>marks[cycle],positionIn:orders.positionIn,sizeForNotional:markets.sizeForNotional,sizeOrder:orders.sizeOrder,
      cancelQuietly:orders.cancelQuietly,placePerp:async args=>{
        const placed=await orders.placePerp(args);
        if(placed.sent||placed.filled!==0n)throw new Error('Offline helper unexpectedly reported submission/fill');
        const markRaw=BigInt(marks[cycle])*10n**18n;
        const projectedRaw=inventoryRaw+(args.side==='long'?args.quantity:-args.quantity);
        const projectedNotional=(projectedRaw<0n?-projectedRaw:projectedRaw)*markRaw/100000000n;
        calls.quoteIntents.push({cycle:cycle+1,side:args.side,quantityRaw:args.quantity.toString(),orderType:args.orderType,
          submitted:false,projectedAbsolutePositionAtFixtureMarkRawUsdso:projectedNotional.toString(),
          exceedsConfigured100Usdso:projectedNotional>100n*10n**18n});
        return placed;
      },sleep:async()=>{cycle++;if(cycle>4)reject();},shutdown:async()=>boundaries.push('shutdown')};
  }});
  if(result.exitCode!==0||cycle!==marks.length||!result.boundaries.includes('withSigner:false')||!result.boundaries.includes('shutdown'))throw new Error('Expected bounded maker dry-run path did not complete');
  return {syntheticInventoryRawBase:inventoryRaw.toString(),syntheticMarkByCycle:marks,sizingPriceableByCycle:ready,
    baseDecimals:8,quoteDecimals:18,configuredMaxPositionUsdso:'100',configuredQuoteNotionalUsdso:'25',...result,calls};
}
