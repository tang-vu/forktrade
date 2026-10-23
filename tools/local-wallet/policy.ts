import {z} from 'zod';
import {getAddress,hexToString,keccak256,toHex,type Address,type Hex} from 'viem';
import {parseSiweMessage} from 'viem/siwe';
import {invariant} from '../../src/domain/errors';
import {ceilDiv,parseAmount,scale} from '../../src/domain/amounts';
import type {Preview} from '../../src/domain/plan';
import type {VerifiedMarket} from '../../src/integrations/read-context';
import {orderCall} from '../../src/integrations/order-call';
import {EXPECTED_CHAIN} from '../../src/integrations/network';

export function localOrigin(value:string) {
  const url=new URL(value);
  invariant(url.protocol==='http:'&&url.hostname==='127.0.0.1'&&url.origin===value,'Wallet companion accepts only an exact loopback origin');
  return url.origin;
}
const hex=z.string().regex(/^0x[0-9a-fA-F]+$/);
const transaction=z.object({from:z.string(),to:z.string(),data:hex,value:hex,gas:hex,maxFeePerGas:hex,maxPriorityFeePerGas:hex,chainId:hex}).strict();
export function requestFingerprint(raw:unknown) {
  const tx=transaction.parse(raw);
  return keccak256(toHex(JSON.stringify({from:getAddress(tx.from).toLowerCase(),to:getAddress(tx.to).toLowerCase(),data:tx.data.toLowerCase(),value:toHex(BigInt(tx.value)),gas:toHex(BigInt(tx.gas)),maxFeePerGas:toHex(BigInt(tx.maxFeePerGas)),maxPriorityFeePerGas:toHex(BigInt(tx.maxPriorityFeePerGas)),chainId:toHex(BigInt(tx.chainId))})));
}
export function transactionTag(raw:unknown) {
  const tx=transaction.parse(raw);
  // The exact ABI is decoded again by the caller against the server's approved payload.
  invariant(tx.data.length===10+9*64,'Only one fixed limit/GTC placeOrder call is supported');
  return BigInt(`0x${tx.data.slice(10+64,10+128)}`).toString();
}
export function walletOrder(raw:unknown,preview:Preview,market:VerifiedMarket,owner:Address,now=Date.now()) {
  const tx=transaction.parse(raw),p=preview.payload,c=preview.context,m=market.market,expected=orderCall(p);
  invariant(now<preview.expiresAt,'Review expired; the companion will not sign');
  invariant(p.mode==='testnet'&&p.chainId===EXPECTED_CHAIN&&getAddress(p.owner)===owner&&getAddress(tx.from)===owner,'Wrong owner/network');
  invariant(BigInt(tx.chainId)===BigInt(EXPECTED_CHAIN)&&getAddress(tx.to)===getAddress(m.poolAddress)&&getAddress(p.pool)===getAddress(m.poolAddress),'Unsupported market or chain');
  invariant(c.baseDecimals===m.baseDecimals&&c.quoteDecimals===m.quoteDecimals&&p.marginBank.toLowerCase()===m.marginBank.toLowerCase()&&p.collateral.toLowerCase()===m.quoteToken.toLowerCase(),'Market precision/identity differs from verified public metadata');
  invariant(tx.data.toLowerCase()===expected.data.toLowerCase()&&BigInt(tx.value)===0n&&BigInt(tx.gas)===expected.gas&&BigInt(tx.maxFeePerGas)===expected.maxFeePerGas&&BigInt(tx.maxPriorityFeePerGas)===expected.maxPriorityFeePerGas,'Wallet request differs from the durably approved executable payload');
  const quantity=BigInt(p.quantity),price=BigInt(p.price),notional=ceilDiv(price*quantity,scale(m.baseDecimals));
  invariant(quantity>=BigInt(m.minQuantity)&&quantity%BigInt(m.lotSize)===0n&&price%BigInt(m.tickSize)===0n,'Unsupported quantity/price grid');
  invariant(quantity<=parseAmount('0.001',m.baseDecimals)&&notional<=parseAmount('20',m.quoteDecimals),'Companion cap exceeded (0.001 BTC / 20 USDso)');
  invariant(expected.gas*expected.maxFeePerGas<=parseAmount('0.1',18),'Companion native cost cap exceeded (0.1 STT)');
  return {call:expected,tag:p.userData,requestKey:keccak256(toHex(`${owner.toLowerCase()}:${p.chainId}:${p.pool.toLowerCase()}:${p.userData}`)),requestHash:requestFingerprint(raw),notional};
}
export function ownershipMessage(params:unknown,owner:Address,origin:string,now=Date.now()) {
  const [raw,account]=z.tuple([hex,z.string()]).parse(params),message=hexToString(raw as Hex),m=parseSiweMessage(message);
  invariant(getAddress(account)===owner&&m.address&&getAddress(m.address)===owner&&m.chainId===EXPECTED_CHAIN&&m.domain===new URL(origin).host&&m.uri===origin&&m.version==='1','Unsupported ownership challenge');
  invariant(m.nonce&&/^[a-f0-9]{32}$/.test(m.nonce)&&m.issuedAt&&m.issuedAt.getTime()<=now+5000&&m.expirationTime&&m.expirationTime.getTime()>now&&m.expirationTime.getTime()-now<=300000,'Ownership challenge expired or malformed');
  invariant(m.statement==='Authenticate ownership for private ForkTrade testnet plans. This grants no trading authority.','Companion signs only ForkTrade ownership messages');
  return {message,expiresAt:m.expirationTime!.getTime()};
}
