# Implementation plan and progress ledger

**Implementation started on 2026-10-20; GOAL is blocked pending live-session authorization and accepted-environment evidence.** Offline/source/public-read work is delivered; actual account and root/remix execution acceptance remain unrun. This is the single implementation progress/blocker ledger. Keep it concise and evidence-based. Do not create parallel TODO/status files.

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
| D2 | Current SDK/version and browser signing feasibility | SDK ABI/source and mock browser path verified in M5; actual wallet unrun | Authorized real session/account compatibility check |
| D3 | Live chain/config/contract/market verification | Public RPC/SDK checks passed; actual owner context not read | M4 adapter tests and M5 preparation |
| D4 | Bounty accepted environment and current rules | Reverify; live page unavailable/CAPTCHA context | Local implementation and draft checklist |
| D5 | Suitable local runtime/dependency access | Passed clean Windows and GitHub Ubuntu install/build/tests | Continue local implementation |
| D6 | Wallet connection/auth signature and user permissions | One local testnet wallet created/stored with explicit authorization on 2026-10-21; connection/import/auth still pending; no signature | Wallet-creation request completed; user intends to faucet |
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
| M4 | Public adapter passed; account adapter wired/mock-verified | Public factory/bank/pool/book/code hashes, M5 snapshot; actual account still unrun | Authorized actual owner/account/history check |
| M5 | Passed source/mock readiness increment; actual wallet unrun | 99 unit/integration tests and 17 browser scenarios; exact ABI payload, single wallet send, durable claim and authoritative observation | Real EOA authentication/simulation/receipt compatibility is M6 |
| M6 | Blocked on later authorization and prerequisites | No actual orders or signatures | Obtain permission when reviewable; execute and reconcile honestly |
| M7 | Partial local handoff prepared | README/run guide, offline screenshots, source/read-only evidence, demo manifest and three unposted social drafts | Real live evidence, current rules and separately authorized external actions |

## How to update and resume

### 2026-10-21 01:41 UTC — explicitly authorized local testnet wallet creation

New user instruction authorizes creating one wallet and storing it locally so the user can faucet it. Resumed clean on `feat/forktrade-core`. Created one genuine random EOA using pinned viem generatePrivateKey (installed source uses noble secp256k1 randomPrivateKey); no synthetic identity or signing operation. Private key never entered command arguments, environment, logs, chat or Git. Encrypted with Windows DPAPI CurrentUser; protect/unprotect round-trip passed in memory before persistence. Saved `.local/wallets/hideki-testnet-2026-10-21/wallet.dpapi.json` and separate `address.txt`; folder/files are restricted to the current Windows user and SYSTEM and verified Git-ignored/untracked. Public address is delivered directly to the user and kept out of tracked project evidence.

Checks: persisted encrypted record/address match; rerunning the local helper preserved the existing wallet without generating another key; file ACL and git check-ignore/git ls-files checks passed. Initial Set-Acl attempted to apply security metadata requiring SeSecurityPrivilege and failed before generation; used icacls to change only the newly created folder's DACL, then verified the exact two allowed principals. No privilege/system policy change. A public RPC check confirmed chain 50383 and zero native balance at 01:40:56 UTC; no faucet claim was attempted. User will fund it independently. The app/server has no access path to this key; no server signing key was added.

This grant covers wallet creation/storage only. Import/connection/ownership authentication, funds/claims/allowances/delegation, each root/remix order, cancellation and publication remain separately gated. All app permission flags stay false. Original GOAL remains incomplete; no actual account-risk preview or live execution exists, and accepted bounty environment is still unconfirmed. This documentation-only update requires no repeat source/browser suite; verification above covers the new local artifact. Next concrete step: user faucets the provided address; perform only subsequently authorized wallet/session actions.

### 2026-10-20 17:40 UTC — third-turn blocked audit

Resumed clean on `feat/forktrade-core`, local/remote `de0ef6d65dd3c899a945a14d43aa293075f4b279`; no newer user authorization. Previous turn classified as a verified wait on CI 39467438767. This turn verified live CI 39467847302/job 118783813530 to terminal success on de0ef6d: install/migration/typecheck/lint, 99 tests, build and all 17 browser scenarios passed. No source changes. All required independent offline/mock/public-read preparation is delivered; there is no unresolved source failure to repair or live process to wait for.

The same D6/D4 gate has now recurred across three consecutive goal turns (initial session request, first continuation, this continuation). The pending request remains unanswered: existing user-selected EOA at `http://127.0.0.1:3000`, Hideki 50383, wallet connection plus one reviewed ownership signature and read-only BTC account/risk checks. Dated official accepted-environment confirmation is also missing. Automatic continuation is not approval. Auth/execution/environment flags remain false; no real account/signature/order/funding/allowance/delegation or external action was attempted. No alternative launcher was used for the earlier policy-blocked server start.

