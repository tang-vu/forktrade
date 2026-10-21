# perp-starter dry-run selects the configured bracket side when managing an opposite existing position

Severity: normal (proposed; organizer decides)
Area: SDK
Related surface: official dreamDEX bot kit, `perp-starter` integration example; not a claimed markets-sdk library defect
Status: reproduced offline with explicit synthetic fixtures; publication/submission authorized, not submitted yet

## Impact and scope

The official starter accepts an existing position as the position it will manage, but derives the bracket direction and take-profit/stop-loss ordering from `PERP_SIDE` instead of the existing position's side. A restart with the opposite setting therefore produces an internally contradictory dry-run: it identifies a short position, then proposes a long bracket, or vice versa.

This report establishes a reproducible code-path/dry-run mismatch in the official example. It does **not** establish that an incorrect stop was accepted, a position was unprotected on chain, or funds were lost. Actual contract behavior, live accounts and trading-key watched exits are untested. Proposed normal severity reflects those limits. The organizer must also decide whether the official bot-kit example belongs within the Feedback scope.

## Environment

| Field | Observed value |
| --- | --- |
| First offline reproduction | 2026-10-21 04:49:19 UTC, local TypeScript-transpiled source harness |
| Saved dependency-free reproduction | 2026-10-21 04:51:04 UTC |
| Upstream source | `somnia-chain/dreamdex-bot-kit`, revision `25798660bbe4674a6f83a960b202852896e2fed4` |
| Workspace | `@dreamdex-bot-kit/perp-core` 0.1.0, as declared in the pinned source |
| Runtime | Node v24.21.0, Windows; Node built-in TypeScript stripping and VM modules |
| SDK | Not loaded by this offline test; no installed/resolved upstream SDK version is claimed |
| Execution mode | `DRY_RUN=true`, synthetic existing position, mark and helper responses |
| Network / wallet | No chain/RPC/account connection; zero-address test sentinel only, no created wallet or private key |
| Public requests | Two unauthenticated GETs retrieve the pinned upstream strategy/helper; source hashes verified before execution |
| Signatures / transactions / orders | None; signer request and unexpected write paths fail the test |

## Steps to reproduce

1. Use Node 24. No package installation or wallet is required.
2. From this repository's root, run:

   ```powershell
   node --experimental-vm-modules feedback/repro/002-existing-position-side.mjs
   ```

3. The reproducer downloads two immutable, SHA-256-checked source files from the official repository. It strips TypeScript types, executes the unchanged strategy and `armBracket` bodies, and supplies explicitly synthetic exchange/position/preflight/mark/alignment responses. The execution context has no RPC client, wallet, network import or private key.
4. Inspect the four cases. The two matching-side controls produce a matching bracket. The two opposite-side cases identify one position side and request a bracket for the other.

Node emits experimental-feature warnings for VM modules and TypeScript stripping; these are expected runtime notices, not the reported behavior. Optional `--out feedback/evidence/<new-file>.json` saves a new result without overwriting previous evidence.

## Expected

If the bot chooses to manage an existing position, derive bracket orientation and trigger ordering from that position's side. Alternatively, stop with an explicit side-mismatch explanation and require the operator to resolve it. This is an inference from the starter's existing-position branch and the helper's position-oriented interface, rather than a promise that arbitrary configuration changes must be accepted.

The [existing-position branch](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-starter/src/index.ts#L121) expressly chooses management rather than a new entry. The [bracket helper](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/packages/perp-core/src/stops.ts#L39) defines its `position` argument as the protected position's side and derives closing direction and trigger operators from it.

## Actual

Synthetic fixture: no pending stops, mark 100, default take-profit 2% and stop-loss 1%, owner mode rather than a linked trading key.

| Configured `PERP_SIDE` | Synthetic existing side | Requested bracket side | Dry-run take-profit / stop-loss | Result |
| --- | --- | --- | --- | --- |
| long | long | long | 102 / 99 | Matching control |
| long | short | long | 102 / 99 | Side mismatch |
| short | long | short | 99 / 102 | Side mismatch |
| short | short | short | 99 / 102 | Matching control |

All four runs reached the normal shutdown path and exit code 0. No position was opened; the existing-position branch was exercised. The mismatch appears in the original helper's dry-run output, not only in a separately reimplemented price calculation.

The [trigger calculation](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-starter/src/index.ts#L173) and [bracket call](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-starter/src/index.ts#L187) continue to use configured `SIDE`; the existing position's `side` is only used in the earlier status message. This code relationship is observed. On-chain consequences remain unknown.

## Evidence

- [Dependency-free source-hash-checked reproducer](repro/002-existing-position-side.mjs).
- [Saved offline synthetic output](evidence/002-offline-existing-position.json), including both matching controls and both mismatches.
- [Pinned strategy source](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-starter/src/index.ts).
- [Pinned bracket helper](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/packages/perp-core/src/stops.ts).

The evidence is explicitly **offline and synthetic**, with real execution of the pinned example code. It is not a live execution screenshot, fill, stop, receipt, performance result or verified account history. The test doubles and untested integrations are listed in the JSON and reproducer. No authentic account identifier or secret is included.

## Duplicate / known behavior check

On 2026-10-21, searched public GitHub issues with `repo:somnia-chain/dreamdex-bot-kit is:issue perp-starter`. The sole returned item was [issue 23, adding the perp strategies](https://github.com/somnia-chain/dreamdex-bot-kit/issues/23); its body did not describe this mismatch. Reviewed the pinned starter README, perps guide and the two relevant source files. The bounty's Builds list is private; private reports, Discord and Telegram were not searched. Absence of duplicates and first-report priority are not established.

This issue concerns the example's existing-position branch and is independent of report 001's app-entry routing observation.

## Suggested investigation

Choose the managed side once after reading the existing position, then use that side consistently for the bracket and trigger levels. A deliberate rejection of mismatched configuration is also reasonable. Add regression coverage for both opposite-side cases and matching controls; revalidate the resulting stop request in an appropriately authorized integration test. No upstream patch or live fix is claimed here.

## Submission and outcome

Publication and submission of this reviewed extension were authorized on 2026-10-21. Submission remains pending; no organizer response, acceptance or payment exists. No security exploit or unauthorized-access claim is made.
