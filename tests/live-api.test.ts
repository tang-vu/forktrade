import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { openDatabase } from '../src/server/database';
import { readFixture, SYNTHETIC_OWNER } from './helpers/read-fixture';
import { readAccountContext, readPublicMarket as actualPublicRead } from '../src/integrations/read-context';
import type { MarketContext, PlanInput } from '../src/domain/plan';
import { DomainError } from '../src/domain/errors';
import { handle } from '../src/server/api';
import { createSession, origin, COOKIE } from '../src/server/auth';
const connection = await openDatabase(':memory:'), fixture = readFixture();
let prepared: MarketContext;
const prepareCalls: {
    owner: string;
    tag: string;
}[] = [];
let observationFails = false;
vi.mock('../src/server/database', async (original) => ({ ...await original<typeof import('../src/server/database')>(), database: () => connection }));
vi.mock('../src/integrations/readonly', async (original) => ({ ...await original<typeof import('../src/integrations/readonly')>(), readPublicMarket: () => actualPublicRead(fixture.connect) }));
vi.mock('../src/integrations/prepare-order', () => ({ prepareLiveContext: async (owner: string, _input: PlanInput, tag: string) => { prepareCalls.push({ owner, tag }); return { ...prepared, owner, signer: owner, observedAt: Date.now() }; } }));
vi.mock('../src/integrations/observe-order', () => ({ observeOrder: async (prior: import('../src/domain/execution').Execution, _payload: unknown, candidate: string) => {
        if (observationFails)
            throw new DomainError('Synthetic evidence association rejected');
        return { ...prior, authoritative: true, identityVerified: true, hash: candidate, tx: 'confirmed', order: 'open', orderId: '42', coverage: 'snapshot_only', source: 'SYNTHETIC observation transport in isolated unit test', block: 'synthetic-block', observedAt: Date.now(), reason: 'Synthetic test only' };
    } }));
const input = { title: 'SYNTHETIC live API contract test', rationale: 'Isolated mock transport, no real wallet or order', invalidation: 'Synthetic condition', riskNotes: 'PRIVATE_RISK_CANARY', side: 'buy' as const, price: '82000', quantity: '0.0002', quantityCap: '0.001', notionalCap: '100' };
const HASH = `0x${'11'.repeat(32)}`;
beforeAll(async () => { prepared = await readAccountContext(SYNTHETIC_OWNER, input, fixture.connect); prepared.transaction = { gas: '10000000', maxFeePerGas: '2', maxPriorityFeePerGas: '1', nativeBalance: '1000000000', nativeDecimals: 18, nativeSymbol: 'STT' }; });
beforeEach(() => { process.env.FORKTRADE_MODE = 'testnet'; process.env.FORKTRADE_AUTH_ENABLED = 'true'; process.env.FORKTRADE_EXECUTION_ENABLED = 'true'; process.env.FORKTRADE_ENVIRONMENT_CONFIRMED = 'true'; observationFails = false; prepareCalls.length = 0; });
afterAll(async () => { await connection.close(); for (const key of ['FORKTRADE_MODE', 'FORKTRADE_AUTH_ENABLED', 'FORKTRADE_EXECUTION_ENABLED', 'FORKTRADE_ENVIRONMENT_CONFIRMED'])
    delete process.env[key]; });
