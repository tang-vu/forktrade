# Proposed architecture and integration contract

Status: target architecture with the offline implementation now present. Exact implemented interfaces live in source; M0 verified public reads and inspected SDK browser-wallet support. Live payload, account context and reconciliation still need completion before M5 passes.

## Baseline and boundaries

Use one Next.js/React TypeScript app with server route handlers, strict domain modules, SQLite/Drizzle storage, Zod validation and Tailwind styling. Current local driver: Node 24 `node:sqlite` with Drizzle `1.0.0-rc.4`, selected after native-addon clean installation failed without a compiler. Vitest covers domain/adapter tests and Playwright covers browser flows. Exact pins are in package.json/lockfile. A local single-instance SQLite deployment is enough for v1; do not assume it works on a distributed/serverless host.

| Component | Responsibility | Must not do |
| --- | --- | --- |
| Editor/review UI | Gather intent, show fresh context and explicit approval | Sign or execute from a view/share/clone event |
| Domain layer | Canonical amounts, constraints, versions, diffs, state reducer | Use floating point for order math |
| Server API | Ownership, validation, persistence, publication, request uniqueness | Store a trading private key or sign for users |
| Read adapter | Market/account snapshots, limits, receipt/order observations | Invoke a trader as a side effect of reads |
| Browser signer adapter | User-approved supported wallet call only | Import keys, silently change chain, or submit in the background |
| Reconciler | Bind observations to persisted identities and mark evidence coverage | Infer a fill from a hash or absence in an open-order list |
| Public projection | Allowlisted share data and neutral comparison | Serialize private records or sessions directly |

An official SDK read-only path exists in the source snapshot; browser signing feasibility remains a dependency. Prefer a supported browser-wallet integration. If the SDK only supports a private-key trading path, do not move keys into the server or browser environment variables. Verify official ABI and wallet-client support for a thin viem transaction adapter, or block live integration with a concrete explanation. Never invent a method or ask for the user's seed phrase.

## Proposed project layout after implementation

```text
app/                    routes, editor, private plan view, public card, comparison
src/domain/             amount parsing, plan validation, canonicalization, diff, state reducer
src/integrations/       official market reads, browser signer, reconciliation
src/server/             ownership sessions, repositories, public projection
src/components/         reusable accessible UI
db/                     schema and versioned migrations
tests/                  unit, integration, offline browser fixtures
```

This layout now exists for the offline app and public read spike. Synthetic adapters remain separate; live mutation paths fail closed. Keep the same boundaries when finishing the live adapter.

## Records and invariants

| Record | Required fields and constraints |
| --- | --- |
| Owner/session | Verified wallet identity, domain-bound one-use nonce, issued/expiry times, session identifier stored securely; no raw private key |
| Thesis | ID, owner, current version pointer; all reads/mutations owner-scoped unless a public projection exists |
| PlanVersion | ID, thesis ID, monotonically increasing version, schema version, canonical text/parameters, content hash, creation time, root/source version IDs and depth |
| MarketSnapshot | Chain ID, pool/system/collateral identities, base/quote decimals, tick/lot/minimum, price/book/risk inputs, source/block/as-of, validity checks |
| Preview | Version/hash, owner/signer context, market snapshot identity, bounds/fees, created/expiry, generation counter |
| Approval | Exact executable-payload hash plus preview/context identity, one-use request binding and expiry; never a reusable standing consent |
| ExecutionAttempt | Durable request ID, owner, plan version, context hash, submission-start time, wallet result, hash/nonce/order correlation when available, transaction and order states |
| Observation | Source, chain/pool/account/order identity, block/hash/as-of, receipt or supported snapshot facts, fill/remainder quantities, history coverage, redacted diagnostic reason |
| Publication | Owner, exact source version, explicit public-field allowlist, public ID/revision, status and publish/unpublish times |

Store raw integer quantities as base-10 strings, not SQL REAL or JSON numbers. Use BigInt or an audited exact-decimal library in arithmetic; convert at explicit boundaries. Parse without float conversion. Canonicalization uses a documented schema, stable field ordering and normalized integer strings; include every economically significant field, not just visible price/size. Cover account, chain, pool, side, order type/time in force, expiry, reduce-only, fee/builder choices and any actual transaction value. Keep human notes and executable payload hashes distinct so evidence can bind both without confusing them.

Saved versions are append-only at the application layer; protect updates with owner checks and optimistic version concurrency. This is not independent immutability: a database administrator can modify a database, and a server timestamp cannot prove that a plan predates a transaction. Do not claim otherwise. No on-chain anchoring is required for v1 and none is authorized by this guide.

## Decimal and risk pipeline

1. Read authoritative per-market metadata. Fail closed if decimals, pool/system identity, minimum size, tick or lot are missing/inconsistent.
2. Parse positive decimal text exactly into raw units for that market. Reject excess fractional digits, ambiguous separators, exponent notation and values outside bounded integer ranges. Never silently round to fit a lot or tick.
3. Check price modulo tick equals zero, quantity modulo lot equals zero, and quantity meets the minimum. Validate units and positive divisors.
4. Calculate notional with exact scaling and deliberate conservative rounding where a bound requires it. Test numerator/denominator and overflow limits. Display any estimate rounding separately from executable values.
5. Refresh current account collateral/equity, positions, open orders, margin mode, permissions and protocol size constraints. Apply a user-reviewed application cap as well as protocol maximums. Do not default to the maximum allowed size. Missing/stale risk inputs block execution.
6. Bind the validated payload and metadata to a short-lived preview. Immediately before invoking the signer, read the current context again and compare; changed values or stale data require a new preview and approval. Rejection/reverts can still occur after a valid preview.

