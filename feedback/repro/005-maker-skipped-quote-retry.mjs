import {outputPath,loadSources,finish} from './_botkit-offline.mjs';
import {files,makerCase} from './_maker-offline.mjs';
const target=outputPath(),sources=await loadSources(files);
const cases=[
  {name:'transient sizing failure, unchanged mark',...await makerCase(sources,{marks:[100,100,100],ready:[false,true,true]})},
  {name:'matching stable-mark healthy control',...await makerCase(sources,{marks:[100,100,100],ready:[true,true,true]})},
  {name:'transient sizing failure, mark moves control',...await makerCase(sources,{marks:[100,101,101],ready:[false,true,true]})},
];
if(cases[0].calls.quoteIntents.length!==0||cases[0].calls.sizingReads.some(c=>c.cycle>1))throw new Error('Expected skipped-quote retry suppression did not reproduce');
if(cases[1].calls.quoteIntents.length!==2||cases[2].calls.quoteIntents.length!==2||!cases[2].calls.sizingReads.some(c=>c.cycle===2))throw new Error('Retry controls failed');
await finish(target,{sourceFiles:files,sourceRetrieval:{publicGETs:files.length,authenticated:false},
  limitations:['Three synthetic cycles, public-source-only offline execution, no account or live quote',
    'Original maker/sizeOrder/dry-run placePerp bodies execute; SDK sizing/mark responses are test doubles',
    'Recovery after the first cycle is a fixture condition; no actual oracle outage or RPC incident is claimed',
    'Indefinite suppression while inputs stay unchanged is source-derived, not an unbounded live observation'],cases});
