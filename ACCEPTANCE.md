# Acceptance and evidence matrix

**Current result: source/offline and mock-wallet integration checks pass; actual public market reads pass. Actual ownership authentication, account reads and live root/remix acceptance remain unrun.** No actual testnet execution exists.

## Gates and reporting

| Gate | What it establishes | Initial result |
| --- | --- | --- |
| G0 - Documentation | Guide files, links, scope, current-state accuracy, private repository | Passed local structural review on 2026-10-20: 13 Markdown files, internal links, titles, balanced fences and credential-pattern scan; private metadata verified. Final remote commit/inventory checked in task handoff; no app claim |
| G1 - Source/local checks | Type safety, lint, domain/adapter tests, production build | Passed M5: typecheck/lint/build and 99 unit/integration tests; live transports are mocked |
| G2 - Offline browser | Reproducible UI behavior and failure handling with labelled synthetic fixtures | Passed 17 Chromium scenarios at desktop/360px including intercepted mock-wallet cases; offline screenshots inspected |
| G3 - Read-only integration | Verified current chain/config/market reads and available observation semantics | Partial: actual public M0/M4/M5 reads passed; actual owner/account/history/correlation unrun |
| G4 - Live acceptance | Actual separately authorized user orders and honest root/remix evidence | Blocked on future authorization and prerequisites |
| G5 - Bounty readiness | Current rules/access/demo/post links/submission checklist | Not ready; drafts only and later approvals required |

G1/CI success is not G3/G4 success. A mock transaction, screenshot of a fixture, public explorer link without identity verification, or a hash alone cannot pass live acceptance.

## Required test scenarios

