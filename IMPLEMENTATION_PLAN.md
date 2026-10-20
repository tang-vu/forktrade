# Implementation plan and progress ledger

**Implementation started on 2026-10-20; live acceptance remains blocked.** This is the single implementation progress/blocker ledger. Keep it concise and evidence-based. Do not create parallel TODO/status files.

## Order of work

Finish one end-to-end path before adding breadth. Steps M0-M5 can advance offline/read-only subject to environment permissions. M6 needs explicit authorization and user participation. M7 prepares the handoff; it does not authorize external publication or submission. If a gate is blocked, complete independent work and keep dependent gates open.

| Milestone | Deliverable | Exit evidence | Dependencies |
| --- | --- | --- | --- |
| M0 - Verify | Source/SDK/network investigation, stack/version pins, market and order choice, permission map | Dated source notes; read-only chain/config/metadata checks; documented signing feasibility or blocker | Public docs/network; later account reads only when permitted |
| M1 - Skeleton | Local TypeScript app, DB/migrations, offline mode, route shell, exact run guide | Clean local start; scripts present; no credentials required for offline mode | M0 compatible versions; local dependency access |
| M2 - Domain | Decimal pipeline, version records, deterministic preview, state reducer and request repository | Numeric/state/concurrency tests; no side effects from preview | M1; fixture metadata clearly synthetic |
| M3 - Core offline UX | Editor -> preview -> gated simulated execution -> share -> independent remix -> diff/lineage | Desktop/mobile offline E2E; ownership/publication and tampering tests | M2; clear offline banner and evidence boundary |
| M4 - Read-only integration | Live market/config/account adapter, freshness/context handling, reconnection | Recorded read-only checks; read-only calls proven free of trading side effects | M0 sources; actual transport/access availability |
| M5 - Execution integration ready | User-controlled signing adapter, durable request claim, reconciliation, unknown path | Mock-wallet/adapter failure tests; payload review; never sent automatically | M3-M4; verified supported wallet path |
| M6 - Authorized live acceptance | Real root order and independently approved remix, publication choices and honest receipts | Approved session/order evidence, verified protocol identity/outcomes, real screenshots and comparison | User permission, appropriate wallet/access, gas/collateral, accepted environment, actual market conditions |
| M7 - Handoff | Working README, demo evidence, feedback drafts/reports if real, bounty checklist and post drafts | Acceptance matrix with actual results, commit, remaining gates and reproducible run commands | M1-M6; rule re-verification; external actions remain separately gated |

### M0: resolve before signing work

Read the official perps developer, orders and margin pages and perps-specific bot-kit sources. Record SDK version, relevant exports, supported transports, browser signer API, receipt/order read methods and evidence gaps. Do not apply the kit's generic spot quickstart/network settings to perps. Check current package documentation without installing the kit or running scripts from it.

Verify the RPC's chain ID, current market/system configuration, collateral identity, base/quote decimals, tick/lot/minimum and sizing API. Record a candidate single market and confirm it is available for the user's permitted collateral type. Treat missing mark price, voucher restrictions, isolated-account constraints and unsupported sizing as explicit blockers. Read-only discovery must not claim a voucher, link an operator or send a transaction.

Confirm whether the bounty accepts the live environment described by current perps docs. The snapshot's Hideki/DreamDEX/Tokyo labels do not settle that question. If official rules remain inaccessible, record it and prevent eligibility claims. Local/offline development may continue.

### M1-M3: build the smallest complete product

Create a local app and migrations, then domain modules before the wallet path. Implement precise numeric parsing, version identity, owner scoping, canonical diffs, publication allowlists and durable request records. Build one clearly synthetic fixture scenario plus partial, rejection, interrupted and unknown paths; never seed fake live history.

Implement the full offline interaction with accessible responsive UI. Test unauthenticated access, cross-owner access, concurrent edits, root/child version pinning, maximum remix depth and unpublish behavior. Keep wallet-session challenges and live order requests disabled until authorization is available. Mock wallet tests exercise the integration contract without real signatures.

