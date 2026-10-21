import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {keccak256,type Hex} from 'viem';
import {randomUUID} from 'node:crypto';
import type {orderCall} from '../../src/integrations/order-call';
import {invariant} from '../../src/domain/errors';

export type RecordEntry={id:string;requestHash:string;nonce:number;state:'claimed'|'not_broadcast'|'signed'|'broadcasting'|'submitted'|'unknown'|'confirmed'|'reverted';hash?:Hex;attemptId?:string;tag?:string;createdAt:number};
export class WalletJournal {
  private records:Record<string,RecordEntry>;
  private file:string;
  constructor(directory:string){this.file=resolve(directory,'interactive-wallet-requests.json');this.records=existsSync(this.file)?JSON.parse(readFileSync(this.file,'utf8')):{};}
  list(){return Object.values(this.records);}
  entries(){return {...this.records};}
  get(key:string){return this.records[key];}
  private save(){const temporary=`${this.file}.tmp`;writeFileSync(temporary,JSON.stringify(this.records,null,2)+'\n',{mode:0o600});renameSync(temporary,this.file);}
  update(key:string,value:RecordEntry){this.records[key]=value;this.save();}
  async broadcast(key:string,requestHash:string,nonce:number,sign:()=>Promise<Hex>,send:(serialized:Hex)=>Promise<Hex>,metadata?:{attemptId:string;tag:string}){
    const existing=this.get(key);
    if(existing){invariant(existing.requestHash===requestHash,'A used request cannot change its payload');invariant(existing.hash,'Existing wallet claim has no hash; inspect it instead of retrying');return existing.hash;}
    invariant(!this.list().some(row=>['claimed','signed','broadcasting','submitted','unknown'].includes(row.state)),'An earlier wallet request is unresolved; reconcile before another order');
    const row:RecordEntry={id:randomUUID(),requestHash,nonce,state:'claimed',...metadata,createdAt:Date.now()};this.update(key,row);
    let raw:Hex;
    try{raw=await sign();}catch{row.state='not_broadcast';this.update(key,row);throw new Error('Local signing stopped before broadcast');}
    row.hash=keccak256(raw);row.state='signed';this.update(key,row);
    row.state='broadcasting';this.update(key,row);
    try{const returned=await send(raw);invariant(returned.toLowerCase()===row.hash.toLowerCase(),'Broadcast hash mismatch');row.state='submitted';}catch{row.state='unknown';}
    this.update(key,row);return row.hash;
  }
}
export type SignedOrderCall=ReturnType<typeof orderCall>;
