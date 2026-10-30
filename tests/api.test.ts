import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { openDatabase } from '../src/server/database';
const connection = await openDatabase(':memory:');
vi.mock('../src/server/database', async (original) => ({ ...await original<typeof import('../src/server/database')>(), database: () => connection }));
import { handle } from '../src/server/api';
import { issueChallenge, verifyChallenge, origin } from '../src/server/auth';
import { sessions, challenges } from '../db/schema';
import { eq } from 'drizzle-orm';
beforeAll(() => { process.env.FORKTRADE_MODE = 'offline'; });
afterAll(async () => { await connection.close(); });
const input = { title: 'Offline test', rationale: 'Test rationale', invalidation: 'Condition', riskNotes: 'FAKE_SESSION_SECRET_CANARY', side: 'buy', price: '82000', quantity: '0.0002', quantityCap: '0.001', notionalCap: '100' };
function request(path: string, body?: unknown, cookie?: string, csrf?: string, requestOrigin = origin()) {
    return new Request(`${origin()}/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { origin: requestOrigin, ...(cookie ? { cookie } : {}), ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
async function login() { const response = await handle(request('session/offline', {})); const body = await response.json(); return { cookie: response.headers.get('set-cookie')!.split(';')[0], csrf: body.csrf as string }; }
describe('A01 A02 W02 P02 S01 server trust boundaries', () => {
    it('denies unauthenticated private reads and cross-origin/CSRF mutations', async () => {
        expect((await handle(request('plans'))).status).toBe(401);
        expect((await handle(request('session/offline', {}, undefined, undefined, 'https://malicious.invalid'))).status).toBe(403);
        const a = await login();
        expect((await handle(request('plans', { input }, a.cookie))).status).toBe(403);
    });
    it('rejects forged ownership/lineage/status fields and cross-owner guessed IDs', async () => {
        const a = await login(), b = await login();
        const created = await handle(request('plans', { input }, a.cookie, a.csrf));
        const root = await created.json();
        expect(created.status).toBe(201);
        expect((await handle(request(`plans/${root.id}`, undefined, b.cookie))).status).toBe(404);
        for (const payload of [{ input, owner: 'other' }, { input, depth: 0 }, { input, rootId: root.id }, { input, execution: { tx: 'confirmed' } }])
            expect((await handle(request('plans', payload, a.cookie, a.csrf))).status).toBe(400);
        const preview = await (await handle(request(`plans/${root.id}/preview`, { versionId: root.versions[0].id }, a.cookie, a.csrf))).json();
        const approvals = await Promise.all(Array.from({ length: 4 }, () => handle(request(`plans/${root.id}/approve`, { previewId: preview.id, payloadHash: preview.payloadHash, scenario: 'open' }, a.cookie, a.csrf))));
        const results = await Promise.all(approvals.map(r => r.json()));
        expect(new Set(results.map(r => r.id)).size).toBe(1);
        const publication = await (await handle(request(`plans/${root.id}/publish`, { versionId: root.versions[0].id, fields: ['title', 'parameters', 'evidence'], confirmed: true }, a.cookie, a.csrf))).json();
        const publicResponse = await handle(request(`cards/${publication.id}`));
        expect(publicResponse.headers.get('cache-control')).toContain('no-store');
        const text = await publicResponse.text();
        for (const hidden of ['FAKE_SESSION_SECRET_CANARY', a.csrf, a.cookie, 'offline:'])
            expect(text).not.toContain(hidden);
        await handle(request(`publications/${publication.id}/unpublish`, {}, a.cookie, a.csrf));
        expect((await handle(request(`cards/${publication.id}`))).status).toBe(404);
    });
    it('expires sessions and revokes them on logout', async () => {
        const a = await login();
        await handle(request('session/logout', {}, a.cookie, a.csrf));
        expect((await handle(request('plans', undefined, a.cookie))).status).toBe(401);
        const b = await login();
        await connection.db.update(sessions).set({ expiresAt: 0 }).execute();
        expect((await handle(request('plans', undefined, b.cookie))).status).toBe(401);
    });
    it('rejects expired/replayed/wrong-domain/rejected ownership challenges without real signing', async () => {
        const address = '0x0000000000000000000000000000000000000001', signature = `0x${'ab'.repeat(65)}` as const;
        const challenge = await issueChallenge(address);
        await expect(verifyChallenge(challenge.nonce, address, signature, async () => false)).rejects.toThrow(/rejected/);
        await verifyChallenge(challenge.nonce, address, signature, async () => true);
        await expect(verifyChallenge(challenge.nonce, address, signature, async () => true)).rejects.toThrow(/already/);
        const expired = await issueChallenge(address);
        await connection.db.update(challenges).set({ expiresAt: 0 }).where(eq(challenges.nonce, expired.nonce)).execute();
        await expect(verifyChallenge(expired.nonce, address, signature, async () => true)).rejects.toThrow(/expired/);
        const wrong = await issueChallenge(address);
        await connection.db.update(challenges).set({ domain: 'malicious.invalid' }).where(eq(challenges.nonce, wrong.nonce)).execute();
        await expect(verifyChallenge(wrong.nonce, address, signature, async () => true)).rejects.toThrow(/invalid/);
        expect((await handle(request('auth/challenge', { address }))).status).toBe(403);
    });
});