### M4-M5: integrate reads, then prepare execution

Connect current read APIs behind a small adapter. Validate the selected chain/pools and freshness. Exercise reconnect with a snapshot-only source so history gaps remain visible. Use dependency injection for signer and observations; ensure reads can never call a trader.

Build the exact payload review and one-use approval; persist identity before any signing call. Test repeated click, concurrent tab, stale response, wallet rejection, switch while a request is in flight, response loss and late receipt arrival. Prepare the real user flow with execution disabled by default. Do not test by sending a small order without permission.

### M6: obtain permission only when the flow is reviewable

Prepare the local build, account/network summary, selected market/order, final exact amounts, limits, evidence to disclose and open-order exposure. Ask for the specific missing permissions for connection/authentication and live testnet execution. Do not ask for credentials in chat or import a private key. The user's wallet performs signing; the app's final review binds each order. A remix is a new decision.

Use only the separately authorized actions. An approval to place an order does not authorize cancellation, closing a position, granting an operator or claiming a voucher. If a GTC order remains open, report it clearly and request appropriate cleanup authorization only if needed. Unknown submission remains blocked for retries. Capture actual protocol outcomes without manufacturing a fill.

### M7: finish evidence and handoff

Run relevant checks after final changes; record commands and results. Capture the real root/remix path if authorized, or state precisely that live evidence is blocked. Replace README's future-only commands with tested commands while preserving history of limitations. Fill the demo evidence manifest, acceptance table and bounty readiness table. Prepare social drafts only. Produce feedback reports only from real reproduced observations, with no security details in the repo.

## Explicit dependencies and blockers

These are current implementation gates, not failures already observed in an app:

| ID | Dependency/gate | Initial state | Independent work possible |
| --- | --- | --- | --- |
| D1 | User invocation of GOAL authorizing app implementation | Granted 2026-10-20; commit/push each verified increment requested | Local implementation |
| D2 | Current SDK/version and browser signing feasibility | Unverified | Domain/UI design and fixture tests in future run |
| D3 | Live chain/config/contract/market verification | Unverified; only dated docs read | Offline app and read adapter contract |
| D4 | Bounty accepted environment and current rules | Reverify; live page unavailable/CAPTCHA context | Local implementation and draft checklist |
| D5 | Suitable local runtime/dependency access | Not checked or installed for this project | Review architecture and sources |
| D6 | Wallet connection/auth signature and user permissions | Not requested; no wallet setup done | Mock-wallet tests and read-only public data |
| D7 | Gas/collateral/account access and each live order approval | Not authorized; no transactions done | Complete M1-M5 and prepare final review |
| D8 | Private sharing/public/judge access, hosting, posts and submission | Not authorized | Drafts and local evidence package |
| D9 | Mainnet activity for a conditional prize tranche | Out of scope; separate authorization/project | None needed for testnet MVP implementation |

If access to a required service fails, add a specific row with action, target, reason, completed work, denied/pending/uncertain status, and next possible action. Do not mislabel an unattempted integration as a verified failure.

## Milestone status ledger