Completion audit fails G3 actual account and G4 actual root/remix evidence; G5 external readiness is also unmet. Mark the existing GOAL blocked after pushing this documentation-only status update; do not mark complete or manufacture work to keep it active. Resume when the pending permission or required external evidence changes. A root and independently owned remix still each require fresh exact order review and user wallet approval; connection/authentication permission alone covers neither. Current status documentation requires no additional source/browser rerun.

### 2026-10-20 17:38 UTC — verified final handoff CI; permission still pending

Resume check: `feat/forktrade-core`, clean tree, local/remote `55b002030947eeae9ba465b8680de7d2c9f28182`, repository private. Previous goal turn: progress (M5 source/ABI, tests, public evidence and pushed commits). This continuation: verified wait on live CI run 39467438767/job 118782392460, then inspected its terminal success on that exact commit. Install/migration/typecheck/lint, 99 tests, build and all 17 Chromium scenarios passed (25.0s). No source changes or additional tests were needed.

Same remaining blocker, second consecutive goal turn: no answer to the requested wallet connection/ownership-signature/read-only session or accepted-environment evidence. No new live authorization has arrived; do not re-request it or treat the automatic goal continuation as permission. Independent offline/mock/public work is complete at the current scope. M4 actual account and M6 root/remix evidence remain unrun; GOAL remains partial/active. No live action, alternative server launcher or external publication attempted. Next: proceed only when the pending user input or external evidence changes; apply the three-turn blocked audit if this impasse recurs. This documentation-only evidence update does not require another source/browser rerun.

### 2026-10-20 17:35 UTC — local handoff and pending live-session input

