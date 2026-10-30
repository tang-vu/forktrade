# ForkTrade

**Hosted synthetic demo (2026-10-30): [forktrade.vercel.app](https://forktrade.vercel.app)** now runs on Vercel with a new Free Neon PostgreSQL database in Singapore. Actual HTTPS and Chromium desktop/mobile checks passed for private versions, explicit synthetic approval, selected-field share cards and independent remix. Wallet authentication/execution flags remain disabled; this is labelled synthetic data, separate from the historical real orders below. The same private sessions, plans and approval identities survived a second actual production deployment; withdrawal and logout also passed. [Hosted evidence](evidence/vercel-neon-deployment-2026-10-30.json).

A thesis-to-remix workspace for dreamDEX Perps testnet, for traders who want a versioned explanation and an independently editable remix tied to honest order evidence. **The complete narrow path passed on 2026-10-23: real root and separately approved remix, each confirmed/filled 0.00013 BTC with zero remainder, followed by local publication, lineage and parameter comparison. Typecheck/lint/build, 109 unit/integration tests and 23 offline browser scenarios pass.** The two distinct EOAs belong to the same human. Root approval was manual; the exact remix was agent-operated in Edge under explicit delegation. [Actual paired evidence](evidence/live-root-remix-2026-10-23.json), [verification](evidence/mvp-resume-2026-10-23.json), [27.1-second walkthrough](evidence/forktrade-live-walkthrough-2026-10-23.mp4) recorded after execution. Each account retains a testnet long position; no cleanup was sent. Those receipts belong to the prior local SQLite build, not a newly deployed service. The user confirmed on 2026-10-30 that they intentionally made this source repository public and explicitly authorized pushes; the earlier private-storage hold is resolved. The public synthetic app is deployed; separate MVP submission and new hosted live acceptance remain pending. The first X link is user-reported below.

**Active user priority: finish the separate ForkTrade MVP (2026-10-23).** Feedback was submitted first; its status follows. [Reports/candidates 001–008 are published in the separate Feedback repository](https://github.com/tang-vu/dreamdex-perps-feedback), with normal severity proposed. The user's end-to-end Feedback instruction covers the reviewed routine nonsecurity additions and current [eight-report submission](feedback/SUBMISSION.md); no repeat per-report approval is needed. The user reports Feedback submission as [DoraHacks Build 50119](https://dorahacks.io/build/50119) on 2026-10-22. The public Build title and GitHub repository link were independently verified in signed-out Edge; the hackathon/track registration status was not exposed on that page. Organizer acceptance, first-report priority and payment remain unverified. ForkTrade's later MVP submission is separate; current repository storage status is recorded in the ledger.

[Report 001](feedback/001-perps-entry-opens-spot.md) has actual Edge/HTTP evidence of the official Perps entry redirecting to spot. [Report 002](feedback/002-existing-position-bracket-side.md) reproduces an official bot-kit bracket-side mismatch using unchanged pinned source and explicitly synthetic offline fixtures. No live trade, accepted stop or financial-impact outcome is claimed for 002. Current publication at 7e1aade0b87fd9ff5a1bd8d909c1adefb9d97b29 was verified against all 39 remote files and 38 manifest payload hashes/sizes.

Published additions: [003, existing-position startup budget](feedback/003-existing-position-entry-preflight.md) and [005, skipped-quote retry](feedback/005-maker-skipped-quote-retry.md) have bounded offline reproductions and controls. [004, position-cap semantics](feedback/004-maker-position-cap-semantics.md) reproduces behavior but needs clarification of strict-versus-soft cap intent. These do not establish live outcomes, eligibility or rewards. Exact approved submission text and review provenance are in [SUBMISSION.md](feedback/SUBMISSION.md).

Further audit published [006, cancel failure loses quote tracking](feedback/006-maker-cancel-failure-loses-tracking.md), with related-prior-report/duplicate risk disclosed, and [007, unified SDK ignores the distinct perp minimum](feedback/007-sdk-create-order-minimum.md), supported by actual public BTC configuration and 12 offline SDK boundary cases. Both are nonsecurity additions for the existing Feedback workflow; neither establishes a live order or loss. The separate public reproduction package/lock is not an app dependency change.

Additional SDK finding [008, funding-history cursor](feedback/008-sdk-funding-history-cursor.md) is published in that same package. Actual public BTC history returns a row before a millisecond cursor; 10 bounded original-SDK cases and an isolated reproduction passed. All eight items are visible in actual Edge; user-reported submission is linked above, with organizer acceptance/payment still unverified.

Write and version a private thesis, review an exact bounded order, approve a labelled synthetic scenario, choose public fields for a share card, then create an independently owned one-level remix with a parameter comparison. Fixtures cannot become live evidence.

## Run locally (Windows PowerShell)

Requires Node **24.x** (verified 24.21.0) and npm 11. Exact dependencies/integrities are pinned in package.json/package-lock.json. Use `npm.cmd` when PowerShell blocks npm.ps1; no policy change is needed.

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
# Open http://127.0.0.1:3000
```

No .env or wallet is required. Defaults: synthetic offline mode, loopback-only server, embedded PostgreSQL at `.local/offline-pg` when DATABASE_URL is absent. Local migrations run safely on opening that new directory. Existing SQLite files are neither opened nor changed by the new app. Existing `.env.local` settings still take precedence unless overridden; keep them offline for synthetic development. `Start offline session` creates a random synthetic identity with a private HttpOnly cookie; it does not create or connect a wallet. Each separate browser context gets its own identity. `End session` revokes it; offline sessions are disposable and cannot recover earlier private drafts after logout/expiry. Use separate contexts for the original and independent remix. Load the explicitly labelled synthetic example or enter your own draft.

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

Browser tests start the production build on port 3000 with a separate, uniquely named `.local/e2e-offline-pg-*` directory. Stop any app already using that port first. They exercise 1280px/360px views and write clearly synthetic screenshots under `evidence/`. For a production-mode local run: `npm.cmd run build`, then `npm.cmd run start`. Every local server binds 127.0.0.1. If changing the port, set `FORKTRADE_ORIGIN` to the exact origin (for example `http://127.0.0.1:3001`) before starting; mutation origins are checked.

## Prepare Vercel + Neon

Current target: `tang-vu/forktrade`, https://forktrade.vercel.app, Node 24.x, functions in `sin1`, Neon `forktrade-demo` on Free in Singapore. The deployment and hosted synthetic acceptance are recorded in [hosted evidence](evidence/vercel-neon-deployment-2026-10-30.json); use these steps to reproduce the configuration rather than create duplicate resources. Source updates are deployed manually through the CLI.

The repository includes `vercel.json`, `.vercelignore`, `.env.vercel.example`, a PostgreSQL migration and `/api/health`. Next.js/API functions run on Vercel; Neon owns durable storage. No workstation wallet companion or separate application server is required for the web app. Users use their own supported injected browser wallet if a later live session is enabled.

1. Create/select the exact Vercel project with **Node 24.x**, root directory `.`, and the intended implementation branch. Add Neon through Vercel Marketplace in a nearby matching region. No resources have been created by this code-preparation run.
2. For the first public synthetic demo, use a **new isolated Neon database/branch** and the disabled values in [.env.vercel.example](.env.vercel.example). `DATABASE_URL` is the pooled integration URL; keep it server-only. Set `FORKTRADE_ORIGIN` to the exact canonical HTTPS origin, without a path. Configure each preview deployment with its own origin/database; do not share production data with previews.
3. Apply migrations explicitly to that selected database **before** enabling a deployment. Migrations are not part of `next build` or request handling. With the reviewed environment in ignored `.env.vercel.local`, use:

   ```powershell
   node --env-file=.env.vercel.local --import tsx scripts/migrate.ts
   ```

   `DATABASE_URL_UNPOOLED` may be set for the migration command; runtime uses `DATABASE_URL` (or legacy `POSTGRES_URL`). Migrations normalize SQL line endings across Windows/Linux, check recorded checksums, hold a transaction-scoped advisory lock, seed nothing and never copy old local records.
4. Deploy only after approving the exact project and public data scope. Check `/api/health`, then test session, save, preview, repeated approval, share/remix, withdrawal and persistence through another instance/deployment. `/api/health` exposes no connection string or account data. A successful local build does not establish a successful Vercel/Neon deployment.
5. Keep authentication/execution/environment flags **false** for the synthetic demo. A later readonly/testnet profile needs another database bound to testnet data, a separately authorized wallet session and each order's own approval. Do not reuse the synthetic Neon branch or upload `.local`, wallet keys/journals, SQLite backups, cookies or auth material.

Actual PostgreSQL and production HTTP checks use only an isolated **loopback** test database, never the application URL:

```powershell
# Set FORKTRADE_POSTGRES_TEST_URL in the process to a local forktrade_test database.
npm.cmd run test:postgres
npm.cmd run build
npm.cmd run check:hosted
```

The HTTP check starts two successive local production processes with Vercel-style configuration, exercises PostgreSQL-backed sessions/plans/approvals/publication/remix/withdrawal and verifies persistence after restart. It remains explicitly synthetic and does not claim a real cloud deployment or a testnet order. CI provisions disposable PostgreSQL 18.4 for these checks. `.vercelignore` and build tracing exclude local/private data, acceptance-wallet tooling and the local embedded engine from function artifacts.

## Modes, data and permissions

`.env.example` documents the three modes and disabled permission flags. Offline mode uses synthetic sessions, data and outcomes. `/market`, `GET /api/market` and `check:readonly` read public chain 50383, verified BTC configuration and the current book through an interface with no trader/signer. The script defaults to `evidence/read-only-latest.json`; an optional filename preserves earlier snapshots.

Readonly/testnet modes require a separate PostgreSQL/Neon database URL. A database used for synthetic offline plans must remain separate from testnet data. A database is permanently bound to offline or testnet data on first use; renaming it cannot promote fixtures. Nonoffline ownership authentication requires `FORKTRADE_AUTH_ENABLED=true` **only after session authorization**. The user connects an existing injected EOA and separately reviews a domain/nonce/expiry-bound ownership challenge. Contract wallets and delegated EOAs are unsupported in v1. Readonly mode can save plans and review fresh account context after authentication but cannot send an order.

Testnet execution additionally requires `FORKTRADE_EXECUTION_ENABLED=true` and `FORKTRADE_ENVIRONMENT_CONFIRMED=true`, dated confirmation of the accepted environment, a permitted live session, and each final order's approval in the app and wallet. All flags default false. The official program-resource environment mapping is [recorded](evidence/environment-2026-10-21.json). Both funded-owner sizing/margin and exact eth_call passed through the read-only CLI on 2026-10-23. Both owners completed real authentication and separately authorized orders; canonical receipts and matching filled orders were independently verified. The exact child was operated by the agent in Edge under explicit user delegation. Do not enable flags to work around missing permission or evidence.

The single live path is self-owned BTC limit/GTC, with already funded bank collateral, zero collateral allowance to the bank and no linked funding payer. It blocks automatic wallet funding; it never claims funds, changes allowances or grants authority. Preview and pre-sign checks re-read chain/configuration, precision, account limits/risk, fees and native balance, then simulate the exact call for reverts. The pinned perps ABI declares no return value; simulation cannot establish placement or fill. The review shows the fixed 10,000,000 gas ceiling, maximum native cost, fee caps and future uint64-nanosecond expiry. Owner/network/metadata/configuration/account-state changes, insufficient current capacity, higher margin/fee estimates or the original 15-second expiry require another review. Indicative mark/capacity may move only while the exact order remains valid and refreshed margin/fees do not exceed what the owner reviewed. These are pre-sign checks, not contract-enforced margin ceilings; there is no silent rounding.

The browser awaits a durable server claim before one explicit `eth_sendTransaction` request. The server holds no trading key and never broadcasts. A timeout, reload, duplicate click or lost response reconciles the existing request without resending. A persisted uint64 tag helps correlate an indexed order; it is not a protocol uniqueness guarantee. A known hash can be reattached for read-only verification, and an ambiguous or missing match remains unknown. Observation verifies transaction input, canonical receipt and current order separately; lifecycle logs are bounded to 3,000 blocks, with snapshot/history-gap labels outside available coverage. Missing open orders never imply a fill.

Private versions are append-only and owner-scoped. Public cards expose only fields selected in a private publication preview; unpublish withdraws future app access and comparisons. Address/link disclosure is optional, and transaction links reveal the full account and public activity. Without sufficient disclosed links, execution is labelled owner-reported. The public version hash covers the selected public projection, excludes private notes and is no proof of pre-trade existence. Local demo URLs need the local app to be reachable; they are not hosted. Copied content and screenshots cannot be recalled.

## Local testnet wallet for acceptance (Windows)

For the dedicated DPAPI wallet created at the user's request, `wallet:testnet` supplies a user-controlled EIP-1193 wallet without importing its key into the app. This is a local acceptance companion, separate from the Next server. It opens isolated app and wallet windows, has no HTTP signing listener, and unlocks the key only in the wallet process after an explicit wallet-window decision. Standard injected browser wallets remain supported by the app.

For an authorized session, put the application settings and private server-only database URL in an ignored `.env.local` (keep the default `.env.example` disabled):

```dotenv
FORKTRADE_MODE=testnet
DATABASE_URL=<private-Neon-pooled-PostgreSQL-URL>
FORKTRADE_ORIGIN=http://127.0.0.1:3000
FORKTRADE_AUTH_ENABLED=true
FORKTRADE_EXECUTION_ENABLED=true
FORKTRADE_ENVIRONMENT_CONFIRMED=true
```

Use the last flag only with current official environment evidence. Start the app with `npm.cmd run build` then `npm.cmd run start`. In another terminal run:

```powershell
npm.cmd run wallet:testnet -- --wallet-dir .local/wallets/hideki-testnet-2026-10-21 --prepare-root
```

Wait for the CLI to confirm that the wallet provider and bridge are verified. Use the app window it opened; other browser windows do not receive this local provider. In the app, connect the wallet and review/sign ownership; approve the corresponding requests in the separate wallet window. `--prepare-root` saves an agent-prepared private diagnostic thesis after real ownership authentication, only when the workspace has no saved plan or entered draft. It never approves, sends or publishes an order. Review the saved parameters, open a fresh order review, and approve that exact order in both app and wallet. The 15-second expiry and fresh server validation still apply; a declined/expired attempt needs a new version/review. The companion accepts only chain 50383 BTC limit/GTC, exact approved calldata, no builder/value, at most 0.001 BTC / 20 USDso notional / 0.1 STT maximum native cost. It cannot send funding, allowances, arbitrary messages, operators or mainnet calls.

The encrypted key needs the original Windows user profile. The app receives only address/signature/hash responses, never the key. Wallet request identities and known hashes persist privately beside the keystore; after reauthentication, known hashes are reported for authoritative reconciliation without resending. Closing the wallet stops its session; a crash lock must be inspected with existing request state before removal. The companion has synthetic unit/UI evidence and actual root ownership authentication on 2026-10-23. Closing it ends that browser context; reopen and authenticate again, then select the saved thesis. With `--prepare-root`, a later launch automatically selects the single matching diagnostic root when the editor is blank; it never replaces a draft or adds another existing root. The root owner approved a real order that filled; a remix still needs its independent app/wallet decisions.

After the owner publishes a root with parameters/lineage, launch the second owner context directly at that source:

```powershell
npm.cmd run wallet:testnet -- --wallet-dir .local/wallets/hideki-remix-testnet-2026-10-23 --remix <publication-UUID>
```

The wallet window is labelled **REMIX**. Authenticate the second EOA, edit/save the source-linked private child, then separately review/approve its exact order. `--remix` only opens a visible source; it creates no plan or approval. Missing/invalid UUIDs and combining it with `--prepare-root` fail before wallet/network startup.

The companion opens isolated Chromium windows; its provider is not installed into the user's existing Edge browser. Actual [Edge computer-use checks](evidence/edge-ui-2026-10-21.json) passed public market, missing-wallet, draft-preservation and responsive UI checks. Edge currently has no injected provider, so ownership signing and orders were not tested there. A supported user-controlled injected wallet is required; no key was imported into Edge.

Legacy SQLite/WAL files, local PostgreSQL directories, sessions, environment files and test traces remain ignored by Git. No reset/seed command deletes execution identities. Old SQLite data and wallet journals are preserved; they have not been imported into Neon or transferred externally. A new Neon database starts empty. Any later import of private historical plans/attempts requires a separately reviewed data-transfer scope that preserves their stable IDs and excludes sessions, challenges and wallet material. Use provider backups for Neon; never publish database backups or promote an offline database into testnet mode.

Current source/browser evidence lives in [ACCEPTANCE.md](ACCEPTANCE.md) and the single [progress ledger](IMPLEMENTATION_PLAN.md). Latest public chain/config snapshot: [read-only evidence](evidence/read-only-m5-2026-10-20.json). Offline screenshots are synthetic and prove no live order. Mock-wallet browser routes intercept all live APIs and never reach a real signer or account. README commands describe the current app, while GOAL/PRODUCT/ARCHITECTURE retain the full target contract.

Implementation source: [feat/forktrade-core](https://github.com/tang-vu/forktrade/tree/feat/forktrade-core). GitHub still defaults to `main`, which contains planning documentation only; use the implementation branch link for review/run instructions. User workflow: commit and push each coherent verified update. Public source and the synthetic Vercel deployment/testing are authorized; a new hosted wallet/order session and submission remain separately scoped.

## X posts

The [100-second narrated 1080p demo](evidence/forktrade-demo-narrated-2026-10-30.mp4) is prepared with English captions and a [Vietnamese subtitle file](evidence/forktrade-demo-2026-10-30.vi.srt). It uses actual 2026-10-23 captures plus labelled explanatory graphics; [provenance/QA](evidence/narrated-demo-2026-10-30.json). It does not record signing/approval or constitute a new live execution. No public post or submission has been made by creating this video.

First post supplied by the user on 2026-10-30: [@vovivothien / post 1](https://x.com/vovivothien/status/2116149013636640970). Web retrieval returned 403, so content/tagging have not been independently verified. The second post URL has not been provided. The 2026-10-23 rule check requires 2 or 3 actual links tagging @DreamDEXSomnia. [Drafts and demo checklist](DEMO.md) remain separate from verified publication/submission evidence.

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

## Exact-order Edge acceptance transport

For the explicitly delegated child acceptance, `wallet:edge` used a temporary main-frame EIP-1193 provider over CDP and an owner-restricted file inbox. It is separate from the Next server, opens no HTTP signing listener, imports no extension/key into Edge, and is not a general unattended wallet. Its strict private scope fixes the owner, origin, chain 50383, child plan/version, every amount/cap and a maximum 15-minute lifetime; the existing wallet policy limits native cost to 0.1 STT. The backend admits one ownership signature budget and only the durable claimed exact order, with fresh checks, simulation and hash-before-broadcast journaling. Unknown outcomes reconcile without resending. See [security boundary](SECURITY.md#scoped-edge-acceptance-wallet) and [actual evidence](evidence/live-root-remix-2026-10-23.json).

The session used for acceptance has ended: provider/binding removed and wallet backend stopped. A new session/order requires new specific authorization and scope; no production browser-wallet compatibility or general autonomous authority is claimed. Normal injected wallets and the interactive companion remain separate paths.
