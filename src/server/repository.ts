import {randomUUID} from 'node:crypto';
import {and,eq,desc} from 'drizzle-orm';
import {z} from 'zod';
import * as t from '../../db/schema';
import {type openDatabase} from './database';
import {type PlanInput,type Preview,normalizePlan,hash,makePreview,verifyPreview,diffPlans} from '../domain/plan';
import {initialExecution,simulate,type Execution,type OfflineScenario} from '../domain/execution';
import {offlineContext} from '../integrations/offline';
import {invariant} from '../domain/errors';

export const publicFields=z.array(z.enum(['title','rationale','invalidation','parameters','lineage','evidence'])).min(1).max(6).refine(v=>new Set(v).size===v.length,'Duplicate public fields');
export type PublicField=z.infer<typeof publicFields>[number];
export type Version={id:string;planId:string;version:number;input:PlanInput;hash:string;createdAt:number};
export type Attempt={id:string;versionId:string;previewId:string;createdAt:number;execution:Execution};
function readVersion(row:typeof t.versions.$inferSelect):Version {
  return {id:row.id,planId:row.planId,version:row.version,input:JSON.parse(row.data) as PlanInput,hash:row.hash,createdAt:row.createdAt};
}
function readAttempt(row:typeof t.attempts.$inferSelect):Attempt {
  return {id:row.id,versionId:row.versionId,previewId:row.previewId,createdAt:row.createdAt,execution:JSON.parse(row.data) as Execution};
}
export class Repository {
  constructor(private connection:ReturnType<typeof openDatabase>) {}
  private get db(){return this.connection.db;}
  private transaction<T>(fn:()=>T):T{return this.connection.sqlite.transaction(fn).immediate();}
  private owned(owner:string,id:string) {
    const plan=this.db.select().from(t.plans).where(and(eq(t.plans.id,id),eq(t.plans.owner,owner))).get();
    invariant(plan,'Plan unavailable',404);return plan;
  }
  list(owner:string) {
    return this.db.select().from(t.plans).where(eq(t.plans.owner,owner)).orderBy(desc(t.plans.createdAt)).all().map(p=>{
      const v=this.db.select().from(t.versions).where(and(eq(t.versions.planId,p.id),eq(t.versions.version,p.currentVersion))).get()!;
      return {id:p.id,currentVersion:p.currentVersion,depth:p.depth,title:readVersion(v).input.title};
    });
  }
  private version(owner:string,planId:string,versionId:string) {
    this.owned(owner,planId);
    const v=this.db.select().from(t.versions).where(and(eq(t.versions.id,versionId),eq(t.versions.planId,planId))).get();
    invariant(v,'Version unavailable',404);return readVersion(v);
  }
  private append(planId:string,input:PlanInput,version:number) {
    const record={id:randomUUID(),planId,version,data:JSON.stringify(input),hash:hash({schema:1,input}),createdAt:Date.now()};
    this.db.insert(t.versions).values(record).run();return readVersion(record);
  }
  create(owner:string,input:PlanInput,source?:{publicationId:string;revision:number}) {
    return this.transaction(()=>{
      const normalized=normalizePlan(input,offlineContext(owner));
      const id=randomUUID();let sourceVersion:string|null=null,sourcePublication:string|null=null,rootId:string=id,depth=0;
      if(source) {
        const publication=this.db.select().from(t.publications).where(and(eq(t.publications.id,source.publicationId),eq(t.publications.active,true))).get();
        invariant(publication && publication.revision===source.revision,'Source publication unavailable or changed',409);
        const fields=publicFields.parse(JSON.parse(publication.fields));
        invariant(fields.includes('parameters'),'Source parameters are not published',409);
        const v=this.db.select().from(t.versions).where(eq(t.versions.id,publication.versionId)).get()!;
        const parent=this.db.select().from(t.plans).where(eq(t.plans.id,v.planId)).get()!;
        invariant(parent.depth===0,'Only original plans can be remixed; one level maximum',409);
        invariant(parent.mode==='offline','Live and fixture lineage cannot cross',409);
        sourceVersion=v.id; sourcePublication=publication.id;rootId=parent.rootId;depth=1;
      }
      this.db.insert(t.plans).values({id,owner,mode:'offline',currentVersion:1,rootId,sourceVersion,sourcePublication,depth,createdAt:Date.now()}).run();
      this.append(id,normalized,1);return this.get(owner,id);
    });
  }
  save(owner:string,id:string,expectedVersion:number,input:PlanInput) {
    return this.transaction(()=>{
      const plan=this.owned(owner,id);
      invariant(plan.currentVersion===expectedVersion,'This plan changed in another tab; reload before saving',409);
      const normalized=normalizePlan(input,offlineContext(owner));
      const version=plan.currentVersion+1;this.append(id,normalized,version);
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
    return {id:plan.id,currentVersion:plan.currentVersion,rootId:plan.rootId,sourceVersion:plan.sourceVersion,depth:plan.depth,versions,attempts,publications,source};
  }
  preview(owner:string,id:string,versionId:string) {
    return this.transaction(()=>{
      const plan=this.owned(owner,id), version=this.version(owner,id,versionId);
      invariant(version.version===plan.currentVersion,'Preview the current version',409);
      invariant(!this.db.select().from(t.attempts).where(eq(t.attempts.versionId,versionId)).get(),'This version already has an execution request; refresh its status',409);
      const unknown=this.db.select().from(t.attempts).where(eq(t.attempts.planId,id)).all().some(a=>['unknown','submitting','submitted'].includes((JSON.parse(a.data) as Execution).tx));
      invariant(!unknown,'An existing request is unresolved; reconcile before any new attempt',409);
      const preview=makePreview(version.input,offlineContext(owner));const previewId=randomUUID();
      this.db.insert(t.previews).values({id:previewId,owner,versionId,data:JSON.stringify(preview),expiresAt:preview.expiresAt}).run();
      return {id:previewId,versionId,...preview};
    });
  }
  claim(owner:string,id:string,previewId:string,payloadHash:string) {
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
      verifyPreview(preview,offlineContext(owner));
      // All identity is durably committed before the caller may invoke any effect.
      const execution=initialExecution(owner,0,preview.context.pool,preview.amounts.quantity,'offline');
      execution.tx='submitting';execution.reason='Request persisted; effect not yet observed';
      const record={id:randomUUID(),owner,planId:id,versionId:version.id,previewId,payloadHash,contextHash:preview.contextHash,data:JSON.stringify(execution),createdAt:Date.now()};
      this.db.insert(t.attempts).values(record).run();
      this.db.insert(t.observations).values({id:randomUUID(),attemptId:record.id,data:record.data,createdAt:Date.now()}).run();
      return {attempt:readAttempt(record),claimed:true};
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
  publicCard(id:string) {
    const p=this.db.select().from(t.publications).where(and(eq(t.publications.id,id),eq(t.publications.active,true))).get();
    invariant(p,'Card unavailable or withdrawn',404);
    const row=this.db.select().from(t.versions).where(eq(t.versions.id,p.versionId)).get()!;const v=readVersion(row);
    const plan=this.db.select().from(t.plans).where(eq(t.plans.id,v.planId)).get()!;
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
    return {id:p.id,revision:p.revision,mode:'offline' as const,label:'Synthetic offline demo · no live evidence',
      version:v.version,versionHash:v.hash,fields,
      title:fields.includes('title')?input.title:null,
      rationale:fields.includes('rationale')?input.rationale:null,
      invalidation:fields.includes('invalidation')?input.invalidation:null,
      parameters:fields.includes('parameters')?{side:input.side,price:input.price,quantity:input.quantity,quantityCap:input.quantityCap,notionalCap:input.notionalCap,market:'BTC / USDso',type:'limit',timeInForce:'GTC',reduceOnly:false}:null,
      lineage:fields.includes('lineage')?{depth:plan.depth,sourceAvailable:plan.sourcePublication?Boolean(this.db.select().from(t.publications).where(and(eq(t.publications.id,plan.sourcePublication),eq(t.publications.active,true))).get()):null}:null,
      evidence:e?{tx:e.tx,order:e.order,filled:e.filled,remaining:e.remaining,observedAt:e.observedAt,coverage:e.coverage,reason:e.reason}:null,
      comparison,canRemix:plan.depth===0 && fields.includes('parameters'),updatedAt:p.updatedAt};
  }
}
export type PlanDetail=ReturnType<Repository['get']>;
export type PublicCard=ReturnType<Repository['publicCard']>;
export type StoredPreview=ReturnType<Repository['preview']>;
