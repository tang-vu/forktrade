import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { openDatabase, bindDataMode } from '../src/server/database';
import { Repository } from '../src/server/repository';
import type { PlanInput } from '../src/domain/plan';
import {sql,count} from 'drizzle-orm';
import {dataModes,attempts} from '../db/schema';
const input: PlanInput = { title: 'Synthetic original', rationale: 'Public rationale', invalidation: 'Condition', riskNotes: 'PRIVATE_RISK_CANARY', side: 'buy', price: '82000', quantity: '0.0002', quantityCap: '0.001', notionalCap: '100' };
let connection: Awaited<ReturnType<typeof openDatabase>>, repo: Repository;
beforeEach(async () => { connection = await openDatabase(':memory:'); repo = new Repository(connection); });
afterEach(async () => await connection.close());
describe('V/A/L/P/W durable owner-scoped version and publication path', () => {
    it('binds the data mode independently of a database filename', async () => {
        await bindDataMode(connection, 'offline');
        await bindDataMode(connection, 'offline');
        await expect(bindDataMode(connection, 'testnet')).rejects.toThrow(/different data mode/);
        expect(await connection.db.select({mode:dataModes.mode}).from(dataModes)).toEqual([{mode:'offline'}]);
    });
    it('public projection hashes exclude unselected private notes', async () => {
        const a = await repo.create('offline:a', input), b = await repo.create('offline:a', { ...input, riskNotes: 'DIFFERENT_PRIVATE_CANARY' });
        const first = await repo.publicationPreview('offline:a', a.id, a.versions[0].id, ['title', 'parameters']), second = await repo.publicationPreview('offline:a', b.id, b.versions[0].id, ['title', 'parameters']);
        expect(first.versionHash).toBe(second.versionHash);
        expect((await repo.get('offline:a', a.id)).publications).toEqual([]);
    });
    it('starts empty, normalizes and saves append-only versions with optimistic concurrency', async () => {
        expect(await repo.list('offline:a')).toEqual([]);
        const root = await repo.create('offline:a', input);
        const p = await repo.preview('offline:a', root.id, root.versions[0].id);
        const updated = await repo.save('offline:a', root.id, 1, { ...input, title: 'New title' });
        expect(updated.versions).toHaveLength(2);
        expect(updated.versions[1].input.title).toBe(input.title);
        await expect(repo.save('offline:a', root.id, 1, input)).rejects.toThrow(/another tab/);
        await expect(repo.claim('offline:a', root.id, p.id, p.payloadHash)).rejects.toThrow(/edited/);
        await expect(connection.db.execute(sql`UPDATE versions SET hash='tampered'`)).rejects.toMatchObject({cause:{message:expect.stringContaining('append-only')}});
        expect((await repo.get('offline:a',root.id)).versions[0].hash).toBe(updated.versions[0].hash);
    });
    it('keeps private drafts and all mutations owner-scoped', async () => {
        const root = await repo.create('offline:a', input), v = root.versions[0].id;
        for (const operation of [async () => await repo.get('offline:b', root.id), async () => await repo.save('offline:b', root.id, 1, input), async () => await repo.preview('offline:b', root.id, v), async () => await repo.publish('offline:b', root.id, v, ['title'])])
            await expect(operation()).rejects.toThrow(/unavailable/);
        await expect(repo.publicCard(root.id)).rejects.toThrow();
        expect(await repo.list('offline:b')).toEqual([]);
    });
    it('claims once across previews and preserves identity before any side effect', async () => {
        const root = await repo.create('offline:a', input), v = root.versions[0].id;
        const p = await repo.preview('offline:a', root.id, v), q = await repo.preview('offline:a', root.id, v);
        const a = await repo.claim('offline:a', root.id, p.id, p.payloadHash), b = await repo.claim('offline:a', root.id, q.id, q.payloadHash);
        expect(a.claimed).toBe(true);
        expect(b.claimed).toBe(false);
        expect(b.attempt.id).toBe(a.attempt.id);
        expect(a.attempt.execution.tx).toBe('submitting');
        expect(await connection.db.select({n:count()}).from(attempts)).toEqual([{n:1}]);
        await expect(repo.preview('offline:a', root.id, v)).rejects.toThrow(/already/);
        expect((await repo.refresh('offline:a', a.attempt.id)).execution.tx).toBe('unknown');
        await repo.save('offline:a', root.id, 1, { ...input, title: 'Review again' });
        await expect(repo.preview('offline:a', root.id, (await repo.get('offline:a', root.id)).versions[0].id)).rejects.toThrow(/unresolved/);
    });
    it('rejects payload tampering and expired previews before creating requests', async () => {
        const root = await repo.create('offline:a', input), p = await repo.preview('offline:a', root.id, root.versions[0].id);
        await expect(repo.claim('offline:a', root.id, p.id, 'bad')).rejects.toThrow(/payload/);
        await connection.db.execute(sql`UPDATE previews SET data=jsonb_set(data::jsonb,'{expiresAt}','0')::text`);
        await expect(repo.claim('offline:a', root.id, p.id, p.payloadHash)).rejects.toThrow(/expired/);
        expect((await repo.get('offline:a', root.id)).attempts).toHaveLength(0);
    });
    it('exposes only selected fields and never execution/session/owner material', async () => {
        const root = await repo.create('offline:a', input), v = root.versions[0].id;
        const card = await repo.publish('offline:a', root.id, v, ['title', 'parameters']);
        const json = JSON.stringify(card);
        for (const canary of ['PRIVATE_RISK_CANARY', 'Public rationale', 'offline:a', 'previewId', 'contextHash'])
            expect(json).not.toContain(canary);
        expect(card.evidence).toBeNull();
        expect(card.label).toContain('Synthetic');
        await expect(repo.publish('offline:a', root.id, v, ['riskNotes' as 'title'])).rejects.toThrow();
        await expect(repo.unpublish('offline:b', card.id)).rejects.toThrow();
        await repo.unpublish('offline:a', card.id);
        await expect(repo.publicCard(card.id)).rejects.toThrow(/withdrawn/);
    });
    it('derives one-level lineage and pins exact source version without copying authority', async () => {
        const root = await repo.create('offline:a', input), v = root.versions[0].id;
        const p = await repo.preview('offline:a', root.id, v), a = await repo.claim('offline:a', root.id, p.id, p.payloadHash);
        await repo.simulate('offline:a', a.attempt.id, 'open');
        const card = await repo.publish('offline:a', root.id, v, ['title', 'parameters', 'lineage', 'evidence']);
        await repo.save('offline:a', root.id, 1, { ...input, price: '81000' });
        const child = await repo.create('offline:b', { ...input, price: '81500', riskNotes: '' }, { publicationId: card.id, revision: card.revision });
        expect(child).toMatchObject({ depth: 1, rootId: root.id, sourceVersion: v, attempts: [] });
        expect(child.source?.diff).toContainEqual({ field: 'price', before: '82000', after: '81500' });
        const childCard = await repo.publish('offline:b', child.id, child.versions[0].id, ['parameters']);
        expect(childCard.comparison).toBeNull();
        const compared = await repo.publish('offline:b', child.id, child.versions[0].id, ['parameters', 'lineage']);
        expect(compared.comparison?.changes).toContainEqual({ field: 'price', before: '82000', after: '81500' });
        expect(JSON.stringify(compared.comparison)).not.toContain('PRIVATE_RISK_CANARY');
        await expect(repo.create('offline:c', input, { publicationId: compared.id, revision: compared.revision })).rejects.toThrow(/one level/);
        await expect(repo.create('offline:c', input, { publicationId: card.id, revision: 0 })).rejects.toThrow(/changed/);
        await repo.unpublish('offline:a', card.id);
        expect((await repo.publicCard(compared.id)).comparison).toBeNull();
        expect((await repo.get('offline:b', child.id)).source).toEqual({ available: false, publicationId: null, version: null, diff: [] });
        await expect(repo.create('offline:c', input, { publicationId: card.id, revision: card.revision })).rejects.toThrow();
        expect((await repo.get('offline:b', child.id)).versions[0].input.price).toBe('81500');
    });
    it('keeps prior executed version evidence after edits and discloses history gaps', async () => {
        const root = await repo.create('offline:a', input), v = root.versions[0].id, p = await repo.preview('offline:a', root.id, v);
        const a = await repo.claim('offline:a', root.id, p.id, p.payloadHash);
        await repo.simulate('offline:a', a.attempt.id, 'partial_cancelled');
        const changed = await repo.save('offline:a', root.id, 1, { ...input, title: 'Updated' });
        expect(changed.attempts[0].versionId).toBe(v);
        expect((await repo.refresh('offline:a', a.attempt.id)).execution).toMatchObject({ order: 'cancelled', filled: '10000', remaining: '10000', coverage: 'snapshot_only' });
    });
});
