import {outputPath,loadSources,finish} from './_botkit-offline.mjs';
import {files,makerCase} from './_maker-offline.mjs';
const target=outputPath(),sources=await loadSources(files),cases=[];
for(const inventoryRaw of [0n,75000000n,90000000n,-90000000n,100000000n,-100000000n])cases.push(await makerCase(sources,{inventoryRaw}));
const overshoots=cases.flatMap(c=>c.calls.quoteIntents.filter(q=>q.exceedsConfigured100Usdso));
if(overshoots.length!==2||overshoots.some(q=>q.projectedAbsolutePositionAtFixtureMarkRawUsdso!=='115000000000000000000'))throw new Error('Expected near-cap quote mismatch did not reproduce');
if(cases[4].calls.quoteIntents.some(q=>q.side==='long')||cases[5].calls.quoteIntents.some(q=>q.side==='short'))throw new Error('At-cap controls failed');
await finish(target,{sourceFiles:files,sourceRetrieval:{publicGETs:files.length,authenticated:false},
  limitations:['Synthetic positions, marks and SDK sizing responses; projected notional only, never a real fill',
    'Original maker, sizeForNotional, sizeOrder and dry-run placePerp bodies execute; account and SDK transports are test doubles',
    'README describes stopping at the cap but does not explicitly promise headroom clamping; strict-limit intent needs maintainer confirmation',
    'No live accepted quote, exposure, contract-cap bypass or financial loss is claimed'],cases});
