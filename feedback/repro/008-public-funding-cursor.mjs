// Two public funding-history reads; no account, wallet, signer or transaction.
// The SDK may also perform its normal indexer/chain binding metadata check.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve,relative,isAbsolute} from 'node:path';
import {SomniaMarkets,SOMNIA_HIDEKI_TESTNET_ADDRESSES} from '@somnia-chain/markets-sdk';
import {hidekiTestnet} from '@somnia-chain/markets-sdk/chains';
let target;
if(process.argv.length!==2){
  if(process.argv.length!==4||process.argv[2]!=='--out')throw new Error('Optional usage: --out feedback/evidence/<new-file>.json');
  const base=resolve('feedback/evidence');target=resolve(process.argv[3]);const offset=relative(base,target);
  if(!offset||offset.startsWith('..')||isAbsolute(offset)||!target.endsWith('.json'))throw new Error('Evidence output must be a JSON file inside feedback/evidence');
}
const require=createRequire(import.meta.url),entry=pathToFileURL(require.resolve('@somnia-chain/markets-sdk'));
assert.equal(JSON.parse(await readFile(new URL('../package.json',entry),'utf8')).version,'0.32.1');
for(const [name,hash] of [
  ['dist/unified/exchange.js','f2fd34c35c40fb251a36bff27fe72e9f2cf6281433bf8534c839d8b8684241c2'],
  ['dist/perp/history.js','fe6cdc69ebe424596966f757c369a7dd72c12b9cbf75d21a1ed18c20bd5173d4'],
])assert.equal(createHash('sha256').update(await readFile(new URL('../'+name,entry))).digest('hex'),hash);
const metadata=JSON.parse(await readFile(new URL('../evidence/007-btc-public-grid.json',import.meta.url),'utf8')).market;
assert.equal(metadata.poolAddress,'0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0');
assert.equal(metadata.quoteDecimals,18);
const indexer='https://hideki-dev.smk.somnia.host/v1/graphql';
const exchange=new SomniaMarkets({chain:hidekiTestnet,indexerUrl:indexer,addresses:SOMNIA_HIDEKI_TESTNET_ADDRESSES});
try {
  const rows=await exchange.client.listFundingRateHistory(metadata.poolAddress,{limit:1});
  assert.equal(rows.length,1,'Need a public funding sample; no automatic retry');
  const since=Number(rows[0].timestamp)*1000+1;
  const facade=Object.create(SomniaMarkets.prototype);
  facade.market=()=>({chainId:50383,pool:metadata.poolAddress,symbol:metadata.symbol,market:{marketType:'PERP',quoteDecimals:metadata.quoteDecimals}});
  facade.engines=new Map([[50383,exchange.client]]);
  const response=await facade.fetchFundingRateHistory(metadata.symbol,since,1);
  assert.equal(response.length,1);assert.equal(response[0].info.id,rows[0].id);
  assert.ok(response[0].timestamp<since);
  const record={kind:'ACTUAL PUBLIC READ-ONLY FUNDING HISTORY - NOT ACCOUNT OR ORDER EVIDENCE',observedAt:new Date().toISOString(),
    SDK:'0.32.1',chainId:50383,indexer,pool:metadata.poolAddress,
    scope:'Two public funding-history reads, plus standard SDK binding metadata if needed. Market lookup uses separately observed public metadata; the original facade helpers and real read-only SDK engine execute. No facade constructor runs; a separate signerless exchange supplies its public reader.',
    sample:rows[0],request:{symbol:metadata.symbol,sinceMilliseconds:since,limit:1},
    response:response.map(r=>({id:r.info.id,timestamp:r.timestamp,fundingTimestamp:r.fundingTimestamp,fundingRate:r.fundingRate})),
    returnedRowBeforeSince:true,account:false,wallet:false,signer:false,transaction:false};
  const output=JSON.stringify(record,null,2)+'\n';if(target)await writeFile(target,output,{flag:'wx'});process.stdout.write(output);
} finally {await exchange.close();}
