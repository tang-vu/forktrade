# perp-maker's named maximum position permits a near-cap quote beyond that notional

Severity: normal (proposed; organizer decides)
Area: docs
Related surface: official bot-kit perp-maker setting/implementation; strict-cap intent needs maintainer confirmation
Status: behavior reproduced offline; user-approved clarification/report candidate, not submitted

## Impact and scope

`PERP_MM_MAX_POSITION_USDSO` is described as a notional cap. The example stops an increasing quote once inventory is already at that value, but does not clamp a quote to the remaining headroom. In the reproduced fixture, inventory 90, setting 100 and quote notional 25 still produce a full increasing quote. Its projected position at the unchanged fixture mark is 115.

**Intent is not established:** the README explicitly explains stopping the leaning side at the cap; it does not explicitly promise headroom clamping near it. If this is a soft threshold by design, documenting that distinction and renaming/explaining the setting would resolve the ambiguity. This is lower confidence as a malfunction than reports 003/005, and is framed for clarification rather than called a protocol-cap bypass. No live quote, fill, exposure, financial loss or contract defect is demonstrated.

## Environment

- Observed 2026-10-21 08:56:51 UTC; Windows, Node v24.21.0, official bot-kit revision `25798660bbe4674a6f83a960b202852896e2fed4`.
- `DRY_RUN=true`; explicit synthetic mark 100, base precision 8, quote precision 18, default quote notional 25 and local position setting 100.
- Pinned maker, market conversion, sizing and dry-run placement helper bodies execute. SDK sizing/account responses are test doubles; the SDK itself is not loaded.
- No wallet/RPC/private key/signature/transaction. Three public source GETs precede the offline test; source hashes are checked.

## Steps to reproduce

1. Use Node 24; no package installation or wallet is needed.
2. Run `node --experimental-vm-modules feedback/repro/004-maker-position-limit.mjs` from the root with adjacent `_botkit-offline.mjs` and `_maker-offline.mjs`.
3. Inspect all six fixture controls. TypeScript stripping/VM-module warnings are expected. Only the auto-start footer is replaced; original function bodies remain unchanged.

## Expected

If the named maximum is intended as a hard position limit, increasing quote quantity should be clamped to remaining notional headroom on the market's lot grid. If it is a soft threshold, state explicitly that a quote can take the projected position beyond it. The hard-limit expectation is an inference from the setting name and the [README's cap description](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-maker/README.md), not a proven contract guarantee.

## Actual

| Synthetic signed inventory USDso | Increasing quote | Projected absolute inventory at mark 100 |
| --- | --- | --- |
| 0 | Both directions 25 | 25 |
| +75 | Long 25 | 100, boundary control |
| +90 | Long 25 | 115 |
| -90 | Short 25 | 115 |
| +100 | Long skipped; reducing short remains | 75 after reducing intent |
| -100 | Short skipped; reducing long remains | 75 after reducing intent |

The [local check](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-maker/src/index.ts#L155) compares current inventory with the setting, then asks SDK sizing for the full quote amount. This local configured cap is not supplied to SDK sizing. Exact integer raw amounts compute the projected table; it is a hypothetical quantity calculation, **never a generated fill or receipt**. Every actual dry-run helper returns `sent:false` and zero filled.

## Evidence

- [Reproducer](repro/004-maker-position-limit.mjs), [maker test adapter](repro/_maker-offline.mjs) and [shared infrastructure](repro/_botkit-offline.mjs).
- [Saved offline output](evidence/004-offline-maker-limit.json), including raw amounts, controls and explicit limitations.

## Duplicate and independence check

On 2026-10-21, public search `repo:somnia-chain/dreamdex-bot-kit is:issue perp-maker` returned only issue 23, the feature request previously read. Private Builds/community reports are not compared; duplicate priority is unknown. Local headroom semantics are independent of 005's failed-quote retry control flow; fixing either does not inherently fix the other.

## Suggested investigation and outcome

Confirm whether the parameter is a hard cap or a quoting threshold. Clamp projected increasing quantity if hard, or document possible overshoot and avoid implying a strict bound if soft. Keep this as one issue; do not split long/short examples into separate reports. Proposed normal only, organizer scope/intent/severity decision required. User approved publication/submission of this reviewed clarification candidate on 2026-10-21; intent remains unresolved and no actual submission, acceptance or payment is established.
