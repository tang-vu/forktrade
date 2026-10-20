import {SOMNIA_HIDEKI_TESTNET_ADDRESSES} from '@somnia-chain/markets-sdk';
import {parseAbi,zeroAddress,isAddress,type Address} from 'viem';
import {invariant} from '../domain/errors';
import {formatAmount,scale,ceilDiv} from '../domain/amounts';
import {hash,type MarketContext,type PlanInput,validatePlan} from '../domain/plan';
import {connectReadOnly,type ReadConnection} from './read-connection';
import {RPC,INDEXER,EXPECTED_CHAIN,NETWORK_LABEL} from './network';

// Minimal fragments verified against markets-sdk@0.32.1 readsAbi.js.
export const poolParametersAbi=parseAbi(['function getOrderBookParameters() view returns (uint256 tickSize, uint256 minQuantity, uint256 lotSize)']);
export const identityAbi=parseAbi(['function marginBank() view returns (address)','function getOneBase() view returns (uint256)']);
export const factoryAbi=parseAbi(['function getPoolForBaseToken(address baseToken) view returns (address)','function isDeployedByFactory(address perpPool) view returns (bool)']);
export const bankSafetyAbi=parseAbi(['function isolated(address account) view returns (bool)','function quoteFundingPayer(address account) view returns (address)']);
export const tokenAbi=parseAbi(['function decimals() view returns (uint8)','function allowance(address owner,address spender) view returns (uint256)']);
const same=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
export type JsonSafe<T>=T extends bigint?string:T extends readonly (infer U)[]?JsonSafe<U>[]:T extends object?{[K in keyof T]:JsonSafe<T[K]>}:T;
export function jsonSafe<T>(value:T):JsonSafe<T>{return JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='bigint'?v.toString():v)) as JsonSafe<T>;}