| ID | Status | Evidence / commit | Remaining work |
| --- | --- | --- | --- |
| DOC | Documentation baseline prepared and locally checked | 13 Markdown files dated 2026-10-20; inventory, internal links, titles, fences and credential-pattern checks passed; see repository commit history | Exact final remote checks reported by documentation task; no app acceptance implied |
| M0 | Public runtime/source spike passed; account/eligibility partial | `npm.cmd run check:readonly`, SOURCES.md and evidence/read-only-2026-10-20.json | Account-specific eligibility/risk, final signing payload/history semantics, accepted bounty environment |
| M1 | Passed local/CI increment | Clean npm ci, exact pins/lock, Next shell, migration, typecheck/lint/build; GitHub CI 39456931257 passed | Live implementation remains separate |
| M2 | Passed offline increment | 39 unit/integration tests; domain, versions, owner scoping, request persistence | Live adapter semantics remain separate |
| M3 | Passed offline increment | Final rebuilt suite: 8 browser tests passed (19.9s), comparison/withdrawal, 1280/360px screenshots inspected | Live wallet behavior is M4/M5/M6, not established by fixtures |
| M4 | Not started | None | Live read-only adapter |
| M5 | Not started | None | Prepared signing/reconciliation integration |
| M6 | Blocked on later authorization and prerequisites | No actual orders or signatures | Obtain permission when reviewable; execute and reconcile honestly |
| M7 | Not started | Demo/report/post templates are plans only | Evidence, verified run guide and handoff |

## How to update and resume

### 2026-10-20 16:26 UTC — pushed source and clean CI evidence