Source correction `97d0aee313083daf6c65a24f58d74852602b38f7` pushed; [CI 39467081045](https://github.com/tang-vu/forktrade/actions/runs/39467081045) passed install/migration/typecheck/lint, 99 tests, build and all 17 browser scenarios on that exact commit. This documentation-only update records the final independent result; it does not change source behavior. No known source/local failure remains. Public reads passed; actual account/auth/simulation/receipt compatibility and live root/remix are unrun. No confirmed feedback finding or submitted material exists. Goal is partial, not complete.

Asked the user for a narrowly scoped session: local `http://127.0.0.1:3000`, existing user-selected EOA, Hideki chain 50383, connection plus one user-reviewed domain/nonce/expiry-bound ownership signature and read-only BTC account/risk checks. Status pending, not granted. Asked separately for dated official accepted-environment evidence; current rule page could not be retrieved. All auth/execution/environment flags remain false; no wallet, funding/claim/allowance/operator, send/retry/cancel/close or external action is authorized or performed. The permission request cites AGENTS.md's explicit live-session gate. A later root order and a separately owned remix still each require a fresh exact review and user wallet approval.

Next concrete step: wait for the required permission/environment input; do not infer approval from silence. If granted, resolve local run access (the optional persistent launch was policy-blocked), let the user connect/sign in their own supported wallet, and verify actual account constraints before proposing any order amounts. Never bypass the execution policy or wallet UI. Resume by inspecting branch/tree/latest ledger; preserve current data and unknown attempts. No repeated-block audit threshold has yet been reached: this turn delivered implementation, real public reads and green CI.

### 2026-10-20 17:33 UTC — pushed M5 CI and final ABI source check

Implementation `8614a4c2572f2d2c9556d9452df45924c8c8e80d` pushed and verified equal to `origin/feat/forktrade-core`. [CI 39466554457](https://github.com/tang-vu/forktrade/actions/runs/39466554457) passed a clean Ubuntu install/migration/typecheck/lint, 99 tests, production build and all 17 browser scenarios (18.5s). Final source review found unsupported payable/return annotations in the custom perps ABI; aligned the entire fragment to pinned SDK dist/tradeAbi.js and added a full-function ABI equality assertion alongside unchanged byte-for-byte calldata checks. The perps ABI returns nothing: eth_call can check reverts, not prove placement/fill. This is a local source correction, not an upstream feedback finding. No dependencies changed. Typecheck/lint and all 99 tests passed again after this correction; unchanged browser behavior retains the recorded suite, and CI will rebuild the correction commit.

Optional attempt to leave a new offline production server at `127.0.0.1:3000` was rejected before process creation by automatic execution policy with only “blocked by policy” supplied. Did not retry by another launcher or change system policy. Earlier dev/production test runs passed; no persistent app server is left running. Use the documented run command manually when needed. Live permissions remain not requested/granted and no live action occurred. Goal remains partial; next gate is the concrete connection/authentication/read-only session permission and dated accepted-environment evidence, followed by each separately reviewed order.

### 2026-10-20 17:25 UTC — M5 guarded execution and observation increment

Branch `feat/forktrade-core`, resumed from pushed `bdf09fdbb03d9dd76b0ddc0d4579e8462026fb7a`. [M4 CI 39459400533](https://github.com/tang-vu/forktrade/actions/runs/39459400533) passed on that exact commit (64 tests / 9 browser scenarios). This entry belongs to the M5 implementation commit. No new dependencies or stack changes.

Implemented owner-derived live plan/preview routes; explicit EOA ownership challenge UI; default-off authentication/execution/accepted-environment gates; immutable market identity and configuration/risk/code binding; exact SDK-ABI limit/GTC call with a persisted uint64 correlation tag, fee/gas/native bounds and exact-call simulation; durable claim before a single browser provider send; event-driven invalidation and original-context reporting; reload/hash recovery without resend; independent tx/receipt/order reconciliation with canonical-block/input identity checks, exact cumulative partial fills, cancellation, amendments, reorg/conflict downgrade and bounded 3,000-block history. A tag is correlation only, never protocol exactly-once delivery. Database mode binding prevents fixture promotion. Publication has a private projection preview, selected-field hash and explicit address/link disclosure; absent evidence stays owner-reported. Mobile saved-plan navigation now survives reload.

Checks: typecheck, lint and production build passed; 99 unit/integration tests passed; 17 Chromium scenarios passed in 31.4s before the final visual-copy correction. Synthetic wallet/receipt/API transports only; all live browser routes are intercepted, no fake live screenshots captured. Failures found and repaired: live CTA initially retained an offline label; one inconsistent synthetic fill fixture; an empty-catch lint finding; and saved-plan navigation hidden on mobile after reload. Re-runs passed. Visual review then changed the offline CTA to explicitly say “Review synthetic order”; final rebuilt browser result is recorded below. `npm.cmd run check:readonly -- evidence/read-only-m5-2026-10-20.json` passed (~1.75s snapshot), including actual public contract code hashes. Existing offline screenshots remain explicitly synthetic.

Actual dev smoke: `npm.cmd run dev -- --port 3001` with process-local readonly mode, `.local/testnet.db`, exact origin and all permission flags false passed rendered Chromium checks. The wallet button stayed disabled; manual /market refresh returned actual public data, and the 360px view had no overflow or page errors. Inspected `evidence/readonly-desktop.png` and `readonly-market-mobile.png`; no account or wallet provider was used. The first smoke selector used an outdated button label and timed out; corrected to the rendered label, then passed. Stopped the dev server. Next dev added a generated rules block to project AGENTS.md; disabled documented `agentRules` in project next.config.ts and removed only that generated block, preserving user instructions. No global settings changed. Build/typegen restores generated route imports after dev.

Final rebuilt checks after the copy/config fixes: typecheck/lint/build passed; all 17 browser scenarios passed in 30.8s. Unit/integration suite: 99/99 passed. Markdown local links/fences and `git diff --check` passed; repository visibility verified private. Screenshots regenerated with the explicit synthetic CTA. No unresolved source/browser failure remains; actual owner/live/eligibility checks are unrun, not passed.

Exact remaining gate: a user-selected existing EOA at local origin `http://127.0.0.1:3000`, Hideki 50383 BTC; permission for connection, one reviewed ownership signature and read-only account/risk checks is not yet granted. No real account, auth signature, order, funding, claim, allowance/delegation, cancellation or cleanup was attempted. Actual root/remix orders each need their own final review and wallet approval, plus confirmed accepted environment; current bounty page retrieval remains unavailable. No hosted/public/judge access, post, email or submission authorized. Goal remains partial; independent source/mock work progressed rather than a repeated blocked turn. Next: finish final local/CI verification and request only the concrete missing session/rules input; dependent live work stays stopped.

### 2026-10-20 16:40 UTC — M4 read-only increment

Branch `feat/forktrade-core`, resumed from clean pushed `d4241f3`; previous goal turn classified as progress (source, evidence and CI changed). The commit containing this entry adds a read-only capability interface, verified BTC factory mapping/registration and bank/collateral/decimals/grid checks, pinned HTTP book/identity reads, and a public /market screen. Re-ran the real public check: `npm.cmd run check:readonly -- evidence/read-only-m4-2026-10-20.json` passed, ~1.8s snapshot duration; no account read or signer. Official developer page re-read; network/SDK bootstrap unchanged.

Owner-context adapter implemented and tested with explicit synthetic transport/account fixtures. It uses protocol lock, fee reserve, effective IMF, adverse gap, surcharge, account equity/locks/position/open-order snapshot, isolation mode and sizing. Fractional bps are exact. V1's intended self-send path requires already funded bank collateral, zero collateral allowance to the bank, and no linked funding payer, so an order cannot silently spend a wallet shortfall; no allowance/funding changes are made. Actual owner authentication/reads remain unrun. Code is not yet wired to a real signing route.

Checks: typecheck/lint/build passed; 64 unit/integration tests passed. First browser invocation failed during JSON fixture loading because Node required an import attribute; fixed the fixture import, then all 9 browser tests passed in 20.1s. Public read mock tests prove reads never invoke injected signer/trader traps, reject wrong chain/bank/factory/code/precision/grid and stale head, and dispose sockets on failure. Source check and public read evidence are distinct from actual account/live acceptance. Next concrete step: M5 exact unsigned call, guarded browser signer, durable request/report/reconciliation routes, wallet-event/crash/rejection tests and live UI; only then request session permissions. No wallet/auth/transaction/publication authority was added by this milestone.

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
