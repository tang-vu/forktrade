# ForkTrade

A local thesis-to-remix workspace for dreamDEX Perps testnet. **The offline path runs; actual funded-owner risk reads and exact order simulation pass. Browser ownership authentication and live root/remix acceptance remain unrun.** User-authorized testnet funding was completed outside the application; no order, deployment or bounty submission was made.

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

`.env.example` documents the three modes and disabled permission flags. Offline mode uses synthetic sessions, data and outcomes. `/market`, `GET /api/market` and `check:readonly` read public chain 50383, verified BTC configuration and the current book through an interface with no trader/signer. The script defaults to `evidence/read-only-latest.json`; an optional filename preserves earlier snapshots.

Readonly/testnet modes use a separate database, for example `.local/testnet.db`. A database is permanently bound to offline or testnet data on first use; renaming it cannot promote fixtures. Nonoffline ownership authentication requires `FORKTRADE_AUTH_ENABLED=true` **only after session authorization**. The user connects an existing injected EOA and separately reviews a domain/nonce/expiry-bound ownership challenge. Contract wallets and delegated EOAs are unsupported in v1. Readonly mode can save plans and review fresh account context after authentication but cannot send an order.

Testnet execution additionally requires `FORKTRADE_EXECUTION_ENABLED=true` and `FORKTRADE_ENVIRONMENT_CONFIRMED=true`, dated confirmation of the accepted environment, a permitted live session, and each final order's approval in the app and wallet. All flags default false. The official program-resource environment mapping is [recorded](evidence/environment-2026-10-21.json). Actual funded-owner sizing/margin and exact eth_call passed through the read-only CLI; browser wallet compatibility/authentication and actual order receipts remain unrun. Do not enable flags to work around missing permission or evidence.

The single live path is self-owned BTC limit/GTC, with already funded bank collateral, zero collateral allowance to the bank and no linked funding payer. It blocks automatic wallet funding; it never claims funds, changes allowances or grants authority. Preview and pre-sign checks re-read chain/configuration, precision, account limits/risk, fees and native balance, then simulate the exact call for reverts. The pinned perps ABI declares no return value; simulation cannot establish placement or fill. The review shows the fixed 10,000,000 gas ceiling, maximum native cost, fee caps and future uint64-nanosecond expiry. Changed context or a 15-second expiry requires another review; there is no silent rounding.

The browser awaits a durable server claim before one explicit `eth_sendTransaction` request. The server holds no trading key and never broadcasts. A timeout, reload, duplicate click or lost response reconciles the existing request without resending. A persisted uint64 tag helps correlate an indexed order; it is not a protocol uniqueness guarantee. A known hash can be reattached for read-only verification, and an ambiguous or missing match remains unknown. Observation verifies transaction input, canonical receipt and current order separately; lifecycle logs are bounded to 3,000 blocks, with snapshot/history-gap labels outside available coverage. Missing open orders never imply a fill.

Private versions are append-only and owner-scoped. Public cards expose only fields selected in a private publication preview; unpublish withdraws future app access and comparisons. Address/link disclosure is optional, and transaction links reveal the full account and public activity. Without sufficient disclosed links, execution is labelled owner-reported. The public version hash covers the selected public projection, excludes private notes and is no proof of pre-trade existence. Local demo URLs need the local app to be reachable; they are not hosted. Copied content and screenshots cannot be recalled.

SQLite files, WAL files, sessions, environment files and test traces are ignored by Git. No database reset/seed command deletes execution identities. To back up the local database, stop the server and copy the database together with any remaining `-wal`/`-shm` files to a private location. Do not publish backups or reuse an offline database for testnet mode.

Current source/browser evidence lives in [ACCEPTANCE.md](ACCEPTANCE.md) and the single [progress ledger](IMPLEMENTATION_PLAN.md). Latest public chain/config snapshot: [read-only evidence](evidence/read-only-m5-2026-10-20.json). Offline screenshots are synthetic and prove no live order. Mock-wallet browser routes intercept all live APIs and never reach a real signer or account. README commands describe the current app, while GOAL/PRODUCT/ARCHITECTURE retain the full target contract.

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
