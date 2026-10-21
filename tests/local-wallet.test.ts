import {describe,it,expect} from 'vitest';
import {createSiweMessage} from 'viem/siwe';
import {toHex,numberToHex,keccak256,type Address} from 'viem';
import {mkdirSync,readFileSync,rmSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
import {readFixture,SYNTHETIC_OWNER} from './helpers/read-fixture';
import {prepareLiveContext} from '../src/integrations/prepare-order';
import {verifiedMarket} from '../src/integrations/read-context';
import {makePreview} from '../src/domain/plan';
import {orderCall} from '../src/integrations/order-call';
import {localOrigin,ownershipMessage,requestFingerprint,transactionTag,walletOrder} from '../tools/local-wallet/policy';
import {WalletJournal} from '../tools/local-wallet/journal';
const owner=SYNTHETIC_OWNER as Address;
async function fixture(){
  const f=readFixture(),input={title:'SYNTHETIC wallet companion test',rationale:'Offline only',invalidation:'Synthetic condition',riskNotes:'PRIVATE_CANARY',side:'buy' as const,price:'82000',quantity:'0.0002',quantityCap:'0.001',notionalCap:'20'};
  const market=await verifiedMarket(f.connection),context=await prepareLiveContext(owner,input,'123',undefined,f.connect),preview={...makePreview(input,context,Date.now(),'123'),id:randomUUID(),versionId:randomUUID()},call=orderCall(preview.payload);
  const raw={from:owner,to:call.to,data:call.data,value:'0x0',gas:numberToHex(call.gas),maxFeePerGas:numberToHex(call.maxFeePerGas),maxPriorityFeePerGas:numberToHex(call.maxPriorityFeePerGas),chainId:numberToHex(50383)};
  return {market,preview,raw};
}
describe('local testnet wallet policy (synthetic fixtures only)',()=>{
  it('binds one canonical transaction to the approved owner, current market and exact payload',async()=>{
    const {market,preview,raw}=await fixture();expect(transactionTag(raw)).toBe('123');expect(walletOrder(raw,preview,market,owner).tag).toBe('123');
    expect(requestFingerprint({...raw,value:'0x00'})).toBe(requestFingerprint(raw));
    for(const changed of [{chainId:'0x1'},{value:'0x1'},{to:owner},{gas:'0x1'},{maxFeePerGas:'0x9'},{nonce:'0x0'}])expect(()=>walletOrder({...raw,...changed},preview,market,owner)).toThrow();
    expect(()=>walletOrder(raw,{...preview,expiresAt:Date.now()-1},market,owner)).toThrow(/expired/);
    expect(()=>walletOrder(raw,preview,{...market,market:{...market.market,baseDecimals:18}},owner)).toThrow(/precision/);
  });
  it('rejects arbitrary personal_sign messages and every wrong SIWE audience/chain/expiry',()=>{
    const origin='http://127.0.0.1:3000',now=Date.now(),fields={address:owner,chainId:50383,domain:'127.0.0.1:3000',uri:origin,version:'1' as const,nonce:'ab'.repeat(16),issuedAt:new Date(now),expirationTime:new Date(now+240000),statement:'Authenticate ownership for private ForkTrade testnet plans. This grants no trading authority.'};
    const message=createSiweMessage(fields);expect(ownershipMessage([toHex(message),owner],owner,origin).message).toBe(message);
    for(const changed of [{chainId:1},{domain:'external.invalid'},{uri:'https://external.invalid'},{expirationTime:new Date(now-1)},{statement:'Approve token spending'}])expect(()=>ownershipMessage([toHex(createSiweMessage({...fields,...changed})),owner],owner,origin)).toThrow();
    expect(()=>ownershipMessage([toHex('SYNTHETIC arbitrary message'),owner],owner,origin)).toThrow();
    expect(localOrigin(origin)).toBe(origin);for(const url of ['https://127.0.0.1:3000','http://localhost:3000','https://external.invalid','http://127.0.0.1:3000/private'])expect(()=>localOrigin(url)).toThrow();
  });
});
describe('durable local wallet requests (no key/network)',()=>{
  async function use(run:(journal:WalletJournal,directory:string)=>Promise<void>){
    const directory=resolve('.local',`wallet-unit-${randomUUID()}`);mkdirSync(directory,{recursive:true});
    try{await run(new WalletJournal(directory),directory);}finally{const offset=relative(resolve('.local'),directory);if(!isAbsolute(offset)&&offset.startsWith('wallet-unit-')&&!offset.includes('..'))rmSync(directory,{recursive:true,force:true});}
  }
  it('persists identity before signing and hash before the only send; restart cannot resubmit',async()=>use(async(journal,directory)=>{
    let signs=0,sends=0;const raw='0x123456' as const,hash=keccak256(raw);
    const result=await journal.broadcast('SYNTHETIC-key','SYNTHETIC-payload',0,async()=>{signs++;expect(new WalletJournal(directory).get('SYNTHETIC-key')?.state).toBe('claimed');return raw;},async()=>{sends++;expect(new WalletJournal(directory).get('SYNTHETIC-key')?.hash).toBe(hash);throw new Error('Synthetic response loss');},{attemptId:'SYNTHETIC-attempt',tag:'123'});
    expect(result).toBe(hash);expect(journal.get('SYNTHETIC-key')?.state).toBe('unknown');
    const restarted=new WalletJournal(directory);expect(restarted.get('SYNTHETIC-key')?.attemptId).toBe('SYNTHETIC-attempt');expect(await restarted.broadcast('SYNTHETIC-key','SYNTHETIC-payload',0,async()=>{signs++;return raw;},async()=>{sends++;return hash;})).toBe(hash);expect({signs,sends}).toEqual({signs:1,sends:1});
    await expect(restarted.broadcast('another-request','another-payload',1,async()=>raw,async()=>hash)).rejects.toThrow(/unresolved/);
    await expect(restarted.broadcast('SYNTHETIC-key','changed-payload',0,async()=>raw,async()=>hash)).rejects.toThrow(/change/);
    expect(readFileSync(resolve(directory,'interactive-wallet-requests.json'),'utf8')).not.toContain(raw);
  }));
  it('preserves a pre-broadcast signer failure and never repeats that request',async()=>use(async journal=>{
    let sends=0;await expect(journal.broadcast('SYNTHETIC-failed','SYNTHETIC-payload',0,async()=>{throw new Error('Synthetic signer unavailable');},async()=>{sends++;return '0x1234';})).rejects.toThrow(/stopped/);
    expect(journal.get('SYNTHETIC-failed')?.state).toBe('not_broadcast');expect(sends).toBe(0);
    await expect(journal.broadcast('SYNTHETIC-failed','SYNTHETIC-payload',0,async()=> '0x1234',async()=> '0x1234')).rejects.toThrow(/no hash/);
  }));
});