Implementation commit `0eff0b32339306c13a8f9224c5d84d547f78c9e2` is pushed to `origin/feat/forktrade-core`. [GitHub offline CI 39456931257](https://github.com/tang-vu/forktrade/actions/runs/39456931257) completed successfully on that exact commit: clean Linux install/migration/typecheck/lint, 39 tests, build, Chromium setup and 8 browser tests. This independently checks the documented clean-checkout commands in addition to Windows local runs. No live checks ran in CI. Local production server started via `npm.cmd run start` at `http://127.0.0.1:3000` (tool session 34924); HTTP smoke check returned 200. The initial HTML is a loading shell; a separate headless Chromium smoke check waited for the app and verified the visible Offline lab label and start-session control. Recheck port/process at resume; do not assume a prior session is still alive.

M4/M5 source investigation continued: SDK exposes `previewPerpOrderMargin` (effective IMF, adverse gap, leverage surcharge and funding gates), on-chain open-order snapshots, and the bank's `isolated`/`isolationAllowsMarket` views. Perps placement can auto-pull a wallet/main-wallet shortfall; account adapter/review must model or explicitly prevent that before enabling a signer. Do not carry the fixture's synthetic expiry 0 into a real order; build and bind a supported future uint64-nanosecond expiry using the verified SDK/ABI. The SDK's build-only perps path emits one unsigned order and no approval, but it is not wired or acceptance-tested in this increment. Do not invent a margin-mode endpoint or treat a missing order as a fill.

Goal remains active and partial. Earliest next concrete action: implement/test the owner-derived live read context and actual order observation adapter, then wire the exact browser payload behind disabled-by-default authorization gates. After all independent M4/M5 work, prepare the concrete session/account/market/size/exposure review and request missing permissions. No wallet, auth signature, funding/claim/allowance/delegation, transaction, cancellation, deployment, external publication, judge access or submission has been authorized or performed. Bounty accepted environment remains inaccessible/unverified. No confirmed feedback findings.

### 2026-10-20 16:23 UTC — M1–M3 verification result

Final clean-driver checks: `npm.cmd ci` passed; `npm.cmd run db:migrate` passed without deleting existing records; `npm.cmd run typecheck` passed; 39 unit/integration tests passed; production build passed; all 8 offline Chromium tests passed in 19.9s, including public comparison withdrawal and keyboard focus return. One lint cleanup warning was addressed by capturing the opener ref; lint/build passed without warnings and the targeted mobile regression passed again (1 test, 7.7s). The app's own error cases now have matching evidence, while all real wallet/live gates remain unrun/blocked. Screenshots contain synthetic data only. This is a coherent offline increment, not GOAL completion. Next: M4/M5 account adapter, exact supported browser payload, pre-sign freshness and authoritative receipt/order reconciliation; then permission request only when the live flow is concrete and reviewable.

### 2026-10-20 16:15 UTC — M1/M2/M3 offline increment

Branch `feat/forktrade-core`, previous pushed commit `3421521`; this entry will be committed with the offline app. Implemented: exact amount pipeline, fixture-only risk preview, immutable SQL versions, domain/nonce/expiry ownership challenge with replay protection (mock verifier only), scoped sessions/CSRF, typed server API, atomic request claim before an effect, orthogonal tx/order observations, explicit local publication and withdrawal, one-level source-pinned remix, private and allowlisted public parameter comparison. Real authentication and all live mutations remain disabled. No wallet calls, trade keys, grants, funding or orders. Repository visibility rechecked with `gh repo view`: private.

Checks actually run: `db:migrate` passed; `typecheck` passed; lint initially caught a render-time Date.now call (fixed); 39 unit/integration tests passed; production build passed. First browser run: 6 passed / 2 test-selector failures (duplicate Next route announcer alert), selectors corrected; second run: all 8 passed in 19s. Added public comparison tests, fixed a test using an outdated publication revision and a heading-encoding defect. Expanded keyboard test exposed missing dialog focus restoration; fixed with an explicit trigger ref. Desktop 1280px and mobile 360px screenshots generated and visually inspected; synthetic-only labels visible and no horizontal overflow assertions passed. A final rebuild/browser suite is running after focus restoration. Clean `npm.cmd ci` initially failed on native SQLite compilation; switched to Node SQLite/Drizzle RC as documented in SOURCES.md, then clean install/migration/39 tests passed. `typecheck` now runs `next typegen` before tsc so generated route imports exist on clean checkout. No failure is erased or counted as live evidence. Bounty/account/live gates unchanged. Next: finalize M3 evidence and push, then finish M4/M5 independent read/signing/reconciliation preparation. Permissions remain not requested.

### 2026-10-20 15:55 UTC — M0 / bootstrap increment

Branch `feat/forktrade-core`, baseline `71f6009`; implementation commit is the commit containing this entry. Commands: Node/npm version, npm registry metadata/install, upstream `git ls-remote`, direct RPC chain ID, SQLite in-memory query, `npm.cmd run check:readonly` (passed). SDK read interfaces and wallet-client source inspected. Initial lint tooling audit had five transitive high findings; removed that tooling path, final install audit reports zero. Stack deviation: ESLint 10/typescript-eslint/hooks instead of eslint-config-next. No runtime app/typecheck/browser/build pass claimed yet. Public read snapshot is real read-only data, not a trade. Bounty retrieval failed; no access bypass. Wallet/auth/session/order permissions not requested or granted. Next: finish M1/M2 domain, persistence and app shell, then offline browser path. User requires commit and push each verified update; no external app publication authorized.

For each milestone increment append a compact entry with:

```text
Date/time (UTC):
Milestone and status (in progress / passed / failed / blocked):
Branch/commit:
Implemented behavior:
Commands/checks actually run and outcomes:
Evidence paths/links and whether synthetic, read-only, or live:
Exact blocker action/target/reason:
Permission/outcome state (not requested / pending / denied / uncertain / granted):
Independent work completed:
Next concrete step:
```

Use `not run` when no test was executed. If a process is interrupted, inspect persisted request state and remote/chain outcomes before retrying an operation. Do not discard unknown execution records when resetting fixtures. Resume from the earliest unmet dependency, not from a presumed successful milestone.

## Time and completion discipline

The stated bounty deadline is 2026-11-01 23:59 UTC; verify it before submission. Work backwards from real local/live acceptance, not a feature count. If constrained, defer optional AI, image export, extra markets and analytics. Do not cut numeric safety, explicit approval, ownership, reconciliation or honest evidence.

Implementation is complete only when the core app and all applicable ACCEPTANCE.md gates pass, including authorized live evidence. If permission or service access is missing, deliver the runnable independent work with an explicit partial/blocked status. Submission readiness is separate and may remain blocked on public/judge access or posts even after implementation passes. An accepted report, award or payment is never inferred from source or demo completion.
