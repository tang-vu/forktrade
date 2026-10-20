# ForkTrade

A local thesis-to-remix workspace for dreamDEX Perps testnet. **The complete offline path runs; real wallet/order integration and live acceptance are still incomplete.** No wallet was connected, no signature requested, no order sent, and no deployment or bounty submission made.

Write and version a private thesis, review an exact bounded order, approve a labelled synthetic scenario, choose public fields for a local demo card, then create an independently owned one-level remix with a parameter comparison. Fixtures cannot become live evidence.

## Run locally (Windows PowerShell)

Requires Node **24.x** (verified 24.21.0) and npm 11. Exact dependencies/integrities are pinned in package.json/package-lock.json. Use `npm.cmd` when PowerShell blocks npm.ps1; no policy change is needed.

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
# Open http://127.0.0.1:3000
```

No .env or wallet is required. Defaults: offline mode, loopback-only server, SQLite at `.local/offline.db`. Migrations also run safely when opening the database. `Start offline session` creates a random synthetic identity with a private HttpOnly cookie; it does not create or connect a wallet. Each separate browser context gets its own identity. `End session` revokes it; offline sessions are disposable and cannot recover earlier private drafts after logout/expiry. Use separate contexts for the original and independent remix. Load the explicitly labelled synthetic example or enter your own draft.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
# Optional harmless public network verification (no account / signer):
npm.cmd run check:readonly
```

Browser tests start the production build on port 3000 with a separate, uniquely named `.local/e2e-offline-*.db`. Stop any app already using that port first. They exercise 1280px/360px views and write clearly synthetic screenshots under `evidence/`. For a production-mode local run: `npm.cmd run build`, then `npm.cmd run start`. Every local server binds 127.0.0.1. If changing the port, set `FORKTRADE_ORIGIN` to the exact origin (for example `http://127.0.0.1:3001`) before starting; mutation origins are checked.

## Modes, data and permissions

`.env.example` documents `FORKTRADE_MODE` (`offline`, `readonly`, `testnet`), `FORKTRADE_DB`, and disabled auth/execution flags. Offline mode is the implemented editor/preview/card/remix path. Visit `/market` to manually check public chain 50383, BTC metadata and the current book. `GET /api/market` or `check:readonly` performs public reads through an interface with no trader/signer. The script defaults to `evidence/read-only-latest.json`; an optional argument such as `evidence/read-only-m4-2026-10-20.json` preserves earlier snapshots. The owner-derived account adapter is mock-tested but not yet wired to live plans. Readonly/testnet modes still fail closed for private plans and orders; they are **not a ready live-trading flow**. Authentication is disabled by default and requires authorization. Order execution stays disabled in all modes in this increment.

Private versions are append-only and owner-scoped. Request claims use durable unique constraints. A request lost during an effect is reconciled as unknown, with no automatic resend. Public cards expose only selected allowlisted fields; unpublish withdraws future app access and public comparisons. Local demo URLs need the local app to be reachable; they are not hosted. Copied content and screenshots cannot be recalled.

SQLite files, WAL files, sessions, environment files and test traces are ignored by Git. No database reset/seed command deletes execution identities. To back up the local database, stop the server and copy the database together with any remaining `-wal`/`-shm` files to a private location. Do not publish backups or reuse an offline database for testnet mode.

Current source/browser evidence lives in [ACCEPTANCE.md](ACCEPTANCE.md) and the single [progress ledger](IMPLEMENTATION_PLAN.md). Public chain/config snapshot: [read-only evidence](evidence/read-only-2026-10-20.json). Offline screenshots are synthetic and prove no live order. README commands describe the current app, while GOAL/PRODUCT/ARCHITECTURE retain the full target contract.

Implementation branch: `feat/forktrade-core`. User workflow: commit and push each coherent verified update. The repository stays private; deployment, wallet actions, external publication, and submission still require their specified approvals.

## Target end-to-end experience

1. Choose one verified, available perps testnet market and one limit order with GTC time in force.
2. Save a versioned thesis and order plan; preview fresh market and account data, bounds, costs, and risk.
3. The user reviews the exact account, chain, market, side, price, quantity, and other economic fields, then explicitly approves their own testnet order.
4. Reconcile submission, chain confirmation, order acceptance, and fill state separately. Show partial, cancelled, rejected, unavailable, and unknown outcomes honestly.
5. Publish selected nonsecret fields to a shareable card only after an explicit publication choice.
6. A viewer creates a one-level independent remix, sees parameter differences and lineage, reviews fresh conditions, and separately approves their own order.

The initial market is selected from live metadata at M0; a familiar symbol is a candidate, not a hardcoded address or eligibility promise. Limit/GTC is the proposed single order type because it makes an explicit price and resting status visible. If current SDK support or liquidity makes it unsuitable, record a bounded alternative before implementing it. Do not add multiple order types to solve the decision.

## Guide map

| File | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Repository rules, authorization gates, and evidence discipline |
| [GOAL.md](GOAL.md) | One copy-paste implementation objective |
| [PRODUCT.md](PRODUCT.md) | Scope, screens, copy, and product behavior |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Proposed components, records, state machines, and integration seams |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Milestones, dependencies, status ledger, and resume procedure |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Required tests, live evidence, and completion gates |
| [SECURITY.md](SECURITY.md) | Trust boundaries, ownership, privacy, signing, and disclosure |
| [DEMO.md](DEMO.md) | Honest demo script and evidence checklist |
| [BOUNTY.md](BOUNTY.md) | Track requirements, deadlines, and submission gates |
| [SOURCES.md](SOURCES.md) | Source provenance, dated facts, and unresolved environment questions |
| [feedback/README.md](feedback/README.md) | Reproducible feedback workflow and hypothesis backlog |
| [feedback/REPORT_TEMPLATE.md](feedback/REPORT_TEMPLATE.md) | Blank template for a real nonsecurity issue |

## Boundaries and current readiness

No autonomous copy-trading, pooled custody, full social feed, profit leaderboard, AI trading decisions, guaranteed returns, or guaranteed bounty win claims. Testnet paper funds and simulated outcomes are not real profit. Optional AI may only draft structured intent for human review after the core path works.

The repository stays private. Public/judge access, deployment, X posts, bounty submission, wallet setup, funding/claims/approvals, testnet transactions, and mainnet work each require appropriate later authorization. The whitelist/application invitation is access, not an award guarantee. See [BOUNTY.md](BOUNTY.md) for the distinction between app completion and submission readiness.

Source and offline browser checks establish the implemented synthetic path only. Public network reads are recorded separately. No check here establishes a live order, fill, eligibility, accepted report, submission or reward; see the current ledger and acceptance table.
