import {hidekiTestnet} from '@somnia-chain/markets-sdk/chains';
import type {MarketContext,PlanInput} from '../domain/plan';
import {makePreview} from '../domain/plan';
import {invariant} from '../domain/errors';
import {readAccountContext} from './read-context';
import {connectReadOnly} from './read-connection';
import {EXPECTED_CHAIN,ORDER_GAS_LIMIT} from './network';
import {orderCall} from './order-call';

export async function prepareLiveContext(owner:string,input:PlanInput,userData:string,approvedTx?:MarketContext['transaction'],connect=connectReadOnly):Promise<MarketContext> {
  const context=await readAccountContext(owner,input,connect),connection=connect();
  try {
    const {rpc}=connection;
    invariant(await rpc.getChainId()===EXPECTED_CHAIN,'RPC chain changed during preview');
    const [fees,nativeBalance]=await Promise.all([rpc.estimateFeesPerGas(),rpc.getBalance({address:owner as `0x${string}`})]);
    invariant(fees.maxFeePerGas && fees.maxPriorityFeePerGas!==undefined,'EIP-1559 fee estimate unavailable');
    const transaction=approvedTx?{...approvedTx,nativeBalance:nativeBalance.toString()}:{gas:ORDER_GAS_LIMIT,maxFeePerGas:fees.maxFeePerGas.toString(),maxPriorityFeePerGas:fees.maxPriorityFeePerGas.toString(),nativeBalance:nativeBalance.toString(),nativeDecimals:hidekiTestnet.nativeCurrency.decimals,nativeSymbol:hidekiTestnet.nativeCurrency.symbol};
    invariant(fees.maxFeePerGas<=BigInt(transaction.maxFeePerGas) && fees.maxPriorityFeePerGas<=BigInt(transaction.maxPriorityFeePerGas),'Gas fee conditions exceed reviewed caps; preview again');
    const ready={...context,transaction};
    // Simulate the exact final call. The server persists this tag with the preview.
    const call=orderCall(makePreview(input,ready,Date.now(),userData).payload);
    await rpc.call({account:call.account,to:call.to,data:call.data,value:call.value,gas:call.gas,maxFeePerGas:call.maxFeePerGas,maxPriorityFeePerGas:call.maxPriorityFeePerGas});
    invariant(Date.now()-context.observedAt<=10_000,'Live simulation/context is stale; preview again');
    return ready;
  } finally {await connection.close();}
}