| ID | Level | Scenario | Required outcome |
| --- | --- | --- | --- |
| N01 | Unit | Decimal inputs using base precision 6, 7, 8, 9, 18 and 24 with distinct quote precision | Exact raw values and display round trips; no float conversion or 18-decimal assumption |
| N02 | Unit | Excess digits, negative/zero, exponent notation, locale separators, very large integers, malformed text | Deterministic rejection; no silent rounding/overflow |
| N03 | Unit | Tick/lot boundary, minimum quantity, notional and size-cap edges | Only valid multiples/bounds accepted; labels preserve units |
| N04 | Unit/integration | Changed decimals, missing metadata, stale mark, unavailable sizing, voucher/isolated/cap restriction | Preview blocked or invalidated with an accurate reason |
| V01 | Unit/integration | Save/edit a plan after preview/approval, simultaneous version edit | New version or concurrency rejection; old receipt stays on its exact version; approval invalidated |
| V02 | Unit | Canonical hash and parameter diff, normalized equivalent amounts, all economic flags/fees | Stable schema and exact binding; any executable change invalidates consent |
| W01 | Browser/adapter | Wallet absent, connection denied, disconnected and reconnected | No side effects; clear recovery; fresh context required |
| W02 | Browser/adapter | Ownership challenge rejected/expired/replayed/wrong domain | No authenticated session; no private plan access |
| W03 | Browser/adapter | Wallet transaction rejection before broadcast | No submitted claim; preserve draft and known facts; do not retry automatically |
| W04 | Browser/adapter | Account/network switch during preview and during signing/submission | Pre-sign invalidation; post-call existing attempt reconciled under original context without sending from new context |
| W05 | Browser/integration | Repeated click, keyboard activation, concurrent tabs, repeated request body | At most one active signer invocation per approval; durable uniqueness prevents duplicate server claims |
| W06 | Adapter/integration | Older preview/read response arrives after a new edit/account/network request | Generation/context mismatch discarded; stale response cannot re-enable approval |
| W07 | Adapter/integration | Refresh/close tab or crash between durable request creation, wallet call and hash persistence | Recover existing request; no automatic resend; unknown if correlation cannot resolve |
| R01 | Unit/adapter | Hash only, then chain confirmed without order evidence | Submitted/confirmed shown separately; never filled or accepted merely from hash |
| R02 | Unit/adapter | Confirmed transaction carrying order rejection, reverted transaction | Accurate transaction and order dimensions; explain available reason without inventing it |
| R03 | Unit/adapter | Partial fills then remainder cancelled; fill values arrive in multiple observations | Exact cumulative fills/remainder; cancellation never erases fill; no double counting |
| R04 | Unit/adapter | Timeout with hash, timeout without hash, indexer lag or conflicting observations | Persist request; reconcile existing identity; unknown stays unknown; no blind retry |
| R05 | Adapter/browser | WebSocket drop/reconnect with only an authoritative current snapshot available | Reconciled snapshot and visible history gap; no fabricated event replay |
| R06 | Adapter | Order disappears from open orders; receipt reorg/replacement/source mismatch | Do not infer a fill; validate identity and downgrade confidence/reconcile as appropriate |
| R07 | Integration | Attempt to attach another chain/account/pool/order receipt or arbitrary client status | Reject evidence association; no verified badge |
| L01 | Integration | Client tampers with parent/root/depth/source hash or creates a cycle/second-generation remix | Server derives lineage from visible exact source version; rejects invalid depth/cycles |
| L02 | Integration/browser | Clone source after root has a newer version; edit child; compare diff | Child remains pinned to selected source; no original mutation; no copied approval/request/execution |
| L03 | Integration | Private/missing/unpublished source and direct clone URL | No draft leak; deliberate source-unavailable behavior; child ownership preserved |
| A01 | Integration | Unauthenticated and cross-owner fetch/edit/publish/execution claims; guessed IDs | Access denied consistently; no private data in responses/errors |
| A02 | Integration | Nonce replay, session expiry, CSRF mutation, concurrent writes | Rejection or safe version conflict; no unauthorized mutation |
| P01 | Integration/browser | Save and execute without publication; public route probe | No public card/private content disclosure |
| P02 | Integration | Allowlist publication, attempts to include secrets/private fields, SSR/JSON/metadata/image output | Only selected safe fields exposed; no object-spread leaks; explicit address/link disclosure |
| P03 | Integration/browser | Unpublish then use direct URL, cached HTML/API data and comparison | App access withdrawn and caches invalidated; copied/public-chain limitations explained |
| S01 | Integration | Error/log/telemetry payload containing synthetic secret/session/signature canaries | Redacted in server/client logs, URLs, screenshots and share payloads; no raw secrets |
| S02 | Unit/integration | Mainnet/wrong chain config, malicious endpoints/contracts, offline/live mode crossover | Signing fails closed; fixture evidence cannot be promoted to verified live receipt |
| U01 | Browser | 360px mobile and 1280px desktop: edit/review/card/diff, long values | Readable, no horizontal overflow, usable touch targets and sensible text wrapping |
| U02 | Browser/manual | Keyboard/focus/labels/status announcements, non-color statuses, reduced motion | Complete accessible flow and recoverable validation/errors |
| U03 | Browser | Loading, empty, unavailable, rejected, unknown and interrupted states | No false success; draft preserved where safe; clear next action |

Fixture decimals are test cases, not a permanent market table. Use synthetic accounts/receipts marked as fixtures, not invented live users. Redaction tests use fake canaries, never real credentials.

## Read-only integration checklist

- [x] Record pinned SDK/version and exact read/sign interfaces with official ABI/source checks (SOURCES.md; actual wallet unrun).
- [x] Verify public RPC chain ID, market/system/collateral identities, metadata and code/config; M5 actual snapshot and rejection tests.
- [ ] Verify actual owner's selected market eligibility, order limits and account context without a transaction; public tick/lot/minimum passed, account fixtures only.
- [x] Verify public HTTP/WebSocket/indexer availability/freshness; actual owner/history checks remain unavailable until authorized.
- [x] Prove public read-only interface has no trader side effects using mocks/traps and review of actual calls.
- [x] Document receipt/order correlation and bounded history semantics; synthetic adapter tests passed, actual order history unrun.
- [ ] Reverify accepted bounty environment separately from chain identity.

## Live testnet acceptance checklist

Only perform these after the user authorizes the session and the relevant actions. This list does not authorize any transaction or signature.

