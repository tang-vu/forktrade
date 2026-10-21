// Original SDK facade, history query and GraphQL boundary; synthetic transport only.
// No SDK constructor, real connection, account, wallet or signer is created.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';

let target;
if(process.argv.length!==2){
  if(process.argv.length!==4||process.argv[2]!=='--out')throw new Error('Optional usage: --out feedback/evidence/<new-file>.json');
  const base=resolve('feedback/evidence');target=resolve(process.argv[3]);const offset=relative(base,target);
  if(!offset||offset.startsWith('..')||isAbsolute(offset)||!target.endsWith('.json'))throw new Error('Evidence output must be a JSON file inside feedback/evidence');
}
const require=createRequire(import.meta.url),entry=pathToFileURL(require.resolve('@somnia-chain/markets-sdk'));
assert.equal(JSON.parse(await readFile(new URL('../package.json',entry),'utf8')).version,'0.32.1');
const sourceFiles=[
  {path:'dist/unified/exchange.js',sha256:'f2fd34c35c40fb251a36bff27fe72e9f2cf6281433bf8534c839d8b8684241c2'},
  {path:'dist/perp/history.js',sha256:'fe6cdc69ebe424596966f757c369a7dd72c12b9cbf75d21a1ed18c20bd5173d4'},
  {path:'dist/indexerRead.js',sha256:'aee5f7ab6b9a6c51f5bc1ae04be1bc813f749fc002d774d3185712651e824b91'},
  {path:'dist/graphqlBoundary.js',sha256:'5777b878190ee2b4c34659007a1b6b199500e1f311da125e20f15df9da78841d'},
  {path:'dist/gql/legacyDocuments.js',sha256:'db9d53334af5e50f0fdedfbcbbfe8c2aa80bae85dc5fb8f1b2542267c7383bb7'},
];
for(const file of sourceFiles)assert.equal(createHash('sha256').update(await readFile(new URL('../'+file.path,entry))).digest('hex'),file.sha256,'Original SDK bytes differ');
const {SomniaMarkets}=await import('@somnia-chain/markets-sdk');
const {listFundingRateHistory}=await import(new URL('./perp/history.js',entry));
const endpoint='https://offline.invalid/graphql',pool='0x'+'0'.repeat(40),symbol='OFFLINE-BTC/USDso:USDso';
const start=1_700_000_000,step=3600;
const fixtures=Array.from({length:3},(_,i)=>({id:`SYNTHETIC-ROW-${i}`,pool,timestamp:String(start+i*step),
  blockNumber:String(100+i),fundingRate:'100000000000000',cumulativeFundingPerUnit:'0',
  indexPrice:'100000000000000000000',markPrice:'100000000000000000000',intervalsSettled:'1',intervalsAccrued:'1',
  fundingWindowSec:28800,fundingIntervalSec:3600,spanStart:String(start+(i-1)*step),spanEnd:String(start+i*step),anchorResynced:false,
  txHash:'0x'+'0'.repeat(64)}));