export async function verifiedMarket(connection:ReadConnection) {
  const startedAt=Date.now(),{rpc,reader}=connection;
  invariant(await rpc.getChainId()===EXPECTED_CHAIN,'RPC network identity mismatch');
  const markets=await reader.listPerpMarkets();
  const candidates=markets.filter(m=>m.baseSymbol==='BTC');
  invariant(candidates.length===1,'BTC market identity is missing or ambiguous; no silent market substitution');
  const market=candidates[0],bootstrap=SOMNIA_HIDEKI_TESTNET_ADDRESSES;
  invariant(market.chainId===EXPECTED_CHAIN && bootstrap.marginBank && same(market.marginBank,bootstrap.marginBank),'Market chain/bank differs from the pinned official deployment');
  const block=await rpc.getBlock();
  invariant(block.number!==null && block.hash && block.timestamp*1000n<=BigInt(Date.now()+5000) && BigInt(Date.now())-block.timestamp*1000n<=30_000n,'RPC head is unavailable or stale');
  const pinned={blockNumber:block.number};
  const [system,parameters,state,risk,campaign,bank,poolCode,bankCode,quoteDecimals,baseDecimals,oneBase,registered,book]=await Promise.all([
    reader.getPerpSystemConfig(market.marginBank),
    rpc.readContract({address:market.poolAddress,abi:poolParametersAbi,functionName:'getOrderBookParameters',...pinned}),
    reader.getPerpState(market.poolAddress),reader.getPerpRiskParams(market.poolAddress),reader.getPerpVoucherCampaign(market.marginBank),
    rpc.readContract({address:market.poolAddress,abi:identityAbi,functionName:'marginBank',...pinned}),
    rpc.getCode({address:market.poolAddress,...pinned}),rpc.getCode({address:market.marginBank,...pinned}),
    rpc.readContract({address:market.quoteToken,abi:tokenAbi,functionName:'decimals',...pinned}),
    rpc.readContract({address:market.baseToken,abi:tokenAbi,functionName:'decimals',...pinned}),
    rpc.readContract({address:market.poolAddress,abi:identityAbi,functionName:'getOneBase',...pinned}),
    reader.isPerpPoolRegistered({marginBank:market.marginBank,pool:market.poolAddress}),
    reader.getBookTopsOnchain([{id:market.id,poolAddress:market.poolAddress}],pinned)
  ]);
  invariant(system.fullyWired && same(system.marginBank,market.marginBank) && same(bank,market.marginBank) && same(system.collateralToken,market.quoteToken),'System/collateral configuration mismatch');
  invariant(bootstrap.perpPoolFactory && same(system.perpPoolFactory,bootstrap.perpPoolFactory) && system.feeRecipient!==zeroAddress,'Untrusted factory or unavailable fee configuration');
  invariant(poolCode && poolCode!=='0x' && bankCode && bankCode!=='0x' && registered,'Required contracts or pool registration unavailable');
  invariant(market.baseDecimals===baseDecimals && market.quoteDecimals===quoteDecimals && oneBase===scale(baseDecimals),'Token/pool/indexer precision mismatch');
  invariant(parameters[0].toString()===market.tickSize && parameters[1].toString()===market.minQuantity && parameters[2].toString()===market.lotSize,'Pool/indexer tick, lot or minimum mismatch');
  const [factoryPool,deployed,factoryCode]=await Promise.all([
    rpc.readContract({address:system.perpPoolFactory,abi:factoryAbi,functionName:'getPoolForBaseToken',args:[market.baseToken],...pinned}),
    rpc.readContract({address:system.perpPoolFactory,abi:factoryAbi,functionName:'isDeployedByFactory',args:[market.poolAddress],...pinned}),
    rpc.getCode({address:system.perpPoolFactory,...pinned})
  ]);
  invariant(same(factoryPool,market.poolAddress) && deployed && factoryCode && factoryCode!=='0x','Market is not deployed by the verified factory');
  return {startedAt,observedAt:Date.now(),chainId:EXPECTED_CHAIN,marketCount:markets.length,market,system,parameters:{tick:parameters[0],minQuantity:parameters[1],lot:parameters[2]},state,risk,campaign,
    block:{number:block.number,hash:block.hash,timestamp:block.timestamp},book,
    bytecodePresent:{pool:true,marginBank:true,factory:true},contractCodeHashes:{pool:hash(poolCode),marginBank:hash(bankCode),factory:hash(factoryCode)}};
}
export type VerifiedMarket=Awaited<ReturnType<typeof verifiedMarket>>;
export async function readPublicMarket(connect=connectReadOnly) {
  const connection=connect();
  try {
    const snapshot=await verifiedMarket(connection);
    return {mode:'read-only' as const,sdk:'0.32.1',network:NETWORK_LABEL,rpc:RPC,indexer:INDEXER,...snapshot,
      accountContext:'Not requested; no wallet connected or authenticated',
      limitations:['Public read snapshot only; no execution or eligibility claim','SDK and HTTP reads are individually sourced, not one atomic cross-transport snapshot','Account risk and permissions must be refreshed for the actual owner','Bounty accepted environment remains unverified']};
  } finally {await connection.close();}
}

