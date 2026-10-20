import {describe,it,expect} from 'vitest';
import {encodeAbiParameters,encodeEventTopics,zeroAddress,type AbiParameter} from 'viem';
import {orderBookEventsAbi} from '@somnia-chain/markets-sdk';
import {readFixture,SYNTHETIC_OWNER,syntheticBlockHash} from './helpers/read-fixture';
import {prepareLiveContext} from '../src/integrations/prepare-order';
import {makePreview} from '../src/domain/plan';
import {initialExecution,reconcile} from '../src/domain/execution';
import {orderCall} from '../src/integrations/order-call';
import {observeOrder} from '../src/integrations/observe-order';
const input={title:'SYNTHETIC receipt test',rationale:'No live transactions',invalidation:'Fixture only',riskNotes:'',side:'buy' as const,price:'82000',quantity:'0.0002',quantityCap:'0.001',notionalCap:'100'};
const HASH=`0x${'11'.repeat(32)}`,BLOCK=syntheticBlockHash(1n);
async function fixture() {
  const f=readFixture(),ctx=await prepareLiveContext(SYNTHETIC_OWNER,input,'123',undefined,f.connect),p=makePreview(input,ctx,Date.now(),'123').payload,call=orderCall(p);
  const placedOrder={orderId:42n,isBid:true,owner:SYNTHETIC_OWNER,userData:123n,price:BigInt(p.price),fullQuantity:20_000n,quantityRemaining:20_000n,expireTimestampNs:BigInt(p.expireTimestampNs)};
  function log(name:typeof orderBookEventsAbi[number]['name'],args:Record<string,unknown>,index=0) {
    const event=orderBookEventsAbi.find(e=>e.name===name)!;
    const inputs=event.inputs.filter(i=>!i.indexed) as readonly AbiParameter[];
    const blockNumber=name==='OrderPlaced'?1n:2n;
    return {address:p.pool,topics:encodeEventTopics({abi:[event],eventName:name,args:args as never}),data:encodeAbiParameters(inputs,inputs.map(i=>args[i.name!])),blockNumber,blockHash:syntheticBlockHash(blockNumber),transactionHash:name==='OrderPlaced'?HASH:`0x${'22'.repeat(32)}`,transactionIndex:0,logIndex:index,removed:false};
  }
  const placed=()=>log('OrderPlaced',{orderId:42n,placedOrder});
  const fill=(quantity=10_000n)=>log('OrderFilled',{takerOrderId:99n,makerOrderId:42n,quantityFilled:quantity,takerRemainingQuantity:0n,makerRemainingQuantity:20_000n-quantity,fillPrice:BigInt(p.price)},1);
  const receipt={transactionHash:HASH,blockNumber:1n,blockHash:BLOCK,status:'success',logs:[placed()]};
  f.controls.headBlock=2n;f.rpc.getTransaction.mockResolvedValue({...call,from:SYNTHETIC_OWNER,input:call.data});
  f.rpc.getTransactionReceipt.mockResolvedValue(receipt);f.rpc.getLogs.mockImplementation(async()=>[placed()]);
  const prior={...initialExecution(SYNTHETIC_OWNER,50383,p.pool,p.quantity,'testnet'),tx:'submitting' as const};
  return {f,p,placedOrder,log,placed,fill,receipt,prior};
}
describe('R01–R07 real-adapter contract with explicitly synthetic receipt/log transport',()=>{
  it('a known hash with no receipt is submitted, never accepted or filled',async()=>{
    const {f,p,prior}=await fixture();f.rpc.getTransactionReceipt.mockRejectedValue(new Error('Synthetic receipt lag'));
    const observed=await observeOrder(prior,p,HASH,f.connect);expect(observed).toMatchObject({tx:'submitted',order:'unobserved',filled:'0'});
  });
  it('confirmation without a matching order event is unknown order state',async()=>{
    const {f,p,prior,receipt}=await fixture();receipt.logs=[];
    expect(await observeOrder(prior,p,HASH,f.connect)).toMatchObject({tx:'confirmed',order:'unknown',orderId:null});
  });
  it('a reverted chain transaction does not establish an accepted order',async()=>{
    const {f,p,prior,receipt}=await fixture();receipt.status='reverted';receipt.logs=[];
    expect(await observeOrder(prior,p,HASH,f.connect)).toMatchObject({tx:'reverted',order:'unobserved',filled:'0'});
  });
  it('validates receipt/order identity and current resting quantity',async()=>{
    const {f,p,prior,placedOrder}=await fixture();f.reader.getOrderOnchain.mockResolvedValue(placedOrder);
    const result=await observeOrder(prior,p,HASH,f.connect);expect(result).toMatchObject({tx:'confirmed',order:'open',orderId:'42',filled:'0',remaining:'20000',identityVerified:true});
    expect(result.eventRange).toEqual({fromBlock:'1',toBlock:'2'});
  });
  it('partial fill then cancellation retains exact cumulative quantities and does not double-count refresh',async()=>{
    const {f,p,prior,placed,fill,log}=await fixture();const cancel=log('OrderCancelled',{orderId:42n},2);
    f.rpc.getLogs.mockResolvedValue([placed(),fill(),fill(),cancel]);
    const first=reconcile(prior,await observeOrder(prior,p,HASH,f.connect));
    expect(first).toMatchObject({order:'cancelled',filled:'10000',remaining:'10000'});
    const again=reconcile(first,await observeOrder(first,p,HASH,f.connect));expect(again.filled).toBe('10000');
  });
  it('full quantity requires matching lifecycle fill evidence',async()=>{
    const {f,p,prior,placed,fill}=await fixture();
    f.rpc.getLogs.mockImplementation(async()=>[fill(20_000n),placed()]);
    expect(await observeOrder(prior,p,HASH,f.connect)).toMatchObject({order:'filled',filled:'20000',remaining:'0'});
  });
  it('absence in open/current orders never implies a fill',async()=>{
    const {f,p,prior}=await fixture();expect(await observeOrder(prior,p,HASH,f.connect)).toMatchObject({order:'unknown',filled:'0',remaining:'20000'});
  });
  it('reconnect beyond the bounded event range uses a snapshot and discloses the gap',async()=>{
    const {f,p,prior,placedOrder}=await fixture();f.controls.headBlock=4000n;placedOrder.quantityRemaining=10_000n;f.reader.getOrderOnchain.mockResolvedValue(placedOrder);
    const result=await observeOrder(prior,p,HASH,f.connect);expect(result).toMatchObject({order:'partial',filled:'10000',remaining:'10000',coverage:'snapshot_only'});
    expect(result.reason).toContain('history unavailable');expect(f.rpc.getLogs).not.toHaveBeenCalled();
  });
  for(const field of ['owner','pool','calldata','quantity','order-owner','reorg','chain'] as const)it(`rejects mismatched ${field} evidence`,async()=>{
    const {f,p,prior,receipt,placedOrder}=await fixture();
    const call=orderCall(p);
    if(field==='owner')f.rpc.getTransaction.mockResolvedValue({...call,from:zeroAddress,input:call.data});
    if(field==='pool')f.rpc.getTransaction.mockResolvedValue({...call,from:SYNTHETIC_OWNER,to:zeroAddress,input:call.data});
    if(field==='calldata')f.rpc.getTransaction.mockResolvedValue({...call,from:SYNTHETIC_OWNER,input:'0x1234'});
    if(field==='quantity'){placedOrder.fullQuantity=1n;const s=await fixture();receipt.logs=[s.log('OrderPlaced',{orderId:42n,placedOrder})];}
    if(field==='order-owner'){placedOrder.owner=zeroAddress;f.reader.getOrderOnchain.mockResolvedValue(placedOrder);}
    if(field==='reorg')receipt.blockHash=`0x${'cd'.repeat(32)}`;
    if(field==='chain')f.controls.chainId=1;
    await expect(observeOrder(prior,p,HASH,f.connect)).rejects.toThrow();
  });
  it('correlates a lost hash through the persisted tag but refuses ambiguity and absence',async()=>{
    const {f,p,prior}=await fixture();f.reader.getOrders.mockResolvedValue([{placedTxHash:HASH}]);
    expect((await observeOrder(prior,p,null,f.connect)).hash).toBe(HASH);
    expect(f.reader.getOrders).toHaveBeenCalledWith(SYNTHETIC_OWNER,expect.objectContaining({userData:'123',pool:p.pool,limit:2}));
    f.reader.getOrders.mockResolvedValue([{placedTxHash:HASH},{placedTxHash:HASH}]);expect(await observeOrder(prior,p,null,f.connect)).toMatchObject({tx:'unknown',order:'unknown',hash:null});
    f.reader.getOrders.mockResolvedValue([]);expect((await observeOrder(prior,p,null,f.connect)).reason).toContain('No retry');
  });
  it('transport loss preserves request/known quantities and cannot promote a fixture to live',async()=>{
    const {f,p,prior}=await fixture();f.rpc.getTransaction.mockRejectedValue(new Error('SYNTHETIC_SECRET_CANARY'));
    const observed=await observeOrder(prior,p,HASH,f.connect);expect(observed).toMatchObject({tx:'unknown',order:'unknown',hash:null});expect(JSON.stringify(observed)).not.toContain('SECRET_CANARY');
    await expect(observeOrder({...prior,mode:'offline',chainId:0},p,HASH,f.connect)).rejects.toThrow(/identity/);
  });
});
