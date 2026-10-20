import type {MarketContext} from '../domain/plan';
export function offlineContext(owner: string, now=Date.now()): MarketContext {
  return {mode:'offline',chainId:0,network:'Offline synthetic network',pool:'synthetic:btc-usdso',marginBank:'synthetic:margin-bank',
    collateral:'synthetic:usdso',symbol:'BTC / USDso',baseDecimals:8,quoteDecimals:18,
    tick:'100000000000000000',lot:'1000',minQuantity:'13000',markPrice:'82000000000000000000000',
    maxQuantity:'100000',availableCollateral:'1000000000000000000000',feeBps:'5',initialMarginBps:'500',
    maxNotional:'100000000000000000000',owner,signer:owner,marginMode:'synthetic cross',permissions:true,
    priceable:true,placeable:true,limitedBy:'offline demonstration cap',observedAt:now,block:'synthetic-snapshot',source:'deterministic offline fixture'};
}
