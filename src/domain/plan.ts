import {z} from 'zod';
import {createHash} from 'node:crypto';
import {ceilDiv, formatAmount, parseAmount, scale, UINT256_MAX} from './amounts';
import {invariant} from './errors';
import {GTC_EXPIRY_NS,ORDER_GAS_LIMIT} from '../integrations/network';

export const planInput = z.object({
  title: z.string().trim().min(1).max(100), rationale: z.string().trim().min(1).max(2000),
  invalidation: z.string().trim().min(1).max(1000), riskNotes: z.string().max(1000),
  side: z.enum(['buy','sell']), price: z.string().max(120), quantity: z.string().max(120),
  quantityCap: z.string().max(120), notionalCap: z.string().max(120)
}).strict();
export type PlanInput = z.infer<typeof planInput>;
export type MarketContext = {
  mode: 'offline' | 'readonly' | 'testnet'; chainId: number; network: string;
  pool: string; marginBank: string; collateral: string; symbol: string;
  baseDecimals: number; quoteDecimals: number; tick: string; lot: string; minQuantity: string;
  markPrice: string; maxQuantity: string; availableCollateral: string; feeBps: string; initialMarginBps: string;
  maxNotional: string; owner: string; signer: string; marginMode: string; permissions: boolean;
  priceable: boolean; placeable: boolean; limitedBy: string; observedAt: number; block: string; source: string;
  risk?: {requiredMargin:string;feeReserve:string;initialMarginPortion:string;adverseGapPortion:string;leverageSurcharge:string;
    equity:string;lockedCollateral:string;accountStateHash:string;walletPull:string;mainWalletPull:string;autoFundingPrevented:boolean};
  transaction?: {gas:string;maxFeePerGas:string;maxPriorityFeePerGas:string;nativeBalance:string;nativeDecimals:number;nativeSymbol:string};
  configurationHash?:string;
};
export function marketIdentity(ctx:MarketContext) {
  return {chainId:ctx.chainId,pool:ctx.pool,marginBank:ctx.marginBank,collateral:ctx.collateral,symbol:ctx.symbol,baseDecimals:ctx.baseDecimals,quoteDecimals:ctx.quoteDecimals};
}
export type MarketIdentity=ReturnType<typeof marketIdentity>;
export function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
export function canonical(value: unknown): unknown {
  if(Array.isArray(value)) return value.map(canonical);
  if(value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)]));
  return value;
}
export function validatePlan(input: PlanInput, ctx: MarketContext) {
  invariant(ctx.pool && ctx.marginBank && ctx.collateral && ctx.symbol, 'Market identity is unavailable');
  const price = parseAmount(input.price, ctx.quoteDecimals);
  const quantity = parseAmount(input.quantity, ctx.baseDecimals);
  const quantityCap = parseAmount(input.quantityCap, ctx.baseDecimals);
  const notionalCap = parseAmount(input.notionalCap, ctx.quoteDecimals);
  const tick = BigInt(ctx.tick), lot = BigInt(ctx.lot), minimum = BigInt(ctx.minQuantity);
  invariant(tick > 0n && lot > 0n && minimum > 0n, 'Invalid market tick, lot or minimum');
  invariant(price % tick === 0n, `Price must be a multiple of ${formatAmount(tick, ctx.quoteDecimals)}`);
  invariant(quantity % lot === 0n, `Quantity must be a multiple of ${formatAmount(lot, ctx.baseDecimals)}`);
  invariant(quantity >= minimum, `Quantity must be at least ${formatAmount(minimum, ctx.baseDecimals)}`);
  invariant(quantity <= quantityCap, 'Quantity exceeds your reviewed size cap');
  const notional = ceilDiv(price * quantity, scale(ctx.baseDecimals));
  invariant(notional <= UINT256_MAX && notional <= notionalCap, 'Notional exceeds your reviewed cap');
  return {price:price.toString(), quantity:quantity.toString(), quantityCap:quantityCap.toString(), notionalCap:notionalCap.toString(), notional:notional.toString()};
}
export function normalizePlan(input: PlanInput, ctx: MarketContext): PlanInput {
  const p = validatePlan(input,ctx);
  return {...input, price:formatAmount(p.price,ctx.quoteDecimals), quantity:formatAmount(p.quantity,ctx.baseDecimals), quantityCap:formatAmount(p.quantityCap,ctx.baseDecimals), notionalCap:formatAmount(p.notionalCap,ctx.quoteDecimals)};
}
export function contextBinding(ctx: MarketContext) {
  // Observation time/block are provenance; all economic and identity fields are binding.
  const {observedAt: _time, block: _block, source: _source, ...binding} = ctx;
  void _time; void _block; void _source;
  return hash(binding);
}
export function makePreview(input: PlanInput, ctx: MarketContext, now = Date.now(), userData='0') {
  invariant(now >= ctx.observedAt && now - ctx.observedAt <= 10_000, 'Market/account context is stale; refresh required');
  invariant(ctx.priceable && ctx.placeable && ctx.permissions && BigInt(ctx.markPrice) > 0n, `Risk or sizing unavailable: ${ctx.limitedBy}`);
  invariant(ctx.mode === 'offline' ? ctx.chainId === 0 : ctx.chainId === 50383, 'Wrong network; no mainnet fallback');
  const amounts = validatePlan(input,ctx);
  invariant(BigInt(amounts.quantity) <= BigInt(ctx.maxQuantity), `Account sizing limit: ${ctx.limitedBy}`);
  invariant(BigInt(amounts.notional) <= BigInt(ctx.maxNotional), 'Protocol notional limit exceeded');
  const feeRate = parseAmount(ctx.feeBps,3,false), marginBps = BigInt(ctx.initialMarginBps);
  invariant(feeRate <= 10_000_000n && marginBps > 0n && marginBps <= 10_000n, 'Fee/margin rules unavailable');
  const estimatedFee = ctx.risk?BigInt(ctx.risk.feeReserve):ceilDiv(BigInt(amounts.notional) * feeRate,10_000_000n);
  const estimatedMargin = ctx.risk?BigInt(ctx.risk.requiredMargin):ceilDiv(BigInt(amounts.notional) * marginBps,10_000n);
  invariant(ctx.mode==='offline' || ctx.risk?.autoFundingPrevented,'Verified protocol margin and funding context required');
  invariant(estimatedFee>=0n && estimatedMargin>=0n,'Invalid protocol margin or fee reserve');
  invariant(estimatedFee + estimatedMargin <= BigInt(ctx.availableCollateral), 'Insufficient available collateral for margin and fees');
  const live=ctx.mode!=='offline',tx=ctx.transaction;
  invariant(!live || (tx && tx.gas===ORDER_GAS_LIMIT && BigInt(tx.maxFeePerGas)>0n && BigInt(tx.maxPriorityFeePerGas)>=0n && BigInt(tx.maxPriorityFeePerGas)<=BigInt(tx.maxFeePerGas)), 'Fresh gas/fee context required');
  invariant(!live || (BigInt(userData)>0n && BigInt(userData)<(1n<<64n)), 'A durable per-preview correlation tag is required');
  invariant(!live || BigInt(tx!.nativeBalance)>=BigInt(tx!.gas)*BigInt(tx!.maxFeePerGas),'Native balance cannot cover the reviewed gas cap');
  const payload = {schema:2, mode:ctx.mode, owner:ctx.owner, signer:ctx.signer, chainId:ctx.chainId, pool:ctx.pool,
    marginBank:ctx.marginBank, collateral:ctx.collateral, side:input.side, type:'limit', timeInForce:'GTC',
    price:amounts.price, quantity:amounts.quantity, reduceOnly:false, expireTimestampNs:live?GTC_EXPIRY_NS:'0',userData,
    selfMatchingOption:'cancel_taker', builder:'none', builderFee:'0', transactionValue:'0',
    gas:live?tx!.gas:'0',maxFeePerGas:live?tx!.maxFeePerGas:'0',maxPriorityFeePerGas:live?tx!.maxPriorityFeePerGas:'0',
    quantityCap:amounts.quantityCap, notionalCap:amounts.notionalCap};
  return {payload, payloadHash:hash(payload), contextHash:contextBinding(ctx), context:ctx, amounts,
    estimatedFee:estimatedFee.toString(), estimatedMargin:estimatedMargin.toString(), createdAt:now, expiresAt:now+15_000};
}
export type Preview = ReturnType<typeof makePreview>;
export type OrderPayload=Preview['payload'];
export function verifyPreview(preview: Preview, current: MarketContext, now=Date.now()) {
  invariant(now < preview.expiresAt, 'Preview expired; create a fresh preview',409);
  invariant(now >= current.observedAt && now-current.observedAt <= 10_000, 'Fresh account/market context required',409);
  invariant(contextBinding(current) === preview.contextHash, 'Account, network, metadata or risk context changed; review again',409);
}
export function diffPlans(original: Partial<PlanInput>, remix: PlanInput) {
  return Object.entries(original).filter(([key,value])=>key !== 'riskNotes' && value !== remix[key as keyof PlanInput]).map(([field,before])=>({field,before,after:remix[field as keyof PlanInput]}));
}