- [ ] User-approved wallet connection/authentication completed through the intended secure flow; no private keys exported/stored.
- [ ] Live chain/config/market and account limits verified; exact bounded root plan previewed with full final fields.
- [ ] User explicitly approved the root order, then approved signing in their wallet; persist request/hash/order identity and actual status.
- [ ] Reconcile authoritative protocol evidence. Record accepted/open/partial/filled/cancelled/rejected/unknown exactly; a hash is insufficient.
- [ ] Owner explicitly approved selected public fields and disclosure links; card shows evidence level, testnet label and as-of time.
- [ ] Independent viewer/owner context created a one-level remix with visible differences and no inherited authority.
- [ ] Remix owner received a fresh preview and separately approved the exact order and wallet operation; record its own execution identity and outcome.
- [ ] Compare parameter differences and lineage; do not treat different fill times/prices as a controlled experiment or real profit.
- [ ] Capture actual desktop/mobile evidence, including reconnect/unknown handling where feasible without creating extra unapproved orders.
- [ ] Identify all remaining orders/positions and any unknown attempts. No automatic cancellation/close; any cleanup is separately authorized.
- [ ] Confirm current rules accept the demonstrated environment/outcomes; if not established, keep bounty readiness blocked.

If an authorized order rests or partially fills, preserve that real result. Never force a staged fill or generate fictitious counterparties. A current rule requiring something more remains unmet until real approved activity supplies it.

## Evidence record for the future run

For every check store ID, commit, command/scenario, date/time, mode (`synthetic/offline`, `read-only`, `live testnet`), actual result, redacted evidence path and limitation. Reference coherent evidence in DEMO.md; do not duplicate full logs. Before any screenshot/log enters the repo, review it for secrets and private information.

