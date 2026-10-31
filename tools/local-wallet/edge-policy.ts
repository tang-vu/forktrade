import {z} from 'zod';
import {getAddress,isAddress} from 'viem';
import {parseAmount} from '../../src/domain/amounts';
import {invariant} from '../../src/domain/errors';
import type {Preview} from '../../src/domain/plan';
import type {VerifiedMarket} from '../../src/integrations/read-context';
import {localOrigin} from './policy';

export const edgeScopeSchema=z.object({
  schema:z.literal(1),id:z.string().uuid(),origin:z.string(),chainId:z.literal(50383),owner:z.string().refine(isAddress),
  planId:z.string().uuid(),versionId:z.string().uuid(),version:z.number().int().positive(),side:z.enum(['buy','sell']),
  price:z.string(),quantity:z.string(),quantityCap:z.string(),notionalCap:z.string(),
  maxNativeCost:z.literal('0.1'),expiresAt:z.number().int().positive(),
  authorization:z.literal('Explicit user-directed exact testnet order in Edge; no other order or authority')
}).strict();
export type EdgeScope=z.infer<typeof edgeScopeSchema>;
export const edgeRequestSchema=z.object({id:z.string().uuid(),scopeId:z.string().uuid(),method:z.enum(['personal_sign','eth_sendTransaction','eth_getBlockByNumber']),params:z.unknown()}).strict();
export function verifyEdgeScope(scope:EdgeScope,owner:string,now=Date.now()) {
  invariant(scope.schema===1&&scope.chainId===50383&&getAddress(scope.owner)===getAddress(owner),'Edge wallet owner/network differs');
  localOrigin(scope.origin);
  invariant(scope.expiresAt>now&&scope.expiresAt-now<=15*60_000,'Edge wallet session expired or duration exceeds 15 minutes');
}
export function verifyEdgeOrder(scope:EdgeScope,preview:Preview&{versionId:string},planId:string,market:VerifiedMarket) {
  verifyEdgeScope(scope,preview.payload.owner);
  const p=preview.payload,m=market.market;
  invariant(planId===scope.planId&&preview.versionId===scope.versionId,'Edge wallet request is not the authorized plan/version');
  invariant(p.mode==='testnet'&&p.side===scope.side&&p.type==='limit'&&p.timeInForce==='GTC'&&!p.reduceOnly&&p.builder==='none'&&p.builderFee==='0'&&p.transactionValue==='0','Edge wallet order flags differ from authorization');
  invariant(BigInt(p.price)===parseAmount(scope.price,m.quoteDecimals)&&BigInt(p.quantity)===parseAmount(scope.quantity,m.baseDecimals)&&BigInt(p.quantityCap)===parseAmount(scope.quantityCap,m.baseDecimals)&&BigInt(p.notionalCap)===parseAmount(scope.notionalCap,m.quoteDecimals),'Edge wallet order amounts/caps differ from authorization');
}
