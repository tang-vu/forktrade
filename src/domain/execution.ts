import {invariant} from './errors';
export type TransactionState = 'not_submitted'|'submitting'|'submitted'|'confirmed'|'reverted'|'unknown';
export type OrderState = 'unobserved'|'accepted'|'open'|'partial'|'filled'|'cancelled'|'rejected'|'unknown';
export type Execution = {
  mode:'offline'|'testnet'; owner:string; chainId:number; pool:string; quantity:string;
  tx:TransactionState; order:OrderState; filled:string; remaining:string;
  hash:string|null; orderId:string|null; observedAt:number; block:string|null;
  source:string; coverage:'snapshot_only'|'unavailable'|'complete_for_documented_range'; reason:string;
  approvedAt?:number;submissionStartedAt?:number;submittedAt?:number;confirmedAt?:number;
  receiptBlockNumber?:string;receiptBlockHash?:string;observedBlockNumber?:string;
  eventRange?:{fromBlock:string;toBlock:string};
  identityVerified?:boolean;
  baseDecimals?:number;quoteDecimals?:number;
};
export type Observation = Execution & {authoritative:boolean};
export function reconcile(previous:Execution, next:Observation): Execution {
  invariant(next.authoritative || (next.tx==='unknown' && next.order==='unknown' && next.filled===previous.filled && next.remaining===previous.remaining && next.hash===previous.hash && next.orderId===previous.orderId), 'Observation is not authoritative');
  invariant(next.mode === previous.mode && next.owner === previous.owner && next.chainId === previous.chainId && next.pool === previous.pool && next.quantity === previous.quantity, 'Observation identity mismatch');
  invariant(!previous.orderId || next.orderId === previous.orderId, 'Order identity mismatch');
  invariant(!previous.hash || next.hash === previous.hash, 'Transaction identity mismatch; reconcile replacement separately');
  invariant(next.observedAt >= previous.observedAt, 'Outdated observation');
  const filled=BigInt(next.filled), remaining=BigInt(next.remaining), quantity=BigInt(previous.quantity);
  invariant(filled >= 0n && remaining >= 0n && filled+remaining === quantity, 'Inconsistent fill/remainder quantities');
  invariant(next.order !== 'filled' || (filled === quantity && remaining === 0n), 'A filled order requires verified full quantity');
  invariant(next.order !== 'partial' || (filled > 0n && remaining > 0n), 'Partial state requires a partial quantity');
  invariant(next.order !== 'open' || filled === 0n, 'Open state cannot conceal a partial fill');
  invariant(next.mode === 'offline' || !['accepted','open','partial','filled','cancelled'].includes(next.order) || Boolean(next.orderId && next.block), 'Order evidence lacks identity/block');
  // Quantities are cumulative snapshots, never added together. Corrections remain visible.
  const corrected=filled < BigInt(previous.filled) || (previous.tx === 'confirmed' && next.tx !== 'confirmed');
  const {authoritative:_authoritative,...result}=next; void _authoritative;
  return {...result, reason:corrected?`Observation corrected; earlier evidence retained. ${next.reason}`:next.reason};
}
export function initialExecution(owner:string,chainId:number,pool:string,quantity:string,mode:'offline'|'testnet'):Execution {
  return {mode,owner,chainId,pool,quantity,tx:'not_submitted',order:'unobserved',filled:'0',remaining:quantity,
    hash:null,orderId:null,observedAt:Date.now(),block:null,source:mode === 'offline'?'synthetic fixture':'awaiting authoritative observation',coverage:'unavailable',reason:'No submission observed'};
}
export type OfflineScenario='open'|'partial_cancelled'|'rejected'|'unknown'|'wallet_rejected'|'reverted';
export function simulate(previous:Execution, scenario:OfflineScenario):Execution {
  invariant(previous.mode === 'offline' && previous.chainId === 0, 'Fixtures cannot become live execution evidence');
  const base:Observation={...previous,authoritative:true,observedAt:Date.now(),coverage:'snapshot_only',source:'synthetic offline scenario',reason:'Synthetic only — no transaction was sent',block:'synthetic-snapshot'};
  switch(scenario) {
    case 'open': return reconcile(previous,{...base,tx:'confirmed',order:'open',orderId:'synthetic-order'});
    case 'partial_cancelled': {const fill=BigInt(previous.quantity)/2n; return reconcile(previous,{...base,tx:'confirmed',order:'cancelled',filled:fill.toString(),remaining:(BigInt(previous.quantity)-fill).toString(),orderId:'synthetic-order',reason:'Synthetic partial fill; remainder cancelled. Remaining means unfilled quantity, not a live open order.'});}
    case 'rejected': return reconcile(previous,{...base,tx:'confirmed',order:'rejected',reason:'Synthetic protocol rejection'});
    case 'reverted': return reconcile(previous,{...base,tx:'reverted',order:'unobserved',reason:'Synthetic chain revert; no accepted order observed'});
    case 'wallet_rejected': return reconcile(previous,{...base,tx:'not_submitted',order:'unobserved',reason:'Synthetic wallet rejection before broadcast'});
    case 'unknown': return reconcile(previous,{...base,tx:'unknown',order:'unknown',coverage:'unavailable',reason:'Synthetic interrupted submission. Existing request retained; automatic retry blocked.'});
  }
}
