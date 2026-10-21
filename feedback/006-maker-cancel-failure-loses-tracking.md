# perp-maker replaces quotes after cancellation errors and drops the old IDs

Severity: normal (proposed; organizer decides)
Area: SDK
Related surface: official bot-kit control flow; not a claimed markets-sdk library defect
Status: reproduced offline; reviewed additional Feedback report, not submitted

## Impact and scope

`cancelQuietly` catches every cancellation exception and resolves normally. The maker then clears the old `resting` state and reaches replacement placement calls without establishing that the old quotes are gone. At shutdown it only visits the replacement IDs, then logs that quotes were pulled. An unavailable or uncertain cancel is treated like the documented benign already-gone race.

This is an offline failure-injection/control-flow reproduction, **not evidence of an actual cancellation, duplicate live order, resting quote, exposure or loss**. The placement helper returns explicit in-memory sentinel fixtures 1–4 so the caller's ID tracking can be tested. They are not generated receipts or chain history. The simulated cancellation failure is injected; no RPC outage or actual transaction outcome is claimed.

**Related prior report / duplicate risk:** [public issue 38](https://github.com/somnia-chain/dreamdex-bot-kit/issues/38) already describes the same swallowing-and-forgetting mistake in its author's binary-market vault and focuses on a venue-side cancellation revert. This report concerns the current official `perp-maker` and `perp-core/cancelQuietly` implementation, not that venue cause. Organizers may treat the pattern as known/related; first-report priority and acceptance are unknown. Do not count the error variants or shutdown log as separate issues.

## Steps to reproduce

1. Use Node 24; no dependency installation, wallet or SDK is needed.
2. Run `node --experimental-vm-modules feedback/repro/006-maker-cancel-failure.mjs` from the root. Retain adjacent `_botkit-offline.mjs` and `_maker-offline.mjs`.
3. Compare the successful-cancel control with injected transport-failure and unknown-outcome cases. Each runs two bounded maker cycles with synthetic marks 100 then 101 and final cleanup.
4. Inspect cancellation calls, placement seams and remaining **test-double** IDs. The old sentinel IDs 1/2 are visited only once, then forgotten even in failure cases. All cases reach replacement seams 3/4 and the success-like final log.

Three immutable public source GETs/hash checks precede offline execution. Original maker and cancel-helper bodies run; only the automatic startup footer is replaced for controlled invocation. Main requests `withSigner:false` and remains `DRY_RUN=true`. Only `cancelQuietly` receives a separate `dryRun:false` synthetic context so its exception-catching branch is exercised against a local throwing test double. No real trader, provider, signer, wallet, hash or receipt exists. Placement, sizing, mark and account dependencies are explicit fixtures; this is not an ordinary end-to-end dry run or live integration test.

## Expected

Tolerate an established already-gone result, while preserving and surfacing other cancellation failures. Retain the old ID until authoritative reconciliation establishes its outcome; avoid replacement under that unresolved identity. Cleanup must report unresolved cancellations rather than imply every quote was pulled. The SDK's own published quoting-loop guide distinguishes its known already-gone error from other errors and retains IDs on cleanup failure; this is a compatible integration expectation, not a demand that all harmless races terminate a bot.

## Actual

| Offline case | Old-ID cancel calls | Replacement seams | Uncancelled IDs in test double at end | Final source log |
| --- | --- | --- | --- | --- |
| Successful-cancel control | 1/2 resolve | 3/4 reached | none | `quotes pulled, exiting` |
| Injected transport failure | 1/2 throw, helper resolves | 3/4 reached | 1/2 | same |
| Injected unknown outcome | 1/2 throw, helper resolves | 3/4 reached | 1/2 | same |

There are zero authoritative cancellation-reconciliation reads in this path. Test-double state is only a controlled illustration of “not established cancelled”; it is not proof that a timed-out live cancellation would fail or leave an order resting. An unknown live outcome must remain unknown.

The catch is in [orders.ts](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/packages/perp-core/src/orders.ts#L206); the maker [clears the old state](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-maker/src/index.ts#L133) and later retains only the next IDs. This is independent of 005: both first quotes are present as fixtures, sizing is always ready and the mark moves past the re-quote threshold.

## Evidence

- [Reproducer](repro/006-maker-cancel-failure.mjs), [shared infrastructure](repro/_botkit-offline.mjs), [pinned maker-source definitions](repro/_maker-offline.mjs).
- [Explicit offline output](evidence/006-offline-cancel-failure.json), including fixture disclosures, calls, logs and controls.
- The official SDK 0.32.1 archive contains `docs/how-to/run-a-quoting-loop.md`, whose selective `cancelIfResting` handling contrasts with this catch-all. Archive/source provenance is in [release verification](evidence/007-sdk-release-verification.json); it is corroborating documentation, not a live reproduction.

## Environment

- Observed 2026-10-21 12:52 UTC, Windows / Node v24.21.0.
- Official bot-kit revision `25798660bbe4674a6f83a960b202852896e2fed4`; exact source hashes enforced by the runner.
- Fully offline execution after public source retrieval; zero-address test sentinel, local synthetic writer responses/errors and bounded cycles only.
- No network/account/testnet transaction, actual order ID, signed material or financial consequence.

## Duplicate search and outcome

Public search `repo:somnia-chain/dreamdex-bot-kit is:issue cancel` on 2026-10-21 returned issues 7, 33, 38 and 40; all bodies were reviewed. The overlap with 38 is explicitly disclosed above. Other results cover operator-owned reads and binary cancellation/expiry behavior, not this exact official perps caller. Private bounty Builds/community reports remain unavailable/unsearched. Proposed normal only; bot-kit scope, relation to existing reports, severity and acceptance are organizer decisions. No submission, acceptance or reward is claimed.