let activeRows=fixtures,requests=[];
const facade=Object.create(SomniaMarkets.prototype);
facade.market=()=>({symbol,chainId:50383,pool,market:{marketType:'PERP',quoteDecimals:18}});
// Original engineOf/engineFor execute. This engine has only a public history
// method that forwards to the unchanged SDK concept function and query builder.
facade.engines=new Map([[50383,{listFundingRateHistory:(p,opts)=>listFundingRateHistory(p,opts,endpoint)}]]);
const originalFetch=globalThis.fetch,cases=[];
try {
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,endpoint,'No network destination is permitted');
    assert.equal(init.method,'POST');
    const {query,variables}=JSON.parse(init.body);
    assert.match(query,/query FundingRateHistory\(/);
    assert.equal(variables.where.pool._eq,pool);
    const from=variables.where.timestamp?._gte,to=variables.where.timestamp?._lt;
    const direction=variables.orderBy[0].timestamp;
    assert.ok(['asc','desc'].includes(direction));
    let rows=activeRows.filter(r=>(from===undefined||BigInt(r.timestamp)>=BigInt(from))&&(to===undefined||BigInt(r.timestamp)<BigInt(to)));
    rows=rows.slice().sort((a,b)=>(Number(a.timestamp)-Number(b.timestamp))*(direction==='asc'?1:-1));
    rows=rows.slice(variables.offset,variables.offset+variables.limit);
    requests.push({variables,returnedIds:rows.map(r=>r.id)});
    return new globalThis.Response(JSON.stringify({data:{FundingRateUpdate:rows}}),{status:200,headers:{'content-type':'application/json'}});
  };
  const read=(since,limit)=>facade.fetchFundingRateHistory(symbol,since,limit);
  async function boundedLoop(name,limit,incrementMs,rows=fixtures){
    activeRows=rows;requests=[];
    let since=start*1000,exhausted=false;const pages=[];
    for(let i=0;i<5;i++){
      const response=await read(since,limit);
      const ids=response.map(r=>r.info.id),timestamps=response.map(r=>r.timestamp);
      const next=response.length?response.at(-1).timestamp+incrementMs:null;
      pages.push({sinceMilliseconds:since,ids,timestamps,nextSinceMilliseconds:next});
      if(!response.length){exhausted=true;break;}
      since=next;
    }
    const result={name,limit,incrementMs,pages,exhausted,requests};cases.push(result);return result;
  }
  const one=await boundedLoop('documented-plus-1-ms-limit-1',1,1);
  assert.equal(one.exhausted,false);assert.ok(one.pages.every(p=>p.ids[0]===fixtures[0].id));
  assert.equal(one.pages[1].sinceMilliseconds,one.pages[2].sinceMilliseconds);
  const two=await boundedLoop('documented-plus-1-ms-limit-2',2,1);
  assert.equal(two.exhausted,false);assert.deepEqual(two.pages[1].ids,[fixtures[1].id,fixtures[2].id]);
  assert.deepEqual(two.pages[3].ids,[fixtures[2].id]);assert.equal(two.pages[3].sinceMilliseconds,two.pages[4].sinceMilliseconds);
  const hundred=await boundedLoop('documented-default-sized-page-plus-1-ms',100,1);
  assert.equal(hundred.exhausted,false);assert.equal(hundred.pages[0].ids.length,3);
  assert.ok(hundred.pages.slice(1).every(p=>p.ids.length===1&&p.ids[0]===fixtures[2].id));
  const seconds=await boundedLoop('whole-second-advance-control',2,1000);
  assert.equal(seconds.exhausted,true);assert.deepEqual(seconds.pages.flatMap(p=>p.ids),fixtures.map(r=>r.id));
  const empty=await boundedLoop('empty-history-control',100,1,[]);assert.equal(empty.exhausted,true);
  activeRows=fixtures;requests=[];
  const fractionalSince=start*1000+1,fractional=await read(fractionalSince,1);
  assert.equal(fractional[0].timestamp,start*1000);assert.ok(fractional[0].timestamp<fractionalSince);
  cases.push({name:'one-ms-after-existing-row',sinceMilliseconds:fractionalSince,returnedTimestamps:fractional.map(r=>r.timestamp),requests});
  requests=[];const exact=await read(start*1000,1);assert.equal(exact[0].info.id,fixtures[0].id);
  cases.push({name:'exact-inclusive-boundary-control',returnedIds:exact.map(r=>r.info.id),requests});
  requests=[];const after=await read((start+2*step+1)*1000,100);assert.equal(after.length,0);
  cases.push({name:'after-tail-whole-second-control',returnedIds:[],requests});
  requests=[];const latest=await read(undefined,2);assert.deepEqual(latest.map(r=>r.info.id),[fixtures[1].id,fixtures[2].id]);
  cases.push({name:'omitted-since-latest-page-control',returnedIds:latest.map(r=>r.info.id),requests});
  requests=[];const raw=await listFundingRateHistory(pool,{from:start+1,limit:1,order:'asc'},endpoint);
  assert.equal(raw[0].id,fixtures[1].id);
  cases.push({name:'raw-seconds-reader-control',fromSeconds:start+1,returnedIds:raw.map(r=>r.id),requests});
} finally {globalThis.fetch=originalFetch;}
const record={kind:'OFFLINE SYNTHETIC SDK FUNDING CURSOR TEST - NOT LIVE HISTORY',observedAt:new Date().toISOString(),
  sdk:'@somnia-chain/markets-sdk@0.32.1',nodeVersion:process.version,sourceFiles,
  execution:{mode:'offline-synthetic',network:false,account:false,wallet:false,signer:false,transaction:false},
  sourceHandling:'Original facade method, requirePerpMarket, engineOf/engineFor, history query builder and GraphQL transport boundary. No constructor runs. Only market lookup, a history-only forwarding engine and fetch response are test doubles; no SDK body is edited.',
  fixtures,cases,limitations:['Five iterations per loop are a deliberate safety bound. Continued repetition follows from the unchanged cursor/query, not an unbounded observed run.','Rows, prices, IDs, block numbers and zero hash are explicitly synthetic and are not chain/order evidence.','Distinct fixture timestamps isolate millisecond truncation; no separate same-timestamp tie defect is claimed.']};
const output=JSON.stringify(record,null,2)+'\n';if(target)await writeFile(target,output,{flag:'wx'});process.stdout.write(output);
