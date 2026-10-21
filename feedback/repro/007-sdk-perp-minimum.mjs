// Real pinned SDK method; offline metadata lookup / writer boundary test doubles.
// No SomniaMarkets instance, wallet, provider, signer, RPC or receipt is created.
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
const require=createRequire(import.meta.url),sdkEntry=pathToFileURL(require.resolve('@somnia-chain/markets-sdk'));
const pkg=JSON.parse(await readFile(new URL('../package.json',sdkEntry),'utf8'));
assert.equal(pkg.version,'0.32.1','Use exact SDK 0.32.1');
const sourceFiles=[
  {path:'dist/unified/exchange.js',sha256:'f2fd34c35c40fb251a36bff27fe72e9f2cf6281433bf8534c839d8b8684241c2'},
  {path:'dist/unified/structs.js',sha256:'42c40d71e90d8340507b776e2bc09b4855b0e670b00522270c3aadb83f5acaf2'},
];
for(const file of sourceFiles){
  const bytes=await readFile(new URL('../'+file.path,sdkEntry));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,'Pinned SDK source differs');
}
const {SomniaMarkets}=await import('@somnia-chain/markets-sdk');
const publicConfig=JSON.parse(await readFile(new URL('../evidence/007-btc-public-grid.json',import.meta.url),'utf8'));
assert.equal(publicConfig.kind,'ACTUAL PUBLIC READ-ONLY MARKET CONFIGURATION - NOT AN ORDER');
assert.equal(publicConfig.chainId,50383);
const info=publicConfig.market;
assert.equal(info.onchain.lotSize,'1000');assert.equal(info.onchain.minQuantity,'13000');
assert.deepEqual(info.sdkRow,info.onchain);
const t={chainId:50383,pool:info.poolAddress,symbol:info.symbol,
  market:{marketType:'PERP',baseDecimals:info.baseDecimals,quoteDecimals:info.quoteDecimals,...info.sdkRow}};
const cases=[];
for(const side of ['buy','sell'])for(const input of ['0.000009','0.00001','0.00012','0.000129','0.00013','0.00014']){
  const seam=Object.create(SomniaMarkets.prototype),calls=[];
  const boundary=new Error('OFFLINE WRITE BOUNDARY - NO TRANSACTION');
  seam.market=()=>t;
  // Original placeCollateral runs its normal no-funding branch; these state
  // holders create no exchange, connection or wallet.
  seam.closeController=new AbortController();seam.engines=new Map();
  seam.traderOf=()=>({placePerpOrder:async params=>{
    calls.push({quantityRaw:params.quantity.toString(),priceRaw:params.price.toString(),isBid:params.isBid,
      belowObservedMinQuantity:params.quantity<BigInt(info.onchain.minQuantity)});
    throw boundary;
  }});
  let outcome;
  try{await seam.createOrder(t.symbol,'limit',side,Number(input),100,{funding:'skip'});throw new Error('Unexpected returned order');}
  catch(error){
    if(error===boundary)outcome='intercepted-at-mocked-trader-boundary';
    else {assert.equal(error.name,'InvalidInputError');outcome='local-InvalidInputError';}
  }
  const belowLot=input==='0.000009';
  assert.equal(calls.length,belowLot?0:1);
  assert.equal(outcome,belowLot?'local-InvalidInputError':'intercepted-at-mocked-trader-boundary');
  if(!belowLot)assert.equal(calls[0].belowObservedMinQuantity,!['0.00013','0.00014'].includes(input));
  cases.push({inputAmount:input,side,outcome,calls});
}
const record={kind:'OFFLINE SYNTHETIC SDK TEST - NOT LIVE ORDER EVIDENCE',observedAt:new Date().toISOString(),
  sdk:'@somnia-chain/markets-sdk@0.32.1',nodeVersion:process.version,sourceFiles,
  execution:{mode:'offline-synthetic',network:false,signer:false,privateKey:false,transactions:false},
  publicConfiguration:{file:'007-btc-public-grid.json',observedAt:publicConfig.observedAt,blockNumber:publicConfig.blockNumber,chainId:50383},
  sourceHandling:'Original installed SDK createOrder and grid/generation/collateral helpers; only market lookup and trader resolution are test doubles. No class instance or modified SDK function body.',
  cases,limitations:['Only a local validation / write-boundary observation, not a sent/reverted order or measured gas loss.','Public configuration was observed separately; offline inputs/account/writer boundary are fixtures.']};
const output=JSON.stringify(record,null,2)+'\n';if(target)await writeFile(target,output,{flag:'wx'});process.stdout.write(output);