async function login(owner = SYNTHETIC_OWNER) { const s = await createSession(owner, 'testnet'); return { ...s, cookie: `${COOKIE}=${s.raw}` }; }
type Login = Awaited<ReturnType<typeof login>>;
async function call(path: string, body: unknown | undefined, s?: Login) { return handle(new Request(`${origin()}/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { origin: origin(), ...(s ? { cookie: s.cookie, 'x-csrf-token': s.csrf } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })); }
async function plan(s: Login) { return (await call('plans', { input }, s)).json(); }
async function preview(s: Login, p: {
    id: string;
    versions: {
        id: string;
    }[];
}) { return (await call(`plans/${p.id}/preview`, { versionId: p.versions[0].id }, s)).json(); }
describe('live route composition under synthetic-only transports', () => {
    it('wallet companion can read/revalidate only its own durably claimed, current, unused request', async () => {
        const s = await login(), other = await login('0x0000000000000000000000000000000000000002'), p = await plan(s), v = await preview(s, p), tag = v.payload.userData;
        expect((await call(`wallet-requests/${tag}`, undefined, s)).status).toBe(409);
        await call(`plans/${p.id}/approve`, { previewId: v.id, payloadHash: v.payloadHash, confirmed: true }, s);
        expect((await call(`wallet-requests/${tag}`, undefined, other)).status).toBe(404);
        const detail = await (await call(`wallet-requests/${tag}`, undefined, s)).json();
        expect(detail.preview.payloadHash).toBe(v.payloadHash);
        expect((await call(`wallet-requests/${tag}/validate`, { payloadHash: '0'.repeat(64) }, s)).status).toBe(409);
        expect((await (await call(`wallet-requests/${tag}/validate`, { payloadHash: v.payloadHash }, s)).json()).ready).toBe(true);
        await call(`plans/${p.id}/versions`, { expectedVersion: 1, input: { ...input, title: 'SYNTHETIC changed version' } }, s);
        expect((await call(`wallet-requests/${tag}`, undefined, s)).status).toBe(409);
    });
    it('keeps private operations owner-scoped and derives the read owner from the session', async () => {
        const a = await login(), b = await login('0x0000000000000000000000000000000000000002'), p = await plan(a);
        expect((await call(`plans/${p.id}`, undefined, b)).status).toBe(404);
        const v = await preview(a, p);
        expect(v.payload.owner).toBe(a.owner);
        expect(prepareCalls[0].owner).toBe(a.owner);
        expect(BigInt(prepareCalls[0].tag)).toBeGreaterThan(0n);
        expect((await call(`plans/${p.id}/preview`, { versionId: p.versions[0].id, owner: b.owner }, a)).status).toBe(400);
        expect(fixture.forbidden).not.toHaveBeenCalled();
    });
    it('enforces session/environment/read-only gates before creating any execution request', async () => {
        const s = await login(), p = await plan(s), v = await preview(s, p), body = { previewId: v.id, payloadHash: v.payloadHash, confirmed: true };
        for (const key of ['FORKTRADE_EXECUTION_ENABLED', 'FORKTRADE_ENVIRONMENT_CONFIRMED', 'FORKTRADE_AUTH_ENABLED']) {
            process.env[key] = 'false';
            expect((await call(`plans/${p.id}/approve`, body, s)).status).toBe(403);
            process.env[key] = 'true';
        }
        process.env.FORKTRADE_MODE = 'readonly';
        expect((await call(`plans/${p.id}/approve`, body, s)).status).toBe(403);
        process.env.FORKTRADE_MODE = 'testnet';
        expect((await (await call(`plans/${p.id}`, undefined, s)).json()).attempts).toHaveLength(0);
        expect((await call(`plans/${p.id}/approve`, { ...body, confirmed: false }, s)).status).toBe(400);
        expect((await call(`plans/${p.id}/approve`, { ...body, scenario: 'open' }, s)).status).toBe(400);
    });
    it('one exact approval yields one durable signer claim; replay returns only the existing request', async () => {
        const s = await login(), p = await plan(s), v = await preview(s, p), body = { previewId: v.id, payloadHash: v.payloadHash, confirmed: true };
        const results = await Promise.all(Array.from({ length: 4 }, async () => { const response = await call(`plans/${p.id}/approve`, body, s); expect(response.status).toBe(200); return response.json(); }));
        expect(results.filter(r => r.claimed)).toHaveLength(1);
        expect(new Set(results.map(r => r.attemptId)).size).toBe(1);
        expect((await (await call(`plans/${p.id}`, undefined, s)).json()).attempts).toHaveLength(1);
        const rejected = await call(`attempts/${results[0].attemptId}/report`, { kind: 'rejected' }, s);
        expect((await rejected.json()).execution.tx).toBe('not_submitted');
        expect((await (await call(`attempts/${results[0].attemptId}/refresh`, {}, s)).json()).execution.tx).toBe('not_submitted');
    });
    it('only authoritative observations can attach evidence; publication preview is private and exact', async () => {
        const s = await login(), p = await plan(s), v = await preview(s, p), claim = await (await call(`plans/${p.id}/approve`, { previewId: v.id, payloadHash: v.payloadHash, confirmed: true }, s)).json();
        expect((await call(`attempts/${claim.attemptId}/report`, { kind: 'hash', hash: HASH, tx: 'filled', filled: '20000' }, s)).status).toBe(400);
        observationFails = true;
        expect((await call(`attempts/${claim.attemptId}/report`, { kind: 'hash', hash: HASH }, s)).status).toBe(400);
        let current = await (await call(`plans/${p.id}`, undefined, s)).json();
        expect(current.attempts[0].execution).toMatchObject({ tx: 'unknown', order: 'unknown', hash: null });
        observationFails = false;
        await call(`attempts/${claim.attemptId}/refresh`, {}, s);
        const fields = ['title', 'parameters', 'evidence'], proposal = await (await call(`plans/${p.id}/publication-preview`, { versionId: p.versions[0].id, fields }, s)).json();
        expect(proposal.evidence.level).toBe('owner_reported');
        expect(proposal.address).toBeNull();
        expect(proposal.links).toBeNull();
        expect(JSON.stringify(proposal)).not.toContain('PRIVATE_RISK_CANARY');
        current = await (await call(`plans/${p.id}`, undefined, s)).json();
        expect(current.publications).toHaveLength(0);
        const publication = await (await call(`plans/${p.id}/publish`, { versionId: p.versions[0].id, fields: [...fields, 'links'], confirmed: true }, s)).json();
        expect(publication.evidence.level).toBe('verified_order');
        expect(publication.address).toBeNull();
        expect(publication.links.hash).toBe(HASH);
        await call(`publications/${publication.id}/unpublish`, {}, s);
        expect((await call(`cards/${publication.id}`, undefined)).status).toBe(404);
    });
});
