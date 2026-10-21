import {outputPath,loadSources,runStrategy,finish,fixtureAccount,fixtureMarket} from './_botkit-offline.mjs';
const target=outputPath();
const entry='strategies/perp-starter/src/index.ts';
const files=[{path:entry,sha256:'3e0158ab088489fbd63ff4a0e1a38174d6c5be6a3fee1fd85c4ea19065f731b1'},
  {path:'packages/perp-core/src/margin.ts',sha256:'041cfbb5a34bc80c6ddb2d71d81b592c979826a950d617aebdbb2533ea58d23a'}];
const sources=await loadSources(files),cases=[];
for(const unlocked of [20n,25n,30n]){
  const calls={accountReads:0,positionReads:0,bracketRequests:0,entryRequests:0};
  const result=await runStrategy({sources,entry,buildCore:async({helper,reject,boundaries})=>{
    const margin=await helper('packages/perp-core/src/margin.ts');
    const exchange={walletAddress:fixtureAccount,client:{getMarginAccount:async()=>{calls.accountReads++;return {
      unlockedCollateralBalance:unlocked*10n**18n,lockedCollateral:0n,equity:unlocked*10n**18n,withdrawable:0n,
      imReq:5n*10n**17n,mmReq:25n*10n**15n,cmReq:125n*10n**14n,marginStatus:'Healthy',activePerpPools:[fixtureAccount]};}}};
    return {ORDER_TYPE:{MARKET:2},loadEnv(){},envNum:(_n,d)=>d,createExchange:opts=>{if(opts.withSigner!==false)reject();boundaries.push('withSigner:false');return {config:{dryRun:true},exchange};},
      onStop:()=>()=>false,requireMarket:async()=>fixtureMarket,tradingKeyCheck:async()=>({ok:true}),preflight:margin.preflight,
      ensureLeverage:async()=>({dryRun:true}),somiPerStop:async()=>150000000000000000n,
      positionIn:async()=>{calls.positionReads++;return {side:'long',contracts:0.01};},pendingStops:async()=>[],liveMark:async()=>100,markOf:()=>100,
      armBracket:async()=>{calls.bracketRequests++;return {sent:false};},shutdown:async()=>boundaries.push('shutdown'),
      placePerp:()=>{calls.entryRequests++;reject();},closePosition:reject,cancelStops:reject,sizeForNotional:reject,sizeOrder:reject,sleep:reject};
  }});
  cases.push({syntheticUnlockedUsdso:unlocked.toString(),existingPosition:'synthetic long 0.01 base at mark 100 (notional 1); sides match',
    configuredEntryNotionalUsdso:'50',configuredLeverage:'2',newEntryBudgetUsdso:'25',...result,calls});
}
if(cases[0].exitCode!==1||cases[0].calls.positionReads!==0||cases[0].calls.bracketRequests!==0)throw new Error('Low-entry-budget condition did not reproduce');
if(cases.slice(1).some(c=>c.exitCode!==0||c.calls.positionReads!==1||c.calls.bracketRequests!==1))throw new Error('Matching existing-position controls failed');
if(cases.some(c=>c.calls.entryRequests!==0||!c.boundaries.includes('withSigner:false')))throw new Error('Unexpected entry/signer path');
await finish(target,{sourceFiles:files,sourceRetrieval:{publicGETs:files.length,authenticated:false},
  limitations:['Synthetic healthy account/position/mark/native-fee responses; no real wallet or open position',
    'Actual preflight and marginSnapshot bodies execute; other exchange helpers are test doubles',
    'No claim that a live position lost protection, a stop failed or funds were lost'],cases});