The 2026-10-20 developer snapshot is recorded in SOURCES.md. It illustrates why per-market precision and live sizing matter; it is not a permanent deployment manifest. Do not copy contract addresses, leverage limits or gas constants out of prose as fixed truth.

## Execution and reconciliation

Keep orthogonal state, not one optimistic `success` flag:

| Dimension | States | Evidence rule |
| --- | --- | --- |
| Local approval | draft, previewed, approved, invalidated | Context/payload changes invalidate approval |
| Transaction | not_submitted, submitting, submitted, confirmed, reverted, unknown | Hash establishes submitted only; chain receipt establishes confirmation/revert under verified chain rules |
| Order | unobserved, accepted, open, partial, filled, cancelled, rejected, unknown | Supported protocol observations establish order state and filled/remainder quantities |
| History coverage | complete_for_documented_range, snapshot_only, unavailable | Never imply complete history outside the verified range |

A confirmed transaction may have a rejected order. A partially filled order may later be cancelled with nonzero filled quantity. Absence from an open-order snapshot can mean filled, cancelled, pruned or unavailable; it does not prove which. Preserve last known facts with timestamps and mark unresolved dimensions unknown. Handle reorg/replacement/inconsistent sources by invalidating affected confidence and reconciling, not by keeping a permanent green badge.

Submission protocol:

1. Validate owner/session and plan version; atomically persist the request ID and approved payload/context. Add a uniqueness constraint that prevents two active submissions for the same one-use approval. Bind tab UI and server state to this identity.
2. Recheck the current wallet account, chain and preview validity. Acquire a local single-flight lock and the durable server claim. Only the explicit approved action may invoke the signer.
3. Record submission-start before the wallet call; persist returned hash/correlation immediately. Do not log raw signing material. A server write failure after sending is an uncertain outcome requiring reconciliation, not an invitation to send again.
4. Observe the receipt and supported protocol/order facts; validate chain, pool, owner, order ID and event meaning. Store source/block identity and redacted evidence. Derive status through a tested reducer.
5. On timeout, interruption, account/network change or reconnect, recover the persisted request. Query authoritative snapshots/receipts using known hash, nonce or supported protocol correlation. Use a protocol request marker only if its width, uniqueness and readback semantics are actually verified; a local UUID is not protocol idempotency.
6. If no reliable correlation resolves whether a call landed, keep it unknown, block automatic retry, and show a review path with available explorer/account data. Any new attempt needs a fresh explicit user decision after duplicate risk review. Do not implement exactly-once claims without protocol support.

Refresh observations on public-card load or show a clearly stale as-of state. Bound polling/backoff and stop it when not needed. Reconnect does snapshot reconciliation first, then subscribes again; mark historical events unavailable if a documented replay endpoint is absent. Do not reconstruct a fictional sequence from final state.

## Proposed API contracts

Names are local route designs to implement, not current endpoints:

| Operation | Validation and effect |
| --- | --- |
| Create/verify ownership challenge | Rate limit; domain/chain/nonce/expiry/replay verification; establish secure session only |
| Create/save private version | Session owner; schema/amount checks; optimistic source version; no execution |
| Preview version | Session owner; fresh reads and bounded calculation; no signing side effects |
| Claim execution request | Owner, exact version/context, valid one-use approval; durable uniqueness; no server signing |
| Record/refresh execution | Owner may associate a hash; server verifies on-chain identity before trusting evidence |
| Publish/unpublish | Owner; explicit field allowlist and preview; CSRF protection; increment publication revision |
| Read public card | Public projection only; current publication state; redacted unavailable/missing source handling |
| Create remix | Visible published source version; server derives root/source/depth; new owner; reset all approval/execution fields |

Do not trust client-supplied status, parent depth, owner, filled amount, source hashes or publication fields. Use schema validation at client and server boundaries, and relational constraints on the database. Enumerate public response fields; never spread a private object into a share response.

## Privacy, persistence and local operation

Use secure, HttpOnly, SameSite session cookies where applicable, CSRF protections and a verified ownership challenge. Account connection alone is not authentication. Keep endpoint secrets and sessions out of client bundles, telemetry and repository history. Runtime configuration separates offline, read-only and testnet-execution modes; an allowlisted chain ID and verified configuration gate signing. There is no mainnet fallback.

Use migrations and transactional writes for version creation, request claims and publication changes. Document local DB path and backups. Do not erase or reseed a database containing real execution identities when resetting offline fixtures. SQLite uniqueness prevents concurrent local requests; do not promise multi-instance guarantees without a deployment design.

For public routes, disable unsafe caching or key caches by publication revision and invalidate on unpublish. Return no private draft data in HTML, JSON, error messages, page metadata or any future image render. Explain that copied content and public chain data cannot be revoked. See SECURITY.md for threat cases and ACCEPTANCE.md for verification.
