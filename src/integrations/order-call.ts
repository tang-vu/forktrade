import {encodeFunctionData,isAddress,parseAbi,zeroAddress,type Address} from 'viem';
import {invariant} from '../domain/errors';
import type {OrderPayload} from '../domain/plan';
import {EXPECTED_CHAIN,ORDER_GAS_LIMIT,GTC_EXPIRY_NS} from './network';

// Exact fragment from pinned markets-sdk perpPoolWriteAbi. Encoding is tested
// against that SDK ABI. V1 uses self-owned limit/GTC only, with no prerequisites.
export const placeOrderAbi=parseAbi(['function placeOrder(bool isBid,uint64 userData,uint256 price,uint256 quantity,uint64 expireTimestampNs,uint8 orderType,uint8 selfMatchingOption,address builder,uint96 builderFeeBpsTimes1k) payable returns (bool success,uint128 orderId)']);
export function orderCall(payload:OrderPayload) {
  invariant(payload.mode==='testnet' && payload.chainId===EXPECTED_CHAIN,'Only the verified testnet can be signed');
  invariant(isAddress(payload.owner) && isAddress(payload.pool) && payload.signer.toLowerCase()===payload.owner.toLowerCase(),'Unsupported signer/owner or pool');
  invariant(payload.type==='limit' && payload.timeInForce==='GTC' && !payload.reduceOnly && payload.selfMatchingOption==='cancel_taker','Unsupported executable flags');
  invariant(payload.builder==='none' && payload.builderFee==='0' && payload.transactionValue==='0','No builder, value transfer or approval is allowed');
  invariant(payload.expireTimestampNs===GTC_EXPIRY_NS && BigInt(payload.expireTimestampNs)>BigInt(Date.now())*1_000_000n,'Invalid live order expiry');
  invariant(BigInt(payload.price)>0n && BigInt(payload.quantity)>0n && BigInt(payload.userData)>=0n && BigInt(payload.userData)<(1n<<64n),'Invalid order amounts/tag');
  invariant(payload.gas===ORDER_GAS_LIMIT && BigInt(payload.maxFeePerGas)>0n && BigInt(payload.maxPriorityFeePerGas)>=0n && BigInt(payload.maxPriorityFeePerGas)<=BigInt(payload.maxFeePerGas),'Invalid reviewed gas/fee caps');
  return {account:payload.owner as Address,chainId:EXPECTED_CHAIN,to:payload.pool as Address,
    data:encodeFunctionData({abi:placeOrderAbi,functionName:'placeOrder',args:[payload.side==='buy',BigInt(payload.userData),BigInt(payload.price),BigInt(payload.quantity),BigInt(payload.expireTimestampNs),0,0,zeroAddress,0n]}),
    value:0n,gas:BigInt(payload.gas),maxFeePerGas:BigInt(payload.maxFeePerGas),maxPriorityFeePerGas:BigInt(payload.maxPriorityFeePerGas)};
}
