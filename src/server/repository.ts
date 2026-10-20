import {randomUUID,randomBytes} from 'node:crypto';
import {and,eq,desc} from 'drizzle-orm';
import {z} from 'zod';
import * as t from '../../db/schema';
import {type openDatabase} from './database';
import {type PlanInput,type Preview,type MarketContext,type MarketIdentity,marketIdentity,normalizePlan,hash,makePreview,verifyPreview,diffPlans} from '../domain/plan';
import {initialExecution,simulate,reconcile,type Observation,type Execution,type OfflineScenario} from '../domain/execution';
import {offlineContext} from '../integrations/offline';
import {invariant} from '../domain/errors';
import {EXPLORER} from '../integrations/network';
import type {WalletReport} from '../integrations/browser-wallet';

export function correlationTag():string {let value=0n;while(value===0n)value=BigInt(`0x${randomBytes(8).toString('hex')}`);return value.toString();}

export const publicFields=z.array(z.enum(['title','rationale','invalidation','parameters','lineage','evidence','address','links'])).min(1).max(8).refine(v=>new Set(v).size===v.length,'Duplicate public fields');
export type PublicField=z.infer<typeof publicFields>[number];
export type Version={id:string;planId:string;version:number;input:PlanInput;market:MarketIdentity;hash:string;createdAt:number};
export type Attempt={id:string;versionId:string;previewId:string;createdAt:number;candidateHash:string|null;execution:Execution};
function readVersion(row:typeof t.versions.$inferSelect):Version {
  return {id:row.id,planId:row.planId,version:row.version,input:JSON.parse(row.data) as PlanInput,market:row.market?JSON.parse(row.market) as MarketIdentity:marketIdentity(offlineContext('legacy-offline')),hash:row.hash,createdAt:row.createdAt};
}
function readAttempt(row:typeof t.attempts.$inferSelect):Attempt {
  return {id:row.id,versionId:row.versionId,previewId:row.previewId,createdAt:row.createdAt,candidateHash:row.candidateHash,execution:JSON.parse(row.data) as Execution};
}
export class Repository {
  constructor(private connection:ReturnType<typeof openDatabase>,private dataMode:'offline'|'testnet'='offline') {}
  private get db(){return this.connection.db;}
  private transaction<T>(fn:()=>T):T{return this.connection.sqlite.transaction(fn).immediate();}
  private owned(owner:string,id:string) {
    const plan=this.db.select().from(t.plans).where(and(eq(t.plans.id,id),eq(t.plans.owner,owner),eq(t.plans.mode,this.dataMode))).get();
    invariant(plan,'Plan unavailable',404);return plan;
  }
  list(owner:string) {
    return this.db.select().from(t.plans).where(and(eq(t.plans.owner,owner),eq(t.plans.mode,this.dataMode))).orderBy(desc(t.plans.createdAt)).all().map(p=>{
      const v=this.db.select().from(t.versions).where(and(eq(t.versions.planId,p.id),eq(t.versions.version,p.currentVersion))).get()!;
      return {id:p.id,currentVersion:p.currentVersion,depth:p.depth,title:readVersion(v).input.title};
    });
  }
  private version(owner:string,planId:string,versionId:string) {
    this.owned(owner,planId);
    const v=this.db.select().from(t.versions).where(and(eq(t.versions.id,versionId),eq(t.versions.planId,planId))).get();
    invariant(v,'Version unavailable',404);return readVersion(v);
  }
  private context(owner:string,context?:MarketContext) {
    if(this.dataMode==='offline')return offlineContext(owner);
    invariant(context && context.mode==='testnet' && context.chainId===50383 && context.owner===owner && !context.pool.startsWith('synthetic:'),'Verified owner/market context required');
    invariant(Date.now()>=context.observedAt && Date.now()-context.observedAt<=10_000,'Fresh metadata/context required');return context;
  }
  private append(planId:string,input:PlanInput,version:number,context:MarketContext) {
    const market=marketIdentity(context);
    const record={id:randomUUID(),planId,version,data:JSON.stringify(input),market:JSON.stringify(market),hash:hash({schema:2,input,market}),createdAt:Date.now()};
    this.db.insert(t.versions).values(record).run();return readVersion(record);
  }
  create(owner:string,input:PlanInput,source?:{publicationId:string;revision:number},context?:MarketContext) {
    return this.transaction(()=>{
      const ctx=this.context(owner,context),normalized=normalizePlan(input,ctx);
      const id=randomUUID();let sourceVersion:string|null=null,sourcePublication:string|null=null,rootId:string=id,depth=0;
      if(source) {
        const publication=this.db.select().from(t.publications).where(and(eq(t.publications.id,source.publicationId),eq(t.publications.active,true))).get();
        invariant(publication && publication.revision===source.revision,'Source publication unavailable or changed',409);
        const fields=publicFields.parse(JSON.parse(publication.fields));
        invariant(fields.includes('parameters'),'Source parameters are not published',409);
        const v=this.db.select().from(t.versions).where(eq(t.versions.id,publication.versionId)).get()!;
        const parent=this.db.select().from(t.plans).where(eq(t.plans.id,v.planId)).get()!;
        invariant(parent.depth===0,'Only original plans can be remixed; one level maximum',409);
        invariant(parent.mode===this.dataMode,'Live and fixture lineage cannot cross',409);
        invariant(hash(readVersion(v).market)===hash(marketIdentity(ctx)),'Source market identity changed; cannot silently remix another deployment',409);
        sourceVersion=v.id; sourcePublication=publication.id;rootId=parent.rootId;depth=1;
      }
      this.db.insert(t.plans).values({id,owner,mode:this.dataMode,currentVersion:1,rootId,sourceVersion,sourcePublication,depth,createdAt:Date.now()}).run();
      this.append(id,normalized,1,ctx);return this.get(owner,id);
    });
  }
  save(owner:string,id:string,expectedVersion:number,input:PlanInput,context?:MarketContext) {
    return this.transaction(()=>{
      const plan=this.owned(owner,id);
      invariant(plan.currentVersion===expectedVersion,'This plan changed in another tab; reload before saving',409);
      const ctx=this.context(owner,context),normalized=normalizePlan(input,ctx);
      const version=plan.currentVersion+1;this.append(id,normalized,version,ctx);
      this.db.update(t.plans).set({currentVersion:version}).where(eq(t.plans.id,id)).run();
      return this.get(owner,id);
    });
  }
  get(owner:string,id:string) {
    const plan=this.owned(owner,id);
    const versions=this.db.select().from(t.versions).where(eq(t.versions.planId,id)).orderBy(desc(t.versions.version)).all().map(readVersion);
    const attempts=this.db.select().from(t.attempts).where(and(eq(t.attempts.planId,id),eq(t.attempts.owner,owner))).all().map(readAttempt);
    const publications=versions.flatMap(v=>this.db.select().from(t.publications).where(eq(t.publications.versionId,v.id)).all().map(p=>({id:p.id,versionId:p.versionId,fields:publicFields.parse(JSON.parse(p.fields)),revision:p.revision,active:p.active})));
    let source:null|{available:boolean;publicationId:string|null;version:number|null;diff:ReturnType<typeof diffPlans>} = null;
    if(plan.sourceVersion) {
      const p=plan.sourcePublication?this.db.select().from(t.publications).where(and(eq(t.publications.id,plan.sourcePublication),eq(t.publications.active,true))).get():undefined;
      const v=this.db.select().from(t.versions).where(eq(t.versions.id,plan.sourceVersion)).get();
      if(p && v) {
        const sourceInput=readVersion(v).input;const fields=publicFields.parse(JSON.parse(p.fields));
        const allowed:Partial<PlanInput>={};
        for(const field of ['title','rationale','invalidation'] as const) if(fields.includes(field)) allowed[field]=sourceInput[field];
        if(fields.includes('parameters')) {allowed.side=sourceInput.side;for(const field of ['price','quantity','quantityCap','notionalCap'] as const) allowed[field]=sourceInput[field];}
        source={available:true,publicationId:p.id,version:v.version,diff:diffPlans(allowed,versions[0].input)};
      } else source={available:false,publicationId:null,version:null,diff:[]};
    }
    return {id:plan.id,mode:this.dataMode,currentVersion:plan.currentVersion,rootId:plan.rootId,sourceVersion:plan.sourceVersion,depth:plan.depth,versions,attempts,publications,source};
  }
  preview(owner:string,id:string,versionId:string,context?:MarketContext,tag?:string) {
    return this.transaction(()=>{
      const plan=this.owned(owner,id), version=this.version(owner,id,versionId);
      invariant(version.version===plan.currentVersion,'Preview the current version',409);
      invariant(!this.db.select().from(t.attempts).where(eq(t.attempts.versionId,versionId)).get(),'This version already has an execution request; refresh its status',409);
      const unknown=this.db.select().from(t.attempts).where(eq(t.attempts.planId,id)).all().some(a=>['unknown','submitting','submitted'].includes((JSON.parse(a.data) as Execution).tx));
      invariant(!unknown,'An existing request is unresolved; reconcile before any new attempt',409);
      const ctx=this.context(owner,context);
      invariant(hash(version.market)===hash(marketIdentity(ctx)),'Market identity changed since this version; save and review a new version',409);
      const clientTag=this.dataMode==='testnet'?tag:null;
      invariant(this.dataMode==='offline' || clientTag,'Server-generated correlation tag required');
      const preview=makePreview(version.input,ctx,Date.now(),clientTag||'0');const previewId=randomUUID();
      this.db.insert(t.previews).values({id:previewId,owner,versionId,data:JSON.stringify(preview),clientTag,expiresAt:preview.expiresAt}).run();
      return {id:previewId,versionId,...preview};
    });
  }
  claim(owner:string,id:string,previewId:string,payloadHash:string,context?:MarketContext) {
    return this.transaction(()=>{
      const plan=this.owned(owner,id);
      const row=this.db.select().from(t.previews).where(and(eq(t.previews.id,previewId),eq(t.previews.owner,owner))).get();
      invariant(row,'Preview unavailable',404);
      const version=this.version(owner,id,row.versionId);
      const preview=JSON.parse(row.data) as Preview;
      invariant(preview.payloadHash===payloadHash,'Approved payload does not match preview',409);
      const existing=this.db.select().from(t.attempts).where(eq(t.attempts.versionId,version.id)).get();
      if(existing) return {attempt:readAttempt(existing),claimed:false};
      invariant(plan.currentVersion===version.version,'Plan edited since preview; review again',409);
      verifyPreview(preview,this.context(owner,context));
      // All identity is durably committed before the caller may invoke any effect.
      const execution=initialExecution(owner,preview.context.chainId,preview.context.pool,preview.amounts.quantity,this.dataMode);
      execution.approvedAt=Date.now();execution.submissionStartedAt=Date.now();
      execution.baseDecimals=preview.context.baseDecimals;execution.quoteDecimals=preview.context.quoteDecimals;
      execution.tx='submitting';execution.reason='Request persisted; effect not yet observed';
      const record={id:randomUUID(),owner,planId:id,versionId:version.id,previewId,payloadHash,contextHash:preview.contextHash,candidateHash:null,data:JSON.stringify(execution),createdAt:Date.now()};
      this.db.insert(t.attempts).values(record).run();
      this.db.insert(t.observations).values({id:randomUUID(),attemptId:record.id,data:record.data,createdAt:Date.now()}).run();
      return {attempt:readAttempt(record),claimed:true};
    });
  }
  getPreview(owner:string,id:string,previewId:string) {
    this.owned(owner,id);
    const row=this.db.select().from(t.previews).where(and(eq(t.previews.id,previewId),eq(t.previews.owner,owner))).get();
    invariant(row,'Preview unavailable',404);this.version(owner,id,row.versionId);
    return {id:row.id,versionId:row.versionId,...JSON.parse(row.data) as Preview};
  }
  getAttempt(owner:string,id:string) {
    const row=this.db.select().from(t.attempts).where(and(eq(t.attempts.id,id),eq(t.attempts.owner,owner))).get();
    invariant(row,'Request unavailable',404);this.owned(owner,row.planId);
    return {attempt:readAttempt(row),preview:this.getPreview(owner,row.planId,row.previewId)};
  }
  recordObservation(owner:string,id:string,observation:Observation) {
    return this.transaction(()=>{
      const {attempt}=this.getAttempt(owner,id),execution=reconcile(attempt.execution,observation);
      this.db.update(t.attempts).set({data:JSON.stringify(execution)}).where(eq(t.attempts.id,id)).run();
      this.db.insert(t.observations).values({id:randomUUID(),attemptId:id,data:JSON.stringify(execution),createdAt:Date.now()}).run();
      return {...attempt,execution};
    });
  }
  recordWalletResult(owner:string,id:string,result:WalletReport) {
    return this.transaction(()=>{
      invariant(this.dataMode==='testnet','Wallet reports cannot enter offline records');
      const {attempt}=this.getAttempt(owner,id),prior=attempt.execution;
      if(result.kind==='hash') {
        invariant(/^0x[a-fA-F0-9]{64}$/.test(result.hash),'Malformed hash');
        invariant(!prior.hash || prior.hash.toLowerCase()===result.hash.toLowerCase(),'Known transaction cannot be replaced',409);
        this.db.update(t.attempts).set({candidateHash:result.hash}).where(eq(t.attempts.id,id)).run();
        this.db.insert(t.observations).values({id:randomUUID(),attemptId:id,data:JSON.stringify({source:'browser_candidate_not_evidence',hash:result.hash}),createdAt:Date.now()}).run();
        return {...attempt,candidateHash:result.hash};
      }
      // Late browser errors cannot erase independently verified on-chain facts.
      if(prior.hash)return attempt;
      const notSent=(result.kind==='rejected'||result.kind==='context_changed')&&!attempt.candidateHash;
      const execution:Execution={...prior,tx:notSent?'not_submitted':'unknown',order:notSent?'unobserved':'unknown',coverage:'unavailable',observedAt:Date.now(),source:'browser-reported local result; no chain evidence',
        reason:attempt.candidateHash?'A candidate hash exists; outcome remains unresolved despite a later wallet report. No retry.':result.kind==='rejected'?'Wallet reported rejection before broadcast. No submitted claim.':result.kind==='context_changed'?'Wallet/account/network changed before the signing call. Review a new version.':'Wallet call interrupted. Existing request retained; reconcile, never resend.'};
      this.db.update(t.attempts).set({data:JSON.stringify(execution)}).where(eq(t.attempts.id,id)).run();
      this.db.insert(t.observations).values({id:randomUUID(),attemptId:id,data:JSON.stringify(execution),createdAt:Date.now()}).run();
      return {...attempt,execution};
    });
  }
  simulate(owner:string,id:string,scenario:OfflineScenario) {
    return this.transaction(()=>{
      const row=this.db.select().from(t.attempts).where(and(eq(t.attempts.id,id),eq(t.attempts.owner,owner))).get();
      invariant(row,'Request unavailable',404);
      const previous=readAttempt(row).execution;
      if(previous.tx!=='submitting') return readAttempt(row);
      const execution=simulate(previous,scenario);
      this.db.update(t.attempts).set({data:JSON.stringify(execution)}).where(eq(t.attempts.id,id)).run();
      this.db.insert(t.observations).values({id:randomUUID(),attemptId:id,data:JSON.stringify(execution),createdAt:Date.now()}).run();
      return {...readAttempt(row),execution};
    });
  }
  refresh(owner:string,id:string) {
    return this.transaction(()=>{
      invariant(this.dataMode==='offline','Live refresh requires authoritative observation');
      const row=this.db.select().from(t.attempts).where(and(eq(t.attempts.id,id),eq(t.attempts.owner,owner))).get();
      invariant(row,'Request unavailable',404);
      const prior=readAttempt(row).execution;
      const execution={...prior,observedAt:Date.now(),coverage:'snapshot_only' as const,
        ...(prior.tx==='submitting'?{tx:'unknown' as const,order:'unknown' as const,reason:'Interrupted request; no resend. Reconcile this identity.'}:{})};
      this.db.update(t.attempts).set({data:JSON.stringify(execution)}).where(eq(t.attempts.id,id)).run();
      this.db.insert(t.observations).values({id:randomUUID(),attemptId:id,data:JSON.stringify(execution),createdAt:Date.now()}).run();
      return {...readAttempt(row),execution};
    });
  }
  publish(owner:string,id:string,versionId:string,fields:PublicField[]) {
    return this.transaction(()=>{
      this.version(owner,id,versionId);publicFields.parse(fields);
      const old=this.db.select().from(t.publications).where(eq(t.publications.versionId,versionId)).get();
      const publication={id:old?.id||randomUUID(),owner,versionId,fields:JSON.stringify(fields),revision:(old?.revision||0)+1,active:true,updatedAt:Date.now()};
      if(old) this.db.update(t.publications).set(publication).where(eq(t.publications.id,old.id)).run();
      else this.db.insert(t.publications).values(publication).run();
      return this.publicCard(publication.id);
    });
  }
  unpublish(owner:string,id:string) {
    const result=this.db.update(t.publications).set({active:false,updatedAt:Date.now()}).where(and(eq(t.publications.id,id),eq(t.publications.owner,owner))).run();
    invariant(result.changes,'Publication unavailable',404);return {withdrawn:true};
  }
  publishedAttempt(id:string) {
    const p=this.db.select().from(t.publications).where(and(eq(t.publications.id,id),eq(t.publications.active,true))).get();
    invariant(p,'Card unavailable or withdrawn',404);
    const fields=publicFields.parse(JSON.parse(p.fields));if(!fields.includes('evidence'))return null;
    const row=this.db.select().from(t.attempts).where(eq(t.attempts.versionId,p.versionId)).get();
    if(!row)return null;this.owned(p.owner,row.planId);
    return {owner:p.owner,id:row.id};
  }
  publicCard(id:string) {
    const p=this.db.select().from(t.publications).where(and(eq(t.publications.id,id),eq(t.publications.active,true))).get();
    invariant(p,'Card unavailable or withdrawn',404);return this.projectPublication(p);
  }
  publicationPreview(owner:string,id:string,versionId:string,fields:PublicField[]) {
    this.version(owner,id,versionId);publicFields.parse(fields);
    const old=this.db.select().from(t.publications).where(eq(t.publications.versionId,versionId)).get();
    return this.projectPublication({id:old?.id||'preview',owner,versionId,fields:JSON.stringify(fields),revision:(old?.revision||0)+1,active:true,updatedAt:Date.now()});
  }
  private projectPublication(p:typeof t.publications.$inferSelect) {
    const row=this.db.select().from(t.versions).where(eq(t.versions.id,p.versionId)).get()!;const v=readVersion(row);
    const plan=this.db.select().from(t.plans).where(eq(t.plans.id,v.planId)).get()!;
    invariant(plan.mode===this.dataMode,'Card unavailable in this data mode',404);
    const fields=publicFields.parse(JSON.parse(p.fields));const input=v.input;
    const attempt=fields.includes('evidence')?this.db.select().from(t.attempts).where(eq(t.attempts.versionId,v.id)).get():undefined;
    const e=attempt?readAttempt(attempt).execution:null;
    let comparison:null|{sourcePublicationId:string;sourceVersion:number;changes:ReturnType<typeof diffPlans>}=null;
    if(fields.includes('lineage') && plan.sourceVersion && plan.sourcePublication) {
      const sourcePub=this.db.select().from(t.publications).where(and(eq(t.publications.id,plan.sourcePublication),eq(t.publications.active,true))).get();
      const sourceRow=this.db.select().from(t.versions).where(eq(t.versions.id,plan.sourceVersion)).get();
      if(sourcePub && sourceRow) {
        const sourceFields=publicFields.parse(JSON.parse(sourcePub.fields)),sourceInput=readVersion(sourceRow).input,allowed:Partial<PlanInput>={};
        for(const field of ['title','rationale','invalidation'] as const)if(fields.includes(field)&&sourceFields.includes(field))allowed[field]=sourceInput[field];
        if(fields.includes('parameters')&&sourceFields.includes('parameters')) {allowed.side=sourceInput.side;for(const field of ['price','quantity','quantityCap','notionalCap'] as const)allowed[field]=sourceInput[field];}
        comparison={sourcePublicationId:sourcePub.id,sourceVersion:sourceRow.version,changes:diffPlans(allowed,input)};
      }
    }
    // Enumerate each public field. Never spread a private record into this response.
    const live=this.dataMode==='testnet';
    const level=!live?'synthetic':fields.includes('links')&&e?.identityVerified&&e.hash?(e.tx==='confirmed'&&['accepted','open','partial','filled','cancelled'].includes(e.order)?'verified_order':e.tx==='confirmed'?'chain_confirmed':'unknown'):'owner_reported';
    return {id:p.id,revision:p.revision,mode:this.dataMode,label:live?'Testnet / paper funds':'Synthetic offline demo · no live evidence',
      version:v.version,versionHash:hash({schema:1,version:v.version,fields,title:fields.includes('title')?input.title:null,rationale:fields.includes('rationale')?input.rationale:null,invalidation:fields.includes('invalidation')?input.invalidation:null,parameters:fields.includes('parameters')?{side:input.side,price:input.price,quantity:input.quantity,quantityCap:input.quantityCap,notionalCap:input.notionalCap,market:v.market}:null}),fields,
      title:fields.includes('title')?input.title:null,
      rationale:fields.includes('rationale')?input.rationale:null,
      invalidation:fields.includes('invalidation')?input.invalidation:null,
      parameters:fields.includes('parameters')?{side:input.side,price:input.price,quantity:input.quantity,quantityCap:input.quantityCap,notionalCap:input.notionalCap,market:v.market.symbol,chainId:v.market.chainId,pool:v.market.pool,type:'limit',timeInForce:'GTC',reduceOnly:false}:null,
      lineage:fields.includes('lineage')?{depth:plan.depth,sourceAvailable:plan.sourcePublication?Boolean(this.db.select().from(t.publications).where(and(eq(t.publications.id,plan.sourcePublication),eq(t.publications.active,true))).get()):null}:null,
      evidence:e?{tx:e.tx,order:e.order,filled:e.filled,remaining:e.remaining,baseDecimals:v.market.baseDecimals,observedAt:e.observedAt,coverage:e.coverage,reason:e.reason,level}:null,
      address:live&&fields.includes('address')?plan.owner:null,
      links:live&&fields.includes('links')&&e?.hash?{transaction:`${EXPLORER}/tx/${e.hash}`,hash:e.hash,orderId:e.orderId}:null,
      comparison,canRemix:plan.depth===0 && fields.includes('parameters'),updatedAt:p.updatedAt};
  }
}
export type PlanDetail=ReturnType<Repository['get']>;
export type PublicCard=ReturnType<Repository['publicCard']>;
export type StoredPreview=ReturnType<Repository['preview']>;
