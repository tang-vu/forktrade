import {orderBookEventsAbi} from '@somnia-chain/markets-sdk';
import {parseAbi,parseEventLogs,type Hex,type TransactionReceipt,type Log} from 'viem';
import {invariant,DomainError} from '../domain/errors';
import type {OrderPayload} from '../domain/plan';
import type {Execution,Observation} from '../domain/execution';
import {connectReadOnly} from './read-connection';
import {EXPECTED_CHAIN} from './network';
import {orderCall} from './order-call';

// Exact additional event from pinned SDK eventsAbi.js (internal in that SDK).
const amendments=parseAbi(['event OrderAmendedInPlace(uint128 indexed orderId,uint64 userData,uint256 price,uint256 fullQuantity,uint64 expireTimestampNs)']);
const events=[...orderBookEventsAbi,...amendments] as const;
const MAX_EVENT_BLOCKS=3000n;
const same=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
const hashPattern=/^0x[a-fA-F0-9]{64}$/;
function unavailable(prior:Execution,reason:string):Observation {
  return {...prior,authoritative:false,tx:'unknown',order:'unknown',observedAt:Date.now(),coverage:'unavailable',source:'read unavailable; previous facts retained',reason};
}
function decoded(logs:readonly Log[],pool:string) {
  return parseEventLogs({abi:events,logs:logs.filter(log=>same(log.address,pool)),strict:true});
}
function verifyTransaction(tx:{from:string;to:string|null;input:string;value:bigint;gas:bigint;maxFeePerGas?:bigint|null;maxPriorityFeePerGas?:bigint|null},payload:OrderPayload) {
  const expected=orderCall(payload);
  invariant(same(tx.from,payload.owner) && tx.to && same(tx.to,payload.pool) && same(tx.input,expected.data) && tx.value===0n,'Transaction does not match the approved owner/pool/payload');
  invariant(tx.gas===expected.gas && tx.maxFeePerGas!==null && tx.maxFeePerGas!==undefined && tx.maxFeePerGas<=expected.maxFeePerGas && tx.maxPriorityFeePerGas!==null && tx.maxPriorityFeePerGas!==undefined && tx.maxPriorityFeePerGas<=expected.maxPriorityFeePerGas,'Transaction gas/fees exceed or differ from reviewed bounds');
}
function placement(receipt:TransactionReceipt,payload:OrderPayload) {
  const placed=decoded(receipt.logs,payload.pool).filter(log=>log.eventName==='OrderPlaced');
  const matching=placed.filter(log=>{
    const p=log.args.placedOrder;
    return same(p.owner,payload.owner) && p.userData===BigInt(payload.userData) && p.price===BigInt(payload.price) && p.fullQuantity===BigInt(payload.quantity) && p.isBid===(payload.side==='buy') && p.expireTimestampNs===BigInt(payload.expireTimestampNs) && p.orderId===log.args.orderId;
  });
  invariant(matching.length<=1,'Ambiguous placement events for this approved request');
  invariant(placed.length===0 || matching.length===1,'Protocol placement does not match the approved payload');
  return matching[0]?.args.placedOrder;
}
function lifecycle(logs:readonly Log[],payload:OrderPayload,orderId:bigint) {
  let filled=0n,cancelled=false,changed=false;
  const seen=new Set<string>();
  for(const log of decoded(logs,payload.pool)) {
    invariant(!log.removed,'Removed/reorged event cannot establish order evidence');
    const identity=`${log.blockHash}:${log.transactionHash}:${log.logIndex}`;
    if(seen.has(identity))continue;seen.add(identity);
    if(log.eventName==='OrderFilled' && (log.args.makerOrderId===orderId || log.args.takerOrderId===orderId)) {
      invariant(log.args.quantityFilled>0n && (payload.side==='buy'?log.args.fillPrice<=BigInt(payload.price):log.args.fillPrice>=BigInt(payload.price)),'Fill observation violates the approved order bounds');
      filled+=log.args.quantityFilled;
    } else if('orderId' in log.args && log.args.orderId===orderId) {
      if(['OrderCancelled','OrderExpired','OrderCancelledSelfMatch','MakerOrderCancelledExceedsPosition','OrderCancelledPreFill'].includes(log.eventName))cancelled=true;
      if(log.eventName==='OrderReduced' || log.eventName==='OrderAmendedInPlace')changed=true;
    }
  }
  invariant(filled<=BigInt(payload.quantity),'Observed fills exceed original quantity');
  return {filled,cancelled,changed};
}

