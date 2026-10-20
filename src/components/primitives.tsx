'use client';
import {useState} from 'react';
import Link from 'next/link';
import {GitFork,ArrowUpRight,FlaskConical} from 'lucide-react';
import type {Attempt,PublicCard} from '../server/repository';
import {formatAmount} from '../domain/amounts';
export function Header({children}:{children?:React.ReactNode}) {
  return <header className="header"><Link className="brand" href="/"><span className="brand-mark"><GitFork size={22}/></span>forktrade<span className="wordmark-dot">.</span></Link><nav aria-label="Main"><Link href="/" className="nav-active">Workspace</Link><Link href="/market">Public market</Link><a href="https://app.dreamdex.io/docs/developers/perps-testnet" target="_blank" rel="noreferrer">Protocol docs <ArrowUpRight size={13}/></a></nav><div className="header-actions">{children}<span className="tag testnet">TESTNET</span></div></header>;
}
export function OfflineBanner(){return <div className="offline-banner"><FlaskConical size={15}/><span><strong>Offline lab.</strong> Deterministic synthetic data. No wallet calls, transactions or live execution evidence.</span><span className="banner-pill">PAPER FUNDS</span></div>;}
export function Receipt({attempt,onRefresh,onAttachHash}:{attempt:Attempt;onRefresh?:()=>void;onAttachHash?:(hash:string)=>void}) {
  const [candidate,setCandidate]=useState(''),e=attempt.execution;
  const amount=(raw:string)=>e.baseDecimals!==undefined?`${formatAmount(raw,e.baseDecimals)} BTC`:e.mode==='offline'?`${formatAmount(raw,8)} BTC`:`${raw} raw units (precision unavailable)`;
  return <section className="receipt" aria-label="Execution receipt"><div className="section-title"><span className="eyebrow">{e.mode==='offline'?'SYNTHETIC RECEIPT':'TESTNET RECEIPT'}</span><span className={`status ${e.tx==='unknown'?'amber':''}`}>{e.order.replaceAll('_',' ')}</span></div>
    <div className="receipt-states"><div><span>Transaction</span><strong>{e.tx.replaceAll('_',' ')}</strong></div><div><span>Order</span><strong>{e.order}</strong></div></div>
    <dl className="compact-dl"><div><dt>{e.tx==='unknown'||e.order==='unknown'?'Last observed filled':'Filled'}</dt><dd>{amount(e.filled)}</dd></div><div><dt>Unfilled quantity</dt><dd>{amount(e.remaining)}</dd></div><div><dt>Observed</dt><dd>{new Date(e.observedAt).toLocaleTimeString()}</dd></div></dl>
    <p>{e.reason}</p><p className="muted">{e.coverage==='complete_for_documented_range'?`Lifecycle logs checked for blocks ${e.eventRange?.fromBlock} through ${e.eventRange?.toBlock}.`:'Earlier event history unavailable - snapshot only.'} A transaction confirmation alone does not prove an accepted or filled order.</p>
    <details><summary>Request identity &amp; provenance</summary><p className="mono wrap">{attempt.id}</p><p className="mono wrap">Owner: {e.owner}<br/>Chain: {e.chainId}<br/>Pool: {e.pool}<br/>Hash: {e.hash||'Not verified'}<br/>Order: {e.orderId||'Not observed'}</p><p>{e.source} / {e.block||'No block observed'}</p>{attempt.candidateHash&&!e.hash&&<p className="mono wrap">Unverified candidate: {attempt.candidateHash}</p>}</details>
    {onRefresh&&<button className="button secondary full" onClick={onRefresh}>Refresh status &middot; read only</button>}
    {onAttachHash&&(!e.hash||e.tx==='unknown')&&<details><summary>Check a candidate hash without resending</summary><label className="field"><span>Candidate transaction hash</span><input value={candidate} onChange={event=>setCandidate(event.target.value)} placeholder="0x..."/></label><button className="button secondary full" disabled={!/^0x[a-fA-F0-9]{64}$/.test(candidate)} onClick={()=>onAttachHash(candidate)}>Verify existing transaction</button><p className="fine-print">Must match the exact owner, chain, pool, tag and approved calldata. This cannot send a new order.</p></details>}
  </section>;
}
export function EvidenceCard({card}:{card:PublicCard}) {
  const e=card.evidence,synthetic=card.mode==='offline';
  const evidenceLabel=synthetic?`SYNTHETIC \u00b7 ${e?`${e.tx} / ${e.order}`:'No evidence shared'}`:!e?'No execution evidence shared':e.level==='owner_reported'?'Owner-reported; evidence links not shared':`${e.tx} / order ${e.order}`;
  return <article className="evidence-card"><div className="card-top"><span className="tag">TESTNET / PAPER FUNDS</span><span className="mono">v{card.version}</span></div><p className="eyebrow">{card.lineage?.depth===1?'INDEPENDENT REMIX':'ORIGINAL PLAN'}</p><h2>{card.title||'Title not shared'}</h2>
    {card.rationale&&<p className="rationale">{card.rationale}</p>}
    {card.parameters&&<><div className="card-trade"><span className={card.parameters.side==='buy'?'buy':'sell'}>{card.parameters.side==='buy'?'BUY / LONG':'SELL / SHORT'}</span><strong>{card.parameters.market}</strong></div><div className="trade-numbers"><div><span>Limit price &middot; USDso</span><strong>{card.parameters.price}</strong></div><div><span>Quantity &middot; BTC</span><strong>{card.parameters.quantity}</strong></div></div><div className="card-meta"><span>Limit &middot; GTC</span><span>Reduce-only: off</span></div>{!synthetic&&<p className="fine-print wrap" style={{padding:'12px 28px 0'}}>Chain {card.parameters.chainId} / pool {card.parameters.pool}</p>}</>}
    {card.invalidation&&<div className="invalidation"><span className="eyebrow">INVALIDATION</span><p>{card.invalidation}</p></div>}
    <div className="card-evidence"><span className="status amber">{evidenceLabel}</span><p>{e?`Filled ${formatAmount(e.filled,e.baseDecimals)} BTC / unfilled ${formatAmount(e.remaining,e.baseDecimals)} BTC`:'Owner-reported plan; independently verifiable execution evidence not shared.'}</p><p className="muted">{e?`As of ${new Date(e.observedAt).toLocaleString()} / ${e.coverage==='complete_for_documented_range'?'documented block range checked':'earlier event history unavailable'}`:synthetic?'This card contains no live execution receipt.':'No independently verifiable order evidence shared.'}</p>{!synthetic&&e&&<p>{e.reason}</p>}{card.address&&<p className="mono wrap">Owner: {card.address}</p>}{card.links&&<p><a className="text-button wrap" href={card.links.transaction} target="_blank" rel="noreferrer">Check transaction on testnet explorer <ArrowUpRight size={12}/></a><span className="mono wrap">{card.links.orderId?`Order ${card.links.orderId}`:'Order not observed'}</span></p>}</div>
    <footer className="card-footer"><span><GitFork size={15}/> fork trade, keep your judgment.</span><span>revision {card.revision}</span></footer>
  </article>;
}
