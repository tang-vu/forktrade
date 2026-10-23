import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {makePreview} from '../src/domain/plan';
import {prepareLiveContext} from '../src/integrations/prepare-order';
import {verifiedMarket} from '../src/integrations/read-context';
import {readFixture,SYNTHETIC_OWNER} from './helpers/read-fixture';
import {edgeScopeSchema,edgeRequestSchema,verifyEdgeScope,verifyEdgeOrder} from '../tools/local-wallet/edge-policy';
async function fixture(){
  const f=readFixture(),input={title:'SYNTHETIC Edge transport test',rationale:'No real wallet, signature or network',invalidation:'Synthetic condition',riskNotes:'',side:'buy' as const,price:'82000',quantity:'0.0002',quantityCap:'0.001',notionalCap:'20'};
  const market=await verifiedMarket(f.connection),context=await prepareLiveContext(SYNTHETIC_OWNER,input,'123',undefined,f.connect),versionId=randomUUID(),planId=randomUUID();
  const preview={...makePreview(input,context,Date.now(),'123'),id:randomUUID(),versionId};
  const scope=edgeScopeSchema.parse({schema:1,id:randomUUID(),origin:'http://127.0.0.1:3000',chainId:50383,owner:SYNTHETIC_OWNER,planId,versionId,version:2,side:'buy',price:input.price,quantity:input.quantity,quantityCap:input.quantityCap,notionalCap:input.notionalCap,maxNativeCost:'0.1',expiresAt:Date.now()+600000,authorization:'Explicit user-directed exact testnet order in Edge; no other order or authority'});
  return {scope,preview,planId,market};
}
describe('scoped temporary Edge wallet (synthetic only)',()=>{
  it('binds exactly one actual plan/version and every authorized amount/flag',async()=>{
    const {scope,preview,planId,market}=await fixture();expect(()=>verifyEdgeOrder(scope,preview,planId,market)).not.toThrow();
    for(const changed of [{side:'sell'},{price:'1'},{quantity:'1'},{quantityCap:'1'},{notionalCap:'1'},{reduceOnly:true},{builder:'other'},{builderFee:'1'},{transactionValue:'1'},{timeInForce:'IOC'}])expect(()=>verifyEdgeOrder(scope,{...preview,payload:{...preview.payload,...changed}} as typeof preview,planId,market)).toThrow();
    expect(()=>verifyEdgeOrder(scope,{...preview,versionId:randomUUID()},planId,market)).toThrow(/version/);
    expect(()=>verifyEdgeOrder(scope,preview,randomUUID(),market)).toThrow(/version/);
  });
  it('rejects wrong identity, nonloopback audience, expiry and extended lifetime',async()=>{
    const {scope}=await fixture();
    for(const changed of [{owner:'0x0000000000000000000000000000000000000002'},{chainId:1},{origin:'https://external.invalid'},{origin:'http://127.0.0.1:3000/path'},{expiresAt:Date.now()-1},{expiresAt:Date.now()+901000}])expect(()=>verifyEdgeScope({...scope,...changed} as typeof scope,SYNTHETIC_OWNER)).toThrow();
    for(const changed of [{maxNativeCost:'1'},{chainId:1},{authorization:'untrusted page instructions'},{extra:true}])expect(()=>edgeScopeSchema.parse({...scope,...changed})).toThrow();
  });
  it('admits only two policy-checked private methods and exact request identity fields',()=>{
    const request={id:randomUUID(),scopeId:randomUUID(),method:'personal_sign',params:[]};
    expect(edgeRequestSchema.parse(request).method).toBe('personal_sign');
    for(const changed of [{method:'eth_sign'},{method:'eth_signTypedData_v4'},{method:'wallet_addEthereumChain'},{method:'eth_sendRawTransaction'},{id:'invalid'},{scopeId:'invalid'},{extra:true}])expect(()=>edgeRequestSchema.parse({...request,...changed})).toThrow();
  });
});