// Reconnect always rechecks the receipt and an authoritative current order.
// A missing open order alone never proves a fill or cancellation.
export async function observeOrder(prior:Execution,payload:OrderPayload,candidateHash?:string|null,connect=connectReadOnly):Promise<Observation> {
  invariant(prior.mode==='testnet' && prior.chainId===EXPECTED_CHAIN && payload.mode==='testnet' && payload.chainId===EXPECTED_CHAIN && same(prior.owner,payload.owner) && same(prior.pool,payload.pool) && prior.quantity===payload.quantity,'Execution/payload identity mismatch');
  invariant(!prior.hash || !candidateHash || same(prior.hash,candidateHash),'A known transaction cannot be replaced by an arbitrary hash');
  const connection=connect(),{rpc,reader}=connection;
  let verifiedHash=prior.hash;
  try {
    invariant(await rpc.getChainId()===EXPECTED_CHAIN,'Observation RPC is on another chain');
    let hash=prior.hash || candidateHash;
    if(!hash) {
      // The tag is correlation only, never a protocol uniqueness or retry guarantee.
      const matches=await reader.getOrders(payload.owner,{pool:payload.pool,userData:payload.userData,limit:2});
      if(matches.length!==1)return unavailable(prior,matches.length?'Ambiguous correlation; inspect the existing request. No retry.':'No correlated indexed order yet; outcome remains unknown. No retry.');
      hash=matches[0].placedTxHash;
    }
    invariant(hashPattern.test(hash),'Malformed transaction identity');
    const tx=await rpc.getTransaction({hash:hash as Hex});verifyTransaction(tx,payload);verifiedHash=hash;
    const base:Observation={...prior,hash,authoritative:true,identityVerified:true,tx:'submitted',order:'unobserved',observedAt:Date.now(),source:'verified Hideki transaction input',coverage:'unavailable',reason:'Transaction identity verified; no receipt/order conclusion',submittedAt:prior.submittedAt||Date.now()};
    let receipt:TransactionReceipt;
    try {receipt=await rpc.getTransactionReceipt({hash:hash as Hex});}
    catch{return {...base,tx:prior.tx==='confirmed'?'unknown':'submitted',order:prior.tx==='confirmed'?'unknown':'unobserved',reason:'Receipt unavailable; refresh this request, never resend'};}
    const [receiptBlock,head]=await Promise.all([rpc.getBlock({blockNumber:receipt.blockNumber}),rpc.getBlock()]);
    invariant(same(receipt.transactionHash,hash) && same(receiptBlock.hash,receipt.blockHash),'Receipt block/hash is inconsistent or reorged');
    invariant(head.number!==null && head.hash && head.number>=receipt.blockNumber,'Observation head is inconsistent');
    invariant(head.timestamp*1000n<=BigInt(Date.now()+5000) && BigInt(Date.now())-head.timestamp*1000n<=30_000n,'Observation head is stale');
    const confirmed={...base,tx:receipt.status==='success'?'confirmed' as const:'reverted' as const,block:head.hash,observedBlockNumber:head.number.toString(),receiptBlockNumber:receipt.blockNumber.toString(),receiptBlockHash:receipt.blockHash,confirmedAt:prior.confirmedAt||Number(receiptBlock.timestamp)*1000};
    if(receipt.status!=='success')return {...confirmed,order:'unobserved',filled:'0',remaining:payload.quantity,coverage:'snapshot_only',reason:'Chain transaction reverted; no accepted order established'};
    const placed=placement(receipt,payload);
    if(!placed)return {...confirmed,order:'unknown',reason:'Chain confirmed, but no matching protocol placement was observed; not an accepted/filled claim'};
    invariant(!prior.orderId || BigInt(prior.orderId)===placed.orderId,'Protocol order identity differs from the persisted request');
    const orderId=placed.orderId,quantity=BigInt(payload.quantity);
    const observation={...confirmed,orderId:orderId.toString()};
    const current=await reader.getOrderOnchain(payload.pool as `0x${string}`,orderId,{blockNumber:head.number});
    if(current)invariant(current.orderId===orderId && same(current.owner,payload.owner) && current.isBid===(payload.side==='buy') && current.userData===BigInt(payload.userData),'Current order snapshot belongs to another identity');
    let facts:ReturnType<typeof lifecycle>|null=null,coverage:Execution['coverage']='snapshot_only';
    if(head.number-receipt.blockNumber<=MAX_EVENT_BLOCKS) {
      try {
        const logs=await rpc.getLogs({address:payload.pool as `0x${string}`,events,fromBlock:receipt.blockNumber,toBlock:head.number});
        const receiptKeys=new Set(receipt.logs.map(log=>`${log.logIndex}:${log.data}:${log.topics.join(',')}`));
        invariant(logs.every(log=>!same(log.transactionHash||'',hash!)||receiptKeys.has(`${log.logIndex}:${log.data}:${log.topics.join(',')}`)),'Lifecycle logs conflict with the verified receipt');
        facts=lifecycle(logs,payload,orderId);coverage='complete_for_documented_range';
      } catch(error){if(error instanceof DomainError)throw error;}
    }
    const canonicalHead=await rpc.getBlock({blockNumber:head.number});
    invariant(same(canonicalHead.hash,head.hash),'Chain changed during reconciliation; confidence withdrawn');
    if(facts?.changed || current&&(current.fullQuantity!==quantity || current.price!==BigInt(payload.price) || current.expireTimestampNs!==BigInt(payload.expireTimestampNs)))return {...observation,order:'unknown',coverage:'snapshot_only',reason:'Order was reduced/amended outside the approved payload. Inspect the existing order; no resubmission.'};
    const initial=lifecycle(receipt.logs,payload,orderId);
    invariant(!facts||facts.filled>=initial.filled,'Lifecycle logs omit known receipt fills');
    let filled=facts?facts.filled:initial.filled;
    if(current && !facts)filled=quantity-current.quantityRemaining;
    invariant(filled>=0n && filled<=quantity,'Invalid cumulative order quantities');
    if(current)invariant(current.quantityRemaining+filled===quantity && current.quantityRemaining>0n,'Current snapshot and event quantities conflict');
    const remaining=quantity-filled;
    const order=filled===quantity?'filled':(facts?.cancelled||initial.cancelled)?'cancelled':current?(filled>0n?'partial':'open'):'unknown';
    return {...observation,order,filled:filled.toString(),remaining:remaining.toString(),coverage,
      ...(facts?{eventRange:{fromBlock:receipt.blockNumber.toString(),toBlock:head.number.toString()}}:{}),
      reason:order==='unknown'?'Order absent from current snapshot; absence does not prove a fill or cancellation. Earlier event history unavailable.':coverage==='snapshot_only'?'Authoritative current/receipt snapshot; earlier event history unavailable.':'Verified receipt and current order with lifecycle logs for the documented block range.'};
  } catch(error) {
    if(error instanceof DomainError)throw error;
    return {...unavailable({...prior,hash:verifiedHash},'Observation transport unavailable. Known request/hash retained; no automatic retry.'),authoritative:Boolean(verifiedHash&&verifiedHash!==prior.hash)};
  } finally {await connection.close();}
}