| Evidence group | Commit/environment | Actual result | Evidence/limitation |
| --- | --- | --- | --- |
| Documentation checks | Initial docs baseline, 2026-10-20 | Passed local inventory/link/fence/title/credential-pattern checks; 13 Markdown files | Private repository metadata verified; exact final remote commit/inventory reported in documentation task handoff. No app or live result implied |
| Clean-checkout offline CI | 0eff0b32339306c13a8f9224c5d84d547f78c9e2, GitHub Ubuntu/Node 24, 2026-10-20 | Passed install, migration, typecheck, lint, 39 tests, build and 8 Chromium scenarios | [CI 39456931257](https://github.com/tang-vu/forktrade/actions/runs/39456931257). Source/offline only; G3/G4/G5 are distinct |
| Typecheck/lint/unit/build | Offline increment after 3421521, Node 24.21.0, Drizzle RC/node:sqlite | Clean npm ci/migration/typecheck/build passed; 39 unit/integration tests passed | tests/domain.test.ts, repository.test.ts, api.test.ts. Lint fixes included; no live adapter claim |
| Offline browser tests | Production build, Chromium, Windows, synthetic/offline | Final rebuilt full suite: 8 passed in 19.9s; selector/revision/encoding/focus defects fixed and rerun | evidence/offline-desktop.png, offline-remix-desktop.png, offline-card-mobile.png, offline-remix-mobile.png; visually inspected; no live receipt |
| Read-only integration | M0 increment on feat/forktrade-core, 2026-10-20 | `npm.cmd run check:readonly` passed; SDK WS + HTTP chain/config/BTC metadata reads | evidence/read-only-2026-10-20.json; account sizing/history/eligibility still unverified; G3 partial |
| M4 public reads and account-contract tests | Increment after d4241f3, 2026-10-20 | Real public check passed with verified bank/factory mapping/registration, book and precision; 64 unit/integration tests passed | evidence/read-only-m4-2026-10-20.json; tests/read-context.test.ts. Account results are synthetic transport fixtures only, never live evidence; G3 remains partial until permitted actual account/history checks |
| M4 clean-checkout CI | bdf09fdbb03d9dd76b0ddc0d4579e8462026fb7a, Ubuntu/Node 24 | Passed clean install, source checks, 64 tests, build and 9 browser scenarios | [CI 39459400533](https://github.com/tang-vu/forktrade/actions/runs/39459400533); no actual wallet or owner reads |
| M5 source and adapter composition | M5 implementation commit, Windows/Node 24.21.0, 2026-10-20 | Typecheck/lint/build and 99 tests passed; final rebuilt 17 browser cases passed in 30.8s after visual/config fixes | tests/order-flow.test.ts, observe-order.test.ts, live-api.test.ts, read-context.test.ts and e2e/live-wallet.spec.ts. Mock signatures/receipts are test-only; actual wallet/simulation/receipt compatibility unrun |
| M5 actual public verification | feat/forktrade-core, 2026-10-20 17:24 UTC | `check:readonly -- evidence/read-only-m5-2026-10-20.json` passed; ~1.75s public snapshot with code hashes | No account, ownership signature, trader or transaction; accepted environment still unverified |
| M5 clean-checkout CI | 8614a4c2572f2d2c9556d9452df45924c8c8e80d, GitHub Ubuntu/Node 24 | Passed clean install/migration/typecheck/lint, 99 tests, build and 17 browser scenarios (18.5s) | [CI 39466554457](https://github.com/tang-vu/forktrade/actions/runs/39466554457); source/mock/offline only, no live evidence |
| Final perps ABI/source correction CI | 97d0aee313083daf6c65a24f58d74852602b38f7, GitHub Ubuntu/Node 24 | Passed clean install/migration/typecheck/lint, 99 tests, build and 17 browser scenarios | [CI 39467081045](https://github.com/tang-vu/forktrade/actions/runs/39467081045); complete ABI equality and calldata checks. No actual wallet/account/order evidence |
| Final handoff commit CI | 55b002030947eeae9ba465b8680de7d2c9f28182, GitHub Ubuntu/Node 24, 2026-10-20 17:38 UTC | Inspected terminal success: install/migration/typecheck/lint, 99 tests, build, 17 browser scenarios (25.0s) | [CI 39467438767](https://github.com/tang-vu/forktrade/actions/runs/39467438767); no source changes since prior green ABI commit. Actual account/root/remix remain unrun pending permission |
| Actual dev/browser read-only smoke | M5 implementation commit, local port 3001, 2026-10-20 17:27 UTC | Rendered readonly workspace with disabled wallet control; actual public market refresh; 360px no overflow/page errors | evidence/readonly-desktop.png and readonly-market-mobile.png inspected. First smoke script selector corrected after timeout. Dev server stopped; no account/wallet call |
| Optional persistent local server | After 8614a4c | Blocked before process creation by execution policy (“blocked by policy”); no alternate launcher attempted | Existing documented dev/production checks passed. No server is left running; not a source/build failure |
| Ownership/account session | Permission requested 2026-10-20 17:35 UTC; pending | Not run | Existing user-selected EOA, localhost:3000, Hideki 50383; ownership signature plus read-only BTC context only; all flags false |
| Root live execution | No authorized execution session | Not run | No order/hash/receipt; each final order needs separate approval and confirmed environment |
| Remix live execution | No authorized session | Not run | No order/hash/receipt |
| Bounty submission | Private planning state | Not submitted | No post links/judge-access approval |

## Completion definition

Current coverage boundaries: N/V/L/A/P invariants have unit/server/offline browser evidence. M5 adds mocked account/risk/simulation, raw SDK-ABI comparisons and W01–W07 browser/adapter cases for denied connection, separate challenge review, no send while disabled, double click, durable uniqueness, account/network invalidation, lost responses and reload. R01–R07 use synthetic raw logs/receipts and current snapshots for hash-only, revert/no placement, partial/cancelled, missing/ambiguous correlation, history gaps, absence, reorg/conflict, amendments and foreign identity. Source inspection prompted a single explicit EIP-1193 send instead of a wallet action that can fall back after RPC errors; rejection/invalid-parameter cases assert no alternate send. Actual owner's wallet/account/simulation/transport/reconnect remains unrun, so G3/G4 remain partial/blocked. U01–U03 include 360/1280px, dialog keyboard/focus/expiry, mobile saved-plan recovery and honest unknown/error states. Offline/browser interception and injected ownership verification do not establish a real signature, protocol receipt or live WebSocket replay. Synthetic canary redaction is tested; no independent audit claim.

All N/V/W/R/L/A/P/S/U scenarios relevant to the implemented path must pass with recorded evidence, and the remaining cases must have explicit justified coverage rather than unchecked omission. The app must run from a clean checkout using documented commands. G1-G4 must pass to call the implementation goal complete. A missing live permission or inaccessible accepted environment leaves it partial/blocked even if every offline test passes. G5 is a separate external readiness gate; source success is neither submission nor reward eligibility.
