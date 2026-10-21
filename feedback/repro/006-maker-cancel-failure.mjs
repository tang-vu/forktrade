// OFFLINE failure injection. Returned IDs 1..4 are test-double sentinels,
// never an actual order, receipt, fill or chain history. No SDK/trader is loaded.
import assert from 'node:assert/strict';
import {outputPath,loadSources,runStrategy,finish,fixtureAccount,fixtureMarket} from './_botkit-offline.mjs';
import {entry,files} from './_maker-offline.mjs';
const target=outputPath(),sources=await loadSources(files);
const cases=[];
for(const mode of ['success-control','transport-failure','unknown-outcome']){
  let cycle=0,nextSentinel=1n;const unresolved=new Set(),placements=[],cancellations=[];
  const result=await runStrategy({sources,entry,buildCore:async({helper,reject,boundaries})=>{
    const markets=await helper('packages/perp-core/src/markets.ts');
    const orders=await helper('packages/perp-core/src/orders.ts',{
      '@somnia-chain/markets-sdk':{ORDER_TYPE:{LIMIT:0,FILL_OR_KILL:1,MARKET:2,POST_ONLY:3}},
      viem:{formatUnits:value=>String(value)},'./markets.js':markets,
      './exchange.js':{assertTxOk:reject},'./operator.js':{placeFor:reject,cancelFor:reject},
    });
    // This is a synthetic writer seam, not ctx.config's ordinary DRY_RUN branch.
    // Only cancelQuietly runs against it. Every operation remains in memory.
    const mockCancelCtx={config:{dryRun:false},exchange:{trader:{cancelOrder:async({orderId})=>{
      const failed=mode!=='success-control'&&orderId<=2n;
      cancellations.push({phase:cycle===2?'shutdown':'cycle-'+(cycle+1),testSentinelId:orderId.toString(),injectedFailure:failed});
      if(failed)throw new Error('OFFLINE injected '+mode+'; cancellation is not established');
      unresolved.delete(orderId.toString());
    }}}};
    return {ORDER_TYPE:{POST_ONLY:3},loadEnv(){},envNum:(_name,value)=>value,
      createExchange:options=>{assert.equal(options.withSigner,false);boundaries.push('withSigner:false');
        return {config:{dryRun:true},exchange:{walletAddress:fixtureAccount}};},
      onStop:()=>()=>cycle>=2,requireMarket:async()=>fixtureMarket,tradingKeyCheck:async()=>({ok:true}),
      preflight:async()=>({ok:true,message:'OFFLINE sufficient-margin fixture'}),ensureLeverage:async()=>({dryRun:true}),
      liveMark:async()=>cycle===0?100:101,positionIn:async()=>undefined,
      sizeForNotional:markets.sizeForNotional,sizeOrder:async(_exchange,req)=>({ok:true,quantity:req.wanted}),
      cancelQuietly:async(_ctx,market,id)=>orders.cancelQuietly(mockCancelCtx,market,id),
      placePerp:async args=>{
        const id=nextSentinel++;unresolved.add(id.toString());
        placements.push({cycle:cycle+1,side:args.side,testSentinelId:id.toString(),kind:'IN-MEMORY HELPER RETURN FIXTURE ONLY'});
        // Models a helper return to establish caller state; no placement body,
        // writer, signer, transaction or synthetic receipt is executed/generated.
        return {sent:true,orderId:id,filled:0n};
      },sleep:async()=>{cycle++;assert.ok(cycle<=2);},shutdown:async()=>boundaries.push('shutdown')};
  }});
  assert.equal(result.exitCode,0);assert.equal(cycle,2);assert.equal(placements.length,4);
  assert.deepEqual(cancellations.map(c=>c.testSentinelId),['1','2','3','4']);
  assert.deepEqual([...unresolved],mode==='success-control'?[]:['1','2']);
  assert.ok(result.logs.includes('quotes pulled, exiting'));
  assert.ok(result.boundaries.includes('withSigner:false')&&result.boundaries.includes('shutdown'));
  cases.push({mode,...result,placementSeamCalls:placements,cancellationSeamCalls:cancellations,
    testDoubleUncancelledIdsAtEnd:[...unresolved],authoritativeCancellationReconciliationReads:0});
}
await finish(target,{finding:'Cancellation failure is swallowed before replacement and final success-like cleanup log',
  sourceFiles:files,cases,
  fixtureHandling:'IDs 1..4 and sent:true are explicit in-memory helper-return fixtures, not orders/receipts. Main requests no signer and stays DRY_RUN=true; only the cancel helper receives a synthetic dryRun:false context to exercise its catch against a local throwing test double.',
  limitations:['No actual cancellation, quote, chain state, failure, duplicate order, exposure or loss was observed.','Source main and cancel helper bodies are unchanged; placement/sizing/account/mark/dependency seams are mocked.']});
