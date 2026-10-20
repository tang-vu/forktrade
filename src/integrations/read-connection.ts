import {SomniaMarkets,SOMNIA_HIDEKI_TESTNET_ADDRESSES,type SomniaMarketsClient} from '@somnia-chain/markets-sdk';
import {hidekiTestnet} from '@somnia-chain/markets-sdk/chains';
import {createPublicClient,http} from 'viem';
import {RPC,INDEXER} from './network';

// This interface has no trader, executor, key, wallet or signing capability.
export type Reader=Pick<SomniaMarketsClient,
  'listPerpMarkets'|'getPerpSystemConfig'|'getPerpState'|'getPerpRiskParams'|
  'getPerpVoucherCampaign'|'isPerpPoolRegistered'|'getMaxPerpOrderSize'|
  'previewPerpOrderMargin'|'getMarginAccount'|'getPerpPosition'|
  'getOwnOpenOrdersOnchain'|'getBookTopsOnchain'|'getOrderOnchain'|'getOrder'>;
function publicRpc(){return createPublicClient({chain:hidekiTestnet,transport:http(RPC,{timeout:15_000,retryCount:0})});}
export type ReadConnection={rpc:ReturnType<typeof publicRpc>;reader:Reader;close:()=>Promise<void>};
export function connectReadOnly():ReadConnection {
  const exchange=new SomniaMarkets({chain:hidekiTestnet,indexerUrl:INDEXER,addresses:SOMNIA_HIDEKI_TESTNET_ADDRESSES});
  const client=exchange.client;
  const reader:Reader={
    listPerpMarkets:client.listPerpMarkets.bind(client),getPerpSystemConfig:client.getPerpSystemConfig.bind(client),
    getPerpState:client.getPerpState.bind(client),getPerpRiskParams:client.getPerpRiskParams.bind(client),
    getPerpVoucherCampaign:client.getPerpVoucherCampaign.bind(client),isPerpPoolRegistered:client.isPerpPoolRegistered.bind(client),
    getMaxPerpOrderSize:client.getMaxPerpOrderSize.bind(client),previewPerpOrderMargin:client.previewPerpOrderMargin.bind(client),
    getMarginAccount:client.getMarginAccount.bind(client),getPerpPosition:client.getPerpPosition.bind(client),
    getOwnOpenOrdersOnchain:client.getOwnOpenOrdersOnchain.bind(client),getBookTopsOnchain:client.getBookTopsOnchain.bind(client),
    getOrderOnchain:client.getOrderOnchain.bind(client),getOrder:client.getOrder.bind(client)
  };
  return {rpc:publicRpc(),reader,close:()=>exchange.close()};
}
