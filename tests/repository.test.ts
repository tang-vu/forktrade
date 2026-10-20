import {beforeEach,afterEach,describe,it,expect} from 'vitest';
import {openDatabase} from '../src/server/database';
import {Repository} from '../src/server/repository';
import type {PlanInput} from '../src/domain/plan';
const input:PlanInput={title:'Synthetic original',rationale:'Public rationale',invalidation:'Condition',riskNotes:'PRIVATE_RISK_CANARY',side:'buy',price:'82000',quantity:'0.0002',quantityCap:'0.001',notionalCap:'100'};
let connection:ReturnType<typeof openDatabase>,repo:Repository;
beforeEach(()=>{connection=openDatabase(':memory:');repo=new Repository(connection);});
afterEach(()=>connection.sqlite.close());
describe('V/A/L/P/W durable owner-scoped version and publication path',()=>{
  it('starts empty, normalizes and saves append-only versions with optimistic concurrency',()=>{
    expect(repo.list('offline:a')).toEqual([]);const root=repo.create('offline:a',input);
    const p=repo.preview('offline:a',root.id,root.versions[0].id);
    const updated=repo.save('offline:a',root.id,1,{...input,title:'New title'});
    expect(updated.versions).toHaveLength(2);expect(updated.versions[1].input.title).toBe(input.title);
    expect(()=>repo.save('offline:a',root.id,1,input)).toThrow(/another tab/);
    expect(()=>repo.claim('offline:a',root.id,p.id,p.payloadHash)).toThrow(/edited/);
    expect(()=>connection.sqlite.prepare('UPDATE versions SET hash=?').run('tampered')).toThrow(/append-only/);
  });
  it('keeps private drafts and all mutations owner-scoped',()=>{
    const root=repo.create('offline:a',input),v=root.versions[0].id;
    for(const operation of [()=>repo.get('offline:b',root.id),()=>repo.save('offline:b',root.id,1,input),()=>repo.preview('offline:b',root.id,v),()=>repo.publish('offline:b',root.id,v,['title'])])expect(operation).toThrow(/unavailable/);
    expect(()=>repo.publicCard(root.id)).toThrow();expect(repo.list('offline:b')).toEqual([]);
  });
  it('claims once across previews and preserves identity before any side effect',()=>{
    const root=repo.create('offline:a',input),v=root.versions[0].id;
    const p=repo.preview('offline:a',root.id,v),q=repo.preview('offline:a',root.id,v);
    const a=repo.claim('offline:a',root.id,p.id,p.payloadHash),b=repo.claim('offline:a',root.id,q.id,q.payloadHash);
    expect(a.claimed).toBe(true);expect(b.claimed).toBe(false);expect(b.attempt.id).toBe(a.attempt.id);
    expect(a.attempt.execution.tx).toBe('submitting');
    expect(connection.sqlite.prepare('SELECT COUNT(*) AS n FROM attempts').get()).toEqual({n:1});
    expect(()=>repo.preview('offline:a',root.id,v)).toThrow(/already/);
    expect(repo.refresh('offline:a',a.attempt.id).execution.tx).toBe('unknown');
    repo.save('offline:a',root.id,1,{...input,title:'Review again'});
    expect(()=>repo.preview('offline:a',root.id,repo.get('offline:a',root.id).versions[0].id)).toThrow(/unresolved/);
  });
  it('rejects payload tampering and expired previews before creating requests',()=>{
    const root=repo.create('offline:a',input),p=repo.preview('offline:a',root.id,root.versions[0].id);
    expect(()=>repo.claim('offline:a',root.id,p.id,'bad')).toThrow(/payload/);
    connection.sqlite.prepare("UPDATE previews SET data=json_set(data,'$.expiresAt',0)").run();
    expect(()=>repo.claim('offline:a',root.id,p.id,p.payloadHash)).toThrow(/expired/);
    expect(repo.get('offline:a',root.id).attempts).toHaveLength(0);
  });
  it('exposes only selected fields and never execution/session/owner material',()=>{
    const root=repo.create('offline:a',input),v=root.versions[0].id;
    const card=repo.publish('offline:a',root.id,v,['title','parameters']);
    const json=JSON.stringify(card);
    for(const canary of ['PRIVATE_RISK_CANARY','Public rationale','offline:a','previewId','contextHash'])expect(json).not.toContain(canary);
    expect(card.evidence).toBeNull();expect(card.label).toContain('Synthetic');
    expect(()=>repo.publish('offline:a',root.id,v,['riskNotes' as 'title'])).toThrow();
    expect(()=>repo.unpublish('offline:b',card.id)).toThrow();repo.unpublish('offline:a',card.id);
    expect(()=>repo.publicCard(card.id)).toThrow(/withdrawn/);
  });
  it('derives one-level lineage and pins exact source version without copying authority',()=>{
    const root=repo.create('offline:a',input),v=root.versions[0].id;
    const p=repo.preview('offline:a',root.id,v),a=repo.claim('offline:a',root.id,p.id,p.payloadHash);repo.simulate('offline:a',a.attempt.id,'open');
    const card=repo.publish('offline:a',root.id,v,['title','parameters','lineage','evidence']);
    repo.save('offline:a',root.id,1,{...input,price:'81000'});
    const child=repo.create('offline:b',{...input,price:'81500',riskNotes:''},{publicationId:card.id,revision:card.revision});
    expect(child).toMatchObject({depth:1,rootId:root.id,sourceVersion:v,attempts:[]});
    expect(child.source?.diff).toContainEqual({field:'price',before:'82000',after:'81500'});
    const childCard=repo.publish('offline:b',child.id,child.versions[0].id,['parameters']);
    expect(childCard.comparison).toBeNull();
    const compared=repo.publish('offline:b',child.id,child.versions[0].id,['parameters','lineage']);
    expect(compared.comparison?.changes).toContainEqual({field:'price',before:'82000',after:'81500'});
    expect(JSON.stringify(compared.comparison)).not.toContain('PRIVATE_RISK_CANARY');
    expect(()=>repo.create('offline:c',input,{publicationId:compared.id,revision:compared.revision})).toThrow(/one level/);
    expect(()=>repo.create('offline:c',input,{publicationId:card.id,revision:0})).toThrow(/changed/);
    repo.unpublish('offline:a',card.id);
    expect(repo.publicCard(compared.id).comparison).toBeNull();
    expect(repo.get('offline:b',child.id).source).toEqual({available:false,publicationId:null,version:null,diff:[]});
    expect(()=>repo.create('offline:c',input,{publicationId:card.id,revision:card.revision})).toThrow();
    expect(repo.get('offline:b',child.id).versions[0].input.price).toBe('81500');
  });
  it('keeps prior executed version evidence after edits and discloses history gaps',()=>{
    const root=repo.create('offline:a',input),v=root.versions[0].id,p=repo.preview('offline:a',root.id,v);
    const a=repo.claim('offline:a',root.id,p.id,p.payloadHash);repo.simulate('offline:a',a.attempt.id,'partial_cancelled');
    const changed=repo.save('offline:a',root.id,1,{...input,title:'Updated'});
    expect(changed.attempts[0].versionId).toBe(v);
    expect(repo.refresh('offline:a',a.attempt.id).execution).toMatchObject({order:'cancelled',filled:'10000',remaining:'10000',coverage:'snapshot_only'});
  });
});
