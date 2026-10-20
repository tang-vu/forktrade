import {SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES} from '@somnia-chain/markets-sdk';
import {hidekiTestnet} from '@somnia-chain/markets-sdk/chains';
import {createPublicClient, http, parseAbi} from 'viem';
import {invariant} from '../domain/errors';

export const RPC = 'https://api.hideki2.infra.testnet.somnia.network';
export const INDEXER = 'https://hideki-dev.smk.somnia.host/v1/graphql';
export const EXPECTED_CHAIN = 50383;
export const poolParametersAbi = parseAbi(['function getOrderBookParameters() view returns (uint256 tickSize, uint256 minQuantity, uint256 lotSize)']);
export async function readPublicMarket() {
  // No signer, trader, wallet, funding or write API is constructed here.
  const rpc = createPublicClient({chain:hidekiTestnet, transport:http(RPC,{timeout:15_000,retryCount:0})});
  const chainId = await rpc.getChainId();
  invariant(chainId === EXPECTED_CHAIN, 'RPC network identity mismatch');
  const markets = new SomniaMarkets({chain:hidekiTestnet, indexerUrl:INDEXER, addresses:SOMNIA_HIDEKI_TESTNET_ADDRESSES});
  try {
    const perps = await markets.client.listPerpMarkets();
    const market = perps.find(m=>m.baseSymbol === 'BTC');
    invariant(market, 'BTC perps market is unavailable; do not silently select another');
    const [system, parameters, state, risk, block, poolCode, bankCode, tokenDecimals, baseDecimals, campaign] = await Promise.all([
      markets.client.getPerpSystemConfig(market.marginBank),
      rpc.readContract({address:market.poolAddress,abi:poolParametersAbi,functionName:'getOrderBookParameters'}),
      markets.client.getPerpState(market.poolAddress),
      markets.client.getPerpRiskParams(market.poolAddress),
      rpc.getBlock(), rpc.getCode({address:market.poolAddress}), rpc.getCode({address:market.marginBank}),
      rpc.readContract({address:market.quoteToken,abi:parseAbi(['function decimals() view returns (uint8)']),functionName:'decimals'}),
      rpc.readContract({address:market.baseToken,abi:parseAbi(['function decimals() view returns (uint8)']),functionName:'decimals'}),
      markets.client.getPerpVoucherCampaign(market.marginBank)
    ]);
    invariant(system.fullyWired && system.collateralToken.toLowerCase() === market.quoteToken.toLowerCase(), 'System/collateral configuration mismatch');
    invariant(poolCode && poolCode !== '0x' && bankCode && bankCode !== '0x', 'Required contract bytecode is unavailable');
    invariant(market.baseDecimals === baseDecimals && market.quoteDecimals === tokenDecimals, 'Token/indexer precision mismatch');
    invariant(parameters[0].toString() === market.tickSize && parameters[1].toString() === market.minQuantity && parameters[2].toString() === market.lotSize, 'Pool/indexer tick, lot or minimum mismatch');
    return {mode:'read-only' as const, observedAt:new Date().toISOString(), sdk:'0.32.1', chainId,
      network:'Hideki testnet / DreamDEX app region', rpc:RPC, indexer:INDEXER,
      marketCount:perps.length, market, system, parameters:{tick:parameters[0],minQuantity:parameters[1],lot:parameters[2]},
      state, risk, campaign, block:{number:block.number,hash:block.hash,timestamp:block.timestamp},
      bytecodePresent:{pool:true,marginBank:true},
      accountContext:'Not requested; no wallet connected or authenticated',
      limitations:['Read snapshot only; not an execution or eligibility check','Pool/indexer reads are not an atomic cross-transport snapshot','Account sizing and permissions must be verified for the actual owner before preview','Bounty rules/accepted environment unavailable']};
  } finally {await markets.close();}
}
export function jsonSafe(value:unknown) {return JSON.parse(JSON.stringify(value,(_key,v)=>typeof v === 'bigint'?v.toString():v)) as unknown;}
