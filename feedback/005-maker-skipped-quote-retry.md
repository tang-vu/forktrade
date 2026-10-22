# perp-maker suppresses retries after both quotes are skipped until the mark moves

Severity: normal (proposed; organizer decides)
Area: SDK
Related surface: official dreamDEX bot kit, not a markets-sdk library defect
Status: user reports submitted in [DoraHacks Build 50119](https://dorahacks.io/build/50119), 2026-10-22; public Build/repo verified, track registration not independently verified; organizer decision/payment unverified

## Impact and scope

If both initial sizing reads reject their quotes, the maker still records the mark as its resting-quote reference. At the same mark, following cycles exit through the drift gate before trying sizing again. The fixture's next two cycles can supply recovered sizing, but the code never calls it. A separate control recovers immediately when the mark moves far enough.

This establishes a bounded offline retry-suppression path, not an actual oracle outage, lost revenue, live account, accepted quote or financial loss. The README deliberately avoids replacing existing quotes without sufficient price movement. The concern here is the case where both quotes were skipped and no quote was placed to preserve. Organizer scope/intent/severity decisions remain open.

## Environment

- Observed 2026-10-21 08:56:51 UTC; Node v24.21.0 on Windows.
- Official revision `25798660bbe4674a6f83a960b202852896e2fed4`; pinned maker, market-conversion and order-helper source hashes are checked.
- `DRY_RUN=true`, flat synthetic position, sufficient preflight fixture, three bounded cycles, 8bps default re-quote threshold.
- Sizing's first-cycle `priceable:false` and later recovery are synthetic responses. Mark and account helpers are test doubles; no actual outage is claimed.
- No wallet/key/RPC/signature/order/transaction. Three public GETs retrieve source before offline execution; original strategy/helper bodies execute with only the startup footer replaced.

## Steps to reproduce

1. Use Node 24 and run `node --experimental-vm-modules feedback/repro/005-maker-skipped-quote-retry.mjs` from the root, retaining adjacent `_botkit-offline.mjs` and `_maker-offline.mjs`.
2. Compare the three cases below. Source retrieval is unauthenticated and hash-checked; no dependency installation is required. Node's VM/TypeScript experimental warnings are expected.
3. Inspect `sizingReads` by cycle. In the failure/stable-mark case, there are no second/third-cycle reads, so the recovery fixture is never consulted.

## Expected

Retry an initially skipped quote after its transient gating condition may have recovered, even when the mark is unchanged and there are no existing quotes. Use the movement threshold to avoid replacing working quotes, while keeping quote absence/failure distinct from an established reference. This is an inference from the maker's purpose and the [README's description of replacing quotes](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-maker/README.md).

## Actual

| Synthetic case | Marks across 3 cycles | Sizing-ready fixture | Sizing reads | Dry-run quote intents |
| --- | --- | --- | --- | --- |
| Transient failure, stable mark | 100 / 100 / 100 | false / true / true | 2, both cycle 1 | 0 |
| Healthy stable control | 100 / 100 / 100 | true / true / true | 2, both cycle 1 | 2, cycle 1 |
| Transient failure, moving control | 100 / 101 / 101 | false / true / true | 4, cycles 1 and 2 | 2, cycle 2 |

After the [sizing-skip branches](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-maker/src/index.ts#L163), the code [assigns the next reference](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-maker/src/index.ts#L186) with a mark even though no IDs exist. The [drift gate](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-maker/src/index.ts#L123) then skips work. Continued suppression while the same inputs persist is a source-derived implication; only three cycles were executed. No indefinitely running live observation is claimed.

## Evidence

- [Reproducer](repro/005-maker-skipped-quote-retry.mjs), [maker test adapter](repro/_maker-offline.mjs), [shared infrastructure](repro/_botkit-offline.mjs).
- [Explicit offline synthetic output](evidence/005-offline-maker-retry.json), source hashes, original helper logs, counters and controls.

No synthetic order ID, accepted receipt or fill is generated. The real dry-run placement helper is used and its no-submission/zero-fill result is asserted.

## Duplicate and independence check

Public GitHub search `repo:somnia-chain/dreamdex-bot-kit is:issue perp-maker` on 2026-10-21 returned only issue 23, the previously reviewed feature request. Private bounty Builds/community submissions are unavailable/unsearched; first-report priority is unknown. This is independent of 004's position-limit semantics: the fixture is flat and below all caps, and the problem is retaining a success-like reference after both quotes were skipped.

## Suggested investigation and outcome

Track missing/skipped legs and retry those without requiring a price drift. Preserve the movement gate for valid existing quotes and avoid repeatedly sending uncertain transactions. Add both recovered-same-mark and moved-mark controls. No upstream patch or live fix is claimed. User approved this reviewed addition and its Feedback submission on 2026-10-21. No actual submission, organizer acceptance or payment is established.
