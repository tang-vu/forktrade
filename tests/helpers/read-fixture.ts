import {vi} from 'vitest';
import {zeroAddress} from 'viem';
import snapshot from '../../evidence/read-only-m4-2026-10-20.json' with {type:'json'};
import type {ReadConnection} from '../../src/integrations/read-connection';

// Explicitly synthetic account/transport fixture. Public metadata is a saved
// public-read snapshot; none of these account results are live evidence.
export const SYNTHETIC_OWNER='0x0000000000000000000000000000000000000001';
export const syntheticBlockHash=(number:bigint)=>`0x${number.toString(16).padStart(64,'0')}`;
export function readFixture() {
  const market={...snapshot.market},system={...snapshot.system},state={...snapshot.state,markPrice:82_000n*10n**18n,markPriceOk:true};
  const max={priceable:true,placeable:true,maxQuantity:100_000n,limitedBy:'collateral',asOfBlock:1n};
  const margin={priceable:true,sufficient:true,hasCollateralForLock:true,meetsInitialMargin:true,voucherBlocked:false,isolationBlocked:false,restrictedBlocked:false,
    lockAmount:2n*10n**18n,feeHeadroom:5n*10n**15n,initialMarginPortion:10n**18n,adverseGapPortion:10n**18n,leverageSurcharge:0n,
    effectiveImfBps:500n,markPrice:82_000n*10n**18n,topUpRequired:0n,ownWalletPull:0n,mainWalletPull:0n,asOfBlock:1n};
  const balance={unlockedCollateralBalance:100n*10n**18n,lockedCollateral:0n,activePerpPools:[],equity:100n*10n**18n,withdrawable:100n*10n**18n,
    imReq:0n,mmReq:0n,cmReq:0n,marginStatus:'Healthy',asOfBlock:1n};
  const controls={chainId:50383,headAgeMs:0,headBlock:1n,allowance:0n,payer:zeroAddress as string,isolated:false,code:'0x6000',ownerCode:'0x',bank:market.marginBank,factoryPool:market.poolAddress,deployed:true,baseDecimals:8,oneBase:100_000_000n,tick:BigInt(market.tickSize),registered:true};
  const forbidden=vi.fn(()=>{throw new Error('Synthetic fixture forbids all signing and transaction methods');});
  const rpc={
    getChainId:vi.fn(async()=>controls.chainId),
    getBlock:vi.fn(async(p?:{blockNumber?:bigint})=>({number:p?.blockNumber??controls.headBlock,hash:syntheticBlockHash(p?.blockNumber??controls.headBlock),timestamp:BigInt(Math.floor((Date.now()-controls.headAgeMs)/1000))})),
    getBalance:vi.fn(async()=>10n**20n),estimateFeesPerGas:vi.fn(async()=>({maxFeePerGas:2n,maxPriorityFeePerGas:1n})),call:vi.fn(async()=>({data:'0x'})),
    getTransaction:vi.fn<(...args:unknown[])=>Promise<unknown>>(async()=>{throw new Error('Synthetic transaction unavailable');}),
    getTransactionReceipt:vi.fn<(...args:unknown[])=>Promise<unknown>>(async()=>{throw new Error('Synthetic receipt unavailable');}),
    getLogs:vi.fn<(...args:unknown[])=>Promise<unknown[]>>(async()=>[]),
    getCode:vi.fn(async({address}:{address:string})=>address===SYNTHETIC_OWNER?controls.ownerCode:controls.code),
    readContract:vi.fn(async(p:{address:string;functionName:string;args?:readonly unknown[]})=>{
      switch(p.functionName) {
        case 'getOrderBookParameters':return [controls.tick,BigInt(market.minQuantity),BigInt(market.lotSize)];
        case 'marginBank':return controls.bank;
        case 'getOneBase':return controls.oneBase;
        case 'decimals':return p.address===market.baseToken?controls.baseDecimals:market.quoteDecimals;
        case 'getPoolForBaseToken':return controls.factoryPool;
        case 'isDeployedByFactory':return controls.deployed;
        case 'isolated':return controls.isolated;
        case 'allowance':return controls.allowance;
        case 'quoteFundingPayer':return controls.payer;
        default:throw new Error(`Unmodelled synthetic read ${p.functionName}`);
      }
    }),sendTransaction:forbidden,sendRawTransaction:forbidden,signMessage:forbidden
  };
  const reader={
    listPerpMarkets:vi.fn(async()=>[market]),getPerpSystemConfig:vi.fn(async()=>system),getPerpState:vi.fn(async()=>state),
    getPerpRiskParams:vi.fn(async()=>({takerFeeBpsTimes1k:1500n,makerFeeBpsTimes1k:-500n,initialMarginBps:500n})),
    getPerpVoucherCampaign:vi.fn(async()=>null),isPerpPoolRegistered:vi.fn(async()=>controls.registered),
    getMaxPerpOrderSize:vi.fn(async()=>max),previewPerpOrderMargin:vi.fn(async()=>margin),getMarginAccount:vi.fn(async()=>balance),
    getPerpPosition:vi.fn(async()=>({size:0n,avgEntryPrice:0n})),getOwnOpenOrdersOnchain:vi.fn(async()=>[] as bigint[]),
    getBookTopsOnchain:vi.fn(async()=>({blockNumber:1n,tops:{[market.id]:{bestBid:'82000000000000000000000',bestAsk:'82001000000000000000000',mid:null}}})),
    getOrderOnchain:vi.fn<(...args:unknown[])=>Promise<unknown>>(async()=>null),getOrder:vi.fn(async()=>null),getOrders:vi.fn<(...args:unknown[])=>Promise<unknown[]>>(async()=>[]),createTrader:forbidden
  };
  const close=vi.fn(async()=>{}),connection={rpc,reader,close} as unknown as ReadConnection;
  return {market,system,state,max,margin,balance,controls,forbidden,rpc,reader,close,connection,connect:()=>connection};
}
