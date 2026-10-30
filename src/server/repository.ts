import { randomUUID, randomBytes } from 'node:crypto';
import { and, eq, desc, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import * as t from '../../db/schema';
import { type DatabaseConnection } from './database';
import { type PlanInput, type Preview, type MarketContext, type MarketIdentity, marketIdentity, normalizePlan, hash, makePreview, verifyPreview, diffPlans } from '../domain/plan';
import { initialExecution, simulate, reconcile, type Observation, type Execution, type OfflineScenario } from '../domain/execution';
import { offlineContext } from '../integrations/offline';
import { invariant } from '../domain/errors';
import { EXPLORER } from '../integrations/network';
import type { WalletReport } from '../integrations/browser-wallet';
export function correlationTag(): string { let value = 0n; while (value === 0n)
    value = BigInt(`0x${randomBytes(8).toString('hex')}`); return value.toString(); }
export const publicFields = z.array(z.enum(['title', 'rationale', 'invalidation', 'parameters', 'lineage', 'evidence', 'address', 'links'])).min(1).max(8).refine(v => new Set(v).size === v.length, 'Duplicate public fields');
export type PublicField = z.infer<typeof publicFields>[number];
export type Version = {
    id: string;
    planId: string;
    version: number;
    input: PlanInput;
    market: MarketIdentity;
    hash: string;
    createdAt: number;
};
export type Attempt = {
    id: string;
    versionId: string;
    previewId: string;
    createdAt: number;
    candidateHash: string | null;
    execution: Execution;
};
function readVersion(row: typeof t.versions.$inferSelect): Version {
    return { id: row.id, planId: row.planId, version: row.version, input: JSON.parse(row.data) as PlanInput, market: row.market ? JSON.parse(row.market) as MarketIdentity : marketIdentity(offlineContext('legacy-offline')), hash: row.hash, createdAt: row.createdAt };
}
function readAttempt(row: typeof t.attempts.$inferSelect): Attempt {
    return { id: row.id, versionId: row.versionId, previewId: row.previewId, createdAt: row.createdAt, candidateHash: row.candidateHash, execution: JSON.parse(row.data) as Execution };
}
export class Repository {
    constructor(private connection: DatabaseConnection, private dataMode: 'offline' | 'testnet' = 'offline', private inTransaction = false, private snapshot=false) { }
    private get db() { return this.connection.db; }
    private transaction<T>(fn: (repo: Repository) => Promise<T>): Promise<T> { return this.db.transaction(async (tx) => fn(new Repository({ db: tx, close: async () => { } }, this.dataMode, true))); }
    private read<T>(fn:(repo:Repository)=>Promise<T>):Promise<T> {
        return this.db.transaction(tx=>fn(new Repository({db:tx,close:async()=>{}},this.dataMode,false,true)),{isolationLevel:'repeatable read',accessMode:'read only'});
    }
    private async owned(owner: string, id: string) {
        const query=this.db.select().from(t.plans).where(and(eq(t.plans.id,id),eq(t.plans.owner,owner),eq(t.plans.mode,this.dataMode)));
        const [plan]=await (this.inTransaction?query.for('update'):query);
        invariant(plan, 'Plan unavailable', 404);
        return plan;
    }
    async list(owner: string) {
        const rows=await this.db.select({plan:t.plans,version:t.versions}).from(t.plans)
            .innerJoin(t.versions,and(eq(t.versions.planId,t.plans.id),eq(t.versions.version,t.plans.currentVersion)))
            .where(and(eq(t.plans.owner,owner),eq(t.plans.mode,this.dataMode))).orderBy(desc(t.plans.createdAt));
        return rows.map(({plan,version})=>({id:plan.id,currentVersion:plan.currentVersion,depth:plan.depth,title:readVersion(version).input.title}));
    }
    private async version(owner: string, planId: string, versionId: string) {
        await this.owned(owner, planId);
        const v = (await this.db.select().from(t.versions).where(and(eq(t.versions.id, versionId), eq(t.versions.planId, planId))).limit(1))[0];
        invariant(v, 'Version unavailable', 404);
        return readVersion(v);
    }
    private context(owner: string, context?: MarketContext) {
        if (this.dataMode === 'offline')
            return offlineContext(owner);
        invariant(context && context.mode === 'testnet' && context.chainId === 50383 && context.owner === owner && !context.pool.startsWith('synthetic:'), 'Verified owner/market context required');
        invariant(Date.now() >= context.observedAt && Date.now() - context.observedAt <= 10000, 'Fresh metadata/context required');
        return context;
    }
    private async append(planId: string, input: PlanInput, version: number, context: MarketContext) {
        const market = marketIdentity(context);
        const record = { id: randomUUID(), planId, version, data: JSON.stringify(input), market: JSON.stringify(market), hash: hash({ schema: 2, input, market }), createdAt: Date.now() };
        await this.db.insert(t.versions).values(record).execute();
        return readVersion(record);
    }
    async create(owner: string, input: PlanInput, source?: {
        publicationId: string;
        revision: number;
    }, context?: MarketContext) {
        return await this.transaction(async (tx) => {
            const ctx = tx.context(owner, context), normalized = normalizePlan(input, ctx);
            const id = randomUUID();
            let sourceVersion: string | null = null, sourcePublication: string | null = null, rootId: string = id, depth = 0;
            if (source) {
                const [initial]=await tx.db.select().from(t.publications).where(and(eq(t.publications.id,source.publicationId),eq(t.publications.active,true)));
                invariant(initial,'Source publication unavailable or changed',409);
                const [initialVersion]=await tx.db.select().from(t.versions).where(eq(t.versions.id,initial.versionId));
                // Lock source plan before publication, matching the publisher's lock order.
                const [parent]=await tx.db.select().from(t.plans).where(eq(t.plans.id,initialVersion.planId)).for('share');
                const [publication]=await tx.db.select().from(t.publications).where(and(eq(t.publications.id,source.publicationId),eq(t.publications.active,true))).for('share');
                invariant(publication && publication.revision === source.revision, 'Source publication unavailable or changed', 409);
                const fields = publicFields.parse(JSON.parse(publication.fields));
                invariant(fields.includes('parameters'), 'Source parameters are not published', 409);
                const v = (await tx.db.select().from(t.versions).where(eq(t.versions.id, publication.versionId)).limit(1))[0]!;
                invariant(parent.depth === 0, 'Only original plans can be remixed; one level maximum', 409);
                invariant(parent.mode === tx.dataMode, 'Live and fixture lineage cannot cross', 409);
                invariant(hash(readVersion(v).market) === hash(marketIdentity(ctx)), 'Source market identity changed; cannot silently remix another deployment', 409);
                sourceVersion = v.id;
                sourcePublication = publication.id;
                rootId = parent.rootId;
                depth = 1;
            }
            await tx.db.insert(t.plans).values({ id, owner, mode: tx.dataMode, currentVersion: 1, rootId, sourceVersion, sourcePublication, depth, createdAt: Date.now() }).execute();
            await tx.append(id, normalized, 1, ctx);
            return await tx.get(owner, id);
        });
    }
    async save(owner: string, id: string, expectedVersion: number, input: PlanInput, context?: MarketContext) {
        return await this.transaction(async (tx) => {
            const plan = await tx.owned(owner, id);
            invariant(plan.currentVersion === expectedVersion, 'This plan changed in another tab; reload before saving', 409);
            const ctx = tx.context(owner, context), normalized = normalizePlan(input, ctx);
            const version = plan.currentVersion + 1;
            await tx.append(id, normalized, version, ctx);
            await tx.db.update(t.plans).set({ currentVersion: version }).where(eq(t.plans.id, id)).execute();
            return await tx.get(owner, id);
        });
    }
    async get(owner: string, id: string) {
        return this.inTransaction||this.snapshot?this.getSnapshot(owner,id):this.read(repo=>repo.getSnapshot(owner,id));
    }
    private async getSnapshot(owner:string,id:string) {
        const plan = await this.owned(owner, id);
        const versions = (await this.db.select().from(t.versions).where(eq(t.versions.planId, id)).orderBy(desc(t.versions.version))).map(readVersion);
        const attempts = (await this.db.select().from(t.attempts).where(and(eq(t.attempts.planId, id), eq(t.attempts.owner, owner)))).map(readAttempt);
        const publications = (await this.db.select().from(t.publications).where(inArray(t.publications.versionId,versions.map(v=>v.id))))
            .map(p=>({id:p.id,versionId:p.versionId,fields:publicFields.parse(JSON.parse(p.fields)),revision:p.revision,active:p.active}));
        let source: null | {
            available: boolean;
            publicationId: string | null;
            version: number | null;
            diff: ReturnType<typeof diffPlans>;
        } = null;
        if (plan.sourceVersion) {
            const p = plan.sourcePublication ? (await this.db.select().from(t.publications).where(and(eq(t.publications.id, plan.sourcePublication), eq(t.publications.active, true))).limit(1))[0] : undefined;
            const v = (await this.db.select().from(t.versions).where(eq(t.versions.id, plan.sourceVersion)).limit(1))[0];
            if (p && v) {
                const sourceInput = readVersion(v).input;
                const fields = publicFields.parse(JSON.parse(p.fields));
                const allowed: Partial<PlanInput> = {};
                for (const field of ['title', 'rationale', 'invalidation'] as const)
                    if (fields.includes(field))
                        allowed[field] = sourceInput[field];
                if (fields.includes('parameters')) {
                    allowed.side = sourceInput.side;
                    for (const field of ['price', 'quantity', 'quantityCap', 'notionalCap'] as const)
                        allowed[field] = sourceInput[field];
                }
                source = { available: true, publicationId: p.id, version: v.version, diff: diffPlans(allowed, versions[0].input) };
            }
            else
                source = { available: false, publicationId: null, version: null, diff: [] };
        }
        return { id: plan.id, mode: this.dataMode, currentVersion: plan.currentVersion, rootId: plan.rootId, sourceVersion: plan.sourceVersion, depth: plan.depth, versions, attempts, publications, source };
    }
    async preview(owner: string, id: string, versionId: string, context?: MarketContext, tag?: string) {
        return await this.transaction(async (tx) => {
            const plan = await tx.owned(owner, id), version = await tx.version(owner, id, versionId);
            invariant(version.version === plan.currentVersion, 'Preview the current version', 409);
            invariant(!(await tx.db.select().from(t.attempts).where(eq(t.attempts.versionId, versionId)).limit(1))[0], 'This version already has an execution request; refresh its status', 409);
            const unknown = (await tx.db.select().from(t.attempts).where(eq(t.attempts.planId, id))).some(a => ['unknown', 'submitting', 'submitted'].includes((JSON.parse(a.data) as Execution).tx));
            invariant(!unknown, 'An existing request is unresolved; reconcile before any new attempt', 409);
            const ctx = tx.context(owner, context);
            invariant(hash(version.market) === hash(marketIdentity(ctx)), 'Market identity changed since this version; save and review a new version', 409);
            const clientTag = tx.dataMode === 'testnet' ? tag : null;
            invariant(tx.dataMode === 'offline' || clientTag, 'Server-generated correlation tag required');
            const preview = makePreview(version.input, ctx, Date.now(), clientTag || '0');
            const previewId = randomUUID();
            await tx.db.insert(t.previews).values({ id: previewId, owner, versionId, data: JSON.stringify(preview), clientTag, expiresAt: preview.expiresAt }).execute();
            return { id: previewId, versionId, ...preview };
        });
    }
    async claim(owner: string, id: string, previewId: string, payloadHash: string, context?: MarketContext) {
        return await this.transaction(async (tx) => {
            const plan = await tx.owned(owner, id);
            const row = (await tx.db.select().from(t.previews).where(and(eq(t.previews.id, previewId), eq(t.previews.owner, owner))).limit(1))[0];
            invariant(row, 'Preview unavailable', 404);
            const version = await tx.version(owner, id, row.versionId);
            const preview = JSON.parse(row.data) as Preview;
            invariant(preview.payloadHash === payloadHash, 'Approved payload does not match preview', 409);
            const existing = (await tx.db.select().from(t.attempts).where(eq(t.attempts.versionId, version.id)).limit(1))[0];
            if (existing)
                return { attempt: readAttempt(existing), claimed: false };
            invariant(plan.currentVersion === version.version, 'Plan edited since preview; review again', 409);
            verifyPreview(preview, tx.context(owner, context));
            // All identity is durably committed before the caller may invoke any effect.
            const execution = initialExecution(owner, preview.context.chainId, preview.context.pool, preview.amounts.quantity, tx.dataMode);
            execution.approvedAt = Date.now();
            execution.submissionStartedAt = Date.now();
            execution.baseDecimals = preview.context.baseDecimals;
            execution.quoteDecimals = preview.context.quoteDecimals;
            execution.tx = 'submitting';
            execution.reason = 'Request persisted; effect not yet observed';
            const record = { id: randomUUID(), owner, planId: id, versionId: version.id, previewId, payloadHash, contextHash: preview.contextHash, candidateHash: null, data: JSON.stringify(execution), createdAt: Date.now() };
            await tx.db.insert(t.attempts).values(record).execute();
            await tx.db.insert(t.observations).values({ id: randomUUID(), attemptId: record.id, data: record.data, createdAt: Date.now() }).execute();
            return { attempt: readAttempt(record), claimed: true };
        });
    }
    async getPreview(owner: string, id: string, previewId: string) {
        await this.owned(owner, id);
        const row = (await this.db.select().from(t.previews).where(and(eq(t.previews.id, previewId), eq(t.previews.owner, owner))).limit(1))[0];
        invariant(row, 'Preview unavailable', 404);
        await this.version(owner, id, row.versionId);
        return { id: row.id, versionId: row.versionId, ...JSON.parse(row.data) as Preview };
    }
    async getAttempt(owner: string, id: string) {
        let [row]=await this.db.select().from(t.attempts).where(and(eq(t.attempts.id,id),eq(t.attempts.owner,owner)));
        invariant(row, 'Request unavailable', 404);
        await this.owned(owner, row.planId);
        if(this.inTransaction)[row]=await this.db.select().from(t.attempts).where(and(eq(t.attempts.id,id),eq(t.attempts.owner,owner))).for('update');
        return { attempt: readAttempt(row), preview: await this.getPreview(owner, row.planId, row.previewId) };
    }
    async walletRequest(owner: string, tag: string) {
        invariant(this.dataMode === 'testnet' && /^[1-9][0-9]{0,19}$/.test(tag) && BigInt(tag) < (1n << 64n), 'Unsupported wallet request', 404);
        const row = (await this.db.select().from(t.previews).where(and(eq(t.previews.clientTag, tag), eq(t.previews.owner, owner))).limit(1))[0];
        invariant(row, 'Wallet request unavailable', 404);
        const request = (await this.db.select().from(t.attempts).where(and(eq(t.attempts.previewId, row.id), eq(t.attempts.owner, owner))).limit(1))[0];
        invariant(request, 'No durable approval exists for this wallet request', 409);
        const plan = await this.owned(owner, request.planId), version = await this.version(owner, plan.id, row.versionId), result = await this.getAttempt(owner, request.id);
        invariant(plan.currentVersion === version.version && Date.now() < result.preview.expiresAt, 'Wallet review expired or plan changed; fresh review required', 409);
        invariant(result.attempt.execution.tx === 'submitting' && !result.attempt.execution.hash && !result.attempt.candidateHash, 'Wallet request already observed; reconcile instead of resending', 409);
        return { ...result, input: version.input };
    }
    async recordObservation(owner: string, id: string, observation: Observation) {
        return await this.transaction(async (tx) => {
            const { attempt } = await tx.getAttempt(owner, id), execution = reconcile(attempt.execution, observation);
            await tx.db.update(t.attempts).set({ data: JSON.stringify(execution) }).where(eq(t.attempts.id, id)).execute();
            await tx.db.insert(t.observations).values({ id: randomUUID(), attemptId: id, data: JSON.stringify(execution), createdAt: Date.now() }).execute();
            return { ...attempt, execution };
        });
    }
    async recordWalletResult(owner: string, id: string, result: WalletReport) {
        return await this.transaction(async (tx) => {
            invariant(tx.dataMode === 'testnet', 'Wallet reports cannot enter offline records');
            const { attempt } = await tx.getAttempt(owner, id), prior = attempt.execution;
            if (result.kind === 'hash') {
                invariant(/^0x[a-fA-F0-9]{64}$/.test(result.hash), 'Malformed hash');
                invariant(!prior.hash || prior.hash.toLowerCase() === result.hash.toLowerCase(), 'Known transaction cannot be replaced', 409);
                await tx.db.update(t.attempts).set({ candidateHash: result.hash }).where(eq(t.attempts.id, id)).execute();
                await tx.db.insert(t.observations).values({ id: randomUUID(), attemptId: id, data: JSON.stringify({ source: 'browser_candidate_not_evidence', hash: result.hash }), createdAt: Date.now() }).execute();
                return { ...attempt, candidateHash: result.hash };
            }
            // Late browser errors cannot erase independently verified on-chain facts.
            if (prior.hash)
                return attempt;
            const notSent = (result.kind === 'rejected' || result.kind === 'context_changed') && !attempt.candidateHash;
            const execution: Execution = { ...prior, tx: notSent ? 'not_submitted' : 'unknown', order: notSent ? 'unobserved' : 'unknown', coverage: 'unavailable', observedAt: Date.now(), source: 'browser-reported local result; no chain evidence',
                reason: attempt.candidateHash ? 'A candidate hash exists; outcome remains unresolved despite a later wallet report. No retry.' : result.kind === 'rejected' ? 'Wallet reported rejection before broadcast. No submitted claim.' : result.kind === 'context_changed' ? 'Wallet/account/network changed before the signing call. Review a new version.' : 'Wallet call interrupted. Existing request retained; reconcile, never resend.' };
            await tx.db.update(t.attempts).set({ data: JSON.stringify(execution) }).where(eq(t.attempts.id, id)).execute();
            await tx.db.insert(t.observations).values({ id: randomUUID(), attemptId: id, data: JSON.stringify(execution), createdAt: Date.now() }).execute();
            return { ...attempt, execution };
        });
    }
    async simulate(owner: string, id: string, scenario: OfflineScenario) {
        return await this.transaction(async (tx) => {
            invariant(tx.dataMode==='offline','Synthetic scenarios cannot enter live execution records');
            const {attempt}=await tx.getAttempt(owner,id),previous=attempt.execution;
            if (previous.tx !== 'submitting')
                return attempt;
            const execution = simulate(previous, scenario);
            await tx.db.update(t.attempts).set({ data: JSON.stringify(execution) }).where(eq(t.attempts.id, id)).execute();
            await tx.db.insert(t.observations).values({ id: randomUUID(), attemptId: id, data: JSON.stringify(execution), createdAt: Date.now() }).execute();
            return { ...attempt, execution };
        });
    }
    async refresh(owner: string, id: string) {
        return await this.transaction(async (tx) => {
            invariant(tx.dataMode === 'offline', 'Live refresh requires authoritative observation');
            const {attempt}=await tx.getAttempt(owner,id),prior=attempt.execution;
            const execution = { ...prior, observedAt: Date.now(), coverage: 'snapshot_only' as const,
                ...(prior.tx === 'submitting' ? { tx: 'unknown' as const, order: 'unknown' as const, reason: 'Interrupted request; no resend. Reconcile this identity.' } : {}) };
            await tx.db.update(t.attempts).set({ data: JSON.stringify(execution) }).where(eq(t.attempts.id, id)).execute();
            await tx.db.insert(t.observations).values({ id: randomUUID(), attemptId: id, data: JSON.stringify(execution), createdAt: Date.now() }).execute();
            return { ...attempt, execution };
        });
    }
    async publish(owner: string, id: string, versionId: string, fields: PublicField[]) {
        return await this.transaction(async (tx) => {
            await tx.version(owner, id, versionId);
            publicFields.parse(fields);
            const old = (await tx.db.select().from(t.publications).where(eq(t.publications.versionId, versionId)).limit(1))[0];
            const publication = { id: old?.id || randomUUID(), owner, versionId, fields: JSON.stringify(fields), revision: (old?.revision || 0) + 1, active: true, updatedAt: Date.now() };
            if (old)
                await tx.db.update(t.publications).set(publication).where(eq(t.publications.id, old.id)).execute();
            else
                await tx.db.insert(t.publications).values(publication).execute();
            return await tx.publicCard(publication.id);
        });
    }
    async unpublish(owner: string, id: string) {
        return this.transaction(async tx=>{
            const [publication]=await tx.db.select().from(t.publications).where(and(eq(t.publications.id,id),eq(t.publications.owner,owner)));
            invariant(publication,'Publication unavailable',404);
            const [version]=await tx.db.select().from(t.versions).where(eq(t.versions.id,publication.versionId));
            await tx.owned(owner,version.planId);
            await tx.db.update(t.publications).set({active:false,updatedAt:Date.now(),revision:sql`${t.publications.revision}+1`}).where(and(eq(t.publications.id,id),eq(t.publications.owner,owner)));
            return {withdrawn:true};
        });
    }
    async publishedAttempt(id: string) {
        const p = (await this.db.select().from(t.publications).where(and(eq(t.publications.id, id), eq(t.publications.active, true))).limit(1))[0];
        invariant(p, 'Card unavailable or withdrawn', 404);
        const fields = publicFields.parse(JSON.parse(p.fields));
        if (!fields.includes('evidence'))
            return null;
        const row = (await this.db.select().from(t.attempts).where(eq(t.attempts.versionId, p.versionId)).limit(1))[0];
        if (!row)
            return null;
        await this.owned(p.owner, row.planId);
        return { owner: p.owner, id: row.id };
    }
    async publicCard(id: string) {
        return this.inTransaction||this.snapshot?this.cardSnapshot(id):this.read(repo=>repo.cardSnapshot(id));
    }
    private async cardSnapshot(id:string) {
        const p = (await this.db.select().from(t.publications).where(and(eq(t.publications.id, id), eq(t.publications.active, true))).limit(1))[0];
        invariant(p, 'Card unavailable or withdrawn', 404);
        return await this.projectPublication(p);
    }
    async publicationPreview(owner: string, id: string, versionId: string, fields: PublicField[]) {
        return this.inTransaction||this.snapshot?this.previewPublicationSnapshot(owner,id,versionId,fields):this.read(repo=>repo.previewPublicationSnapshot(owner,id,versionId,fields));
    }
    private async previewPublicationSnapshot(owner:string,id:string,versionId:string,fields:PublicField[]) {
        await this.version(owner, id, versionId);
        publicFields.parse(fields);
        const old = (await this.db.select().from(t.publications).where(eq(t.publications.versionId, versionId)).limit(1))[0];
        return await this.projectPublication({ id: old?.id || 'preview', owner, versionId, fields: JSON.stringify(fields), revision: (old?.revision || 0) + 1, active: true, updatedAt: Date.now() });
    }
    private async projectPublication(p: typeof t.publications.$inferSelect) {
        const row = (await this.db.select().from(t.versions).where(eq(t.versions.id, p.versionId)).limit(1))[0]!;
        const v = readVersion(row);
        const plan = (await this.db.select().from(t.plans).where(eq(t.plans.id, v.planId)).limit(1))[0]!;
        invariant(plan.mode === this.dataMode, 'Card unavailable in this data mode', 404);
        const fields = publicFields.parse(JSON.parse(p.fields));
        const input = v.input;
        const attempt = fields.includes('evidence') ? (await this.db.select().from(t.attempts).where(eq(t.attempts.versionId, v.id)).limit(1))[0] : undefined;
        const e = attempt ? readAttempt(attempt).execution : null;
        let comparison: null | {
            sourcePublicationId: string;
            sourceVersion: number;
            changes: ReturnType<typeof diffPlans>;
        } = null;
        if (fields.includes('lineage') && plan.sourceVersion && plan.sourcePublication) {
            const sourcePub = (await this.db.select().from(t.publications).where(and(eq(t.publications.id, plan.sourcePublication), eq(t.publications.active, true))).limit(1))[0];
            const sourceRow = (await this.db.select().from(t.versions).where(eq(t.versions.id, plan.sourceVersion)).limit(1))[0];
            if (sourcePub && sourceRow) {
                const sourceFields = publicFields.parse(JSON.parse(sourcePub.fields)), sourceInput = readVersion(sourceRow).input, allowed: Partial<PlanInput> = {};
                for (const field of ['title', 'rationale', 'invalidation'] as const)
                    if (fields.includes(field) && sourceFields.includes(field))
                        allowed[field] = sourceInput[field];
                if (fields.includes('parameters') && sourceFields.includes('parameters')) {
                    allowed.side = sourceInput.side;
                    for (const field of ['price', 'quantity', 'quantityCap', 'notionalCap'] as const)
                        allowed[field] = sourceInput[field];
                }
                comparison = { sourcePublicationId: sourcePub.id, sourceVersion: sourceRow.version, changes: diffPlans(allowed, input) };
            }
        }
        // Enumerate each public field. Never spread a private record into this response.
        const live = this.dataMode === 'testnet';
        const level = !live ? 'synthetic' : fields.includes('links') && e?.identityVerified && e.hash ? (e.tx === 'confirmed' && ['accepted', 'open', 'partial', 'filled', 'cancelled'].includes(e.order) ? 'verified_order' : e.tx === 'confirmed' ? 'chain_confirmed' : 'unknown') : 'owner_reported';
        return { id: p.id, revision: p.revision, mode: this.dataMode, hosted:Boolean(process.env.VERCEL), label: live ? 'Testnet / paper funds' : 'Synthetic offline demo · no live evidence',
            version: v.version, versionHash: hash({ schema: 1, version: v.version, fields, title: fields.includes('title') ? input.title : null, rationale: fields.includes('rationale') ? input.rationale : null, invalidation: fields.includes('invalidation') ? input.invalidation : null, parameters: fields.includes('parameters') ? { side: input.side, price: input.price, quantity: input.quantity, quantityCap: input.quantityCap, notionalCap: input.notionalCap, market: v.market } : null }), fields,
            title: fields.includes('title') ? input.title : null,
            rationale: fields.includes('rationale') ? input.rationale : null,
            invalidation: fields.includes('invalidation') ? input.invalidation : null,
            parameters: fields.includes('parameters') ? { side: input.side, price: input.price, quantity: input.quantity, quantityCap: input.quantityCap, notionalCap: input.notionalCap, market: v.market.symbol, chainId: v.market.chainId, pool: v.market.pool, type: 'limit', timeInForce: 'GTC', reduceOnly: false } : null,
            lineage: fields.includes('lineage') ? { depth: plan.depth, sourceAvailable: plan.sourcePublication ? Boolean((await this.db.select().from(t.publications).where(and(eq(t.publications.id, plan.sourcePublication), eq(t.publications.active, true))).limit(1))[0]) : null } : null,
            evidence: e ? { tx: e.tx, order: e.order, filled: e.filled, remaining: e.remaining, baseDecimals: v.market.baseDecimals, observedAt: e.observedAt, coverage: e.coverage, reason: e.reason, level } : null,
            address: live && fields.includes('address') ? plan.owner : null,
            links: live && fields.includes('links') && e?.hash ? { transaction: `${EXPLORER}/tx/${e.hash}`, hash: e.hash, orderId: e.orderId } : null,
            comparison, canRemix: plan.depth === 0 && fields.includes('parameters'), updatedAt: p.updatedAt };
    }
}
export type PlanDetail = Awaited<ReturnType<Repository['get']>>;
export type PublicCard = Awaited<ReturnType<Repository['publicCard']>>;
export type StoredPreview = Awaited<ReturnType<Repository['preview']>>;