export function authoringContext(snapshot:VerifiedMarket,owner:string):MarketContext {
  const {market:m,parameters:p}=snapshot;
  return {mode:'testnet',chainId:EXPECTED_CHAIN,network:NETWORK_LABEL,pool:m.poolAddress,marginBank:m.marginBank,collateral:m.quoteToken,
    symbol:'BTC / USDso',baseDecimals:m.baseDecimals,quoteDecimals:m.quoteDecimals,tick:p.tick.toString(),lot:p.lot.toString(),minQuantity:p.minQuantity.toString(),
    markPrice:snapshot.state.markPrice.toString(),maxQuantity:'0',availableCollateral:'0',feeBps:'0',initialMarginBps:'0',maxNotional:'0',
    owner,signer:owner,marginMode:'unavailable',permissions:false,priceable:false,placeable:false,limitedBy:'Account snapshot required',
    observedAt:snapshot.startedAt,block:snapshot.block.hash,source:'verified Hideki RPC + official SDK read methods',
    configurationHash:hash(jsonSafe({system:snapshot.system,risk:snapshot.risk,oracle:snapshot.state.oracle,code:snapshot.contractCodeHashes}))};
}
// Callers must derive owner from the authenticated session, never request JSON.
export async function readAccountContext(owner:string,input:PlanInput,connect=connectReadOnly):Promise<MarketContext> {
  invariant(isAddress(owner),'An authenticated EOA owner is required');
  const account=owner as Address,connection=connect(),{rpc,reader}=connection;
  try {
    const snapshot=await verifiedMarket(connection),base=authoringContext(snapshot,owner),m=snapshot.market;
    const amounts=validatePlan(input,base),price=BigInt(amounts.price),quantity=BigInt(amounts.quantity);
    invariant(snapshot.state.markPriceOk && snapshot.state.markPrice>0n,'Live mark price unavailable');
    const params={pool:m.poolAddress,marginBank:m.marginBank,account,isBid:input.side==='buy',price,autoPull:false,builderFeeBpsTimes1k:0n};
    const [max,margin,balance,position,openOrders,isolated,allowance,payer,code]=await Promise.all([
      reader.getMaxPerpOrderSize(params),reader.previewPerpOrderMargin({...params,quantity}),reader.getMarginAccount(m.marginBank,account),
      reader.getPerpPosition({pool:m.poolAddress,marginBank:m.marginBank,account}),reader.getOwnOpenOrdersOnchain(m.poolAddress,account),
      rpc.readContract({address:m.marginBank,abi:bankSafetyAbi,functionName:'isolated',args:[account]}),
      rpc.readContract({address:m.quoteToken,abi:tokenAbi,functionName:'allowance',args:[account,m.marginBank]}),
      rpc.readContract({address:m.marginBank,abi:bankSafetyAbi,functionName:'quoteFundingPayer',args:[account]}),rpc.getCode({address:account})
    ]);
    invariant(!code || code==='0x','Contract wallets/delegated EOAs are unsupported in v1');
    invariant(max.priceable && margin.priceable,'Mark/risk snapshot is unpriceable');
    invariant(max.placeable && quantity<=max.maxQuantity,`Account sizing limit: ${max.limitedBy}`);
    invariant(margin.sufficient && margin.hasCollateralForLock && margin.meetsInitialMargin,'Protocol margin check failed; no implicit funding');
    invariant(!margin.voucherBlocked && !margin.isolationBlocked && !margin.restrictedBlocked,'Voucher, isolated-market or close-only restriction');
    invariant(allowance===0n && same(payer,zeroAddress),'v1 requires pre-funded bank collateral, zero bank allowance and no linked funding payer; wallet auto-pull is not approved');
    invariant(margin.topUpRequired===0n && margin.ownWalletPull===0n && margin.mainWalletPull===0n,'Automatic wallet funding is outside this order approval');
    invariant(openOrders.length<=1000,'Open-order snapshot exceeds supported bounds');
    const feeRate=snapshot.risk.takerFeeBpsTimes1k>snapshot.risk.makerFeeBpsTimes1k?snapshot.risk.takerFeeBpsTimes1k:snapshot.risk.makerFeeBpsTimes1k;
    const risk={requiredMargin:margin.lockAmount.toString(),feeReserve:margin.feeHeadroom.toString(),initialMarginPortion:margin.initialMarginPortion.toString(),
      adverseGapPortion:margin.adverseGapPortion.toString(),leverageSurcharge:margin.leverageSurcharge.toString(),equity:balance.equity.toString(),lockedCollateral:balance.lockedCollateral.toString(),
      accountStateHash:hash(jsonSafe({balance:{...balance,asOfBlock:undefined},position,openOrders:openOrders.map(String).sort(),isolated,allowance,payer})),
      walletPull:'0',mainWalletPull:'0',autoFundingPrevented:true};
    const context:MarketContext={...base,priceable:true,placeable:true,permissions:true,limitedBy:max.limitedBy,
      maxQuantity:max.maxQuantity.toString(),maxNotional:ceilDiv(max.maxQuantity*price,scale(m.baseDecimals)).toString(),
      availableCollateral:balance.unlockedCollateralBalance.toString(),feeBps:formatAmount(feeRate>0n?feeRate:0n,3),initialMarginBps:margin.effectiveImfBps.toString(),
      markPrice:margin.markPrice.toString(),marginMode:isolated?'isolated':'cross',risk};
    invariant(Date.now()-snapshot.startedAt<=10_000,'Account/market read took too long; refresh');
    invariant(BigInt(context.availableCollateral)>=BigInt(risk.requiredMargin)+BigInt(risk.feeReserve),'Collateral cannot cover protocol lock and fee reserve');
    return context;
  } finally {await connection.close();}
}
