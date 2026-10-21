# perp-starter applies a new-entry margin budget before discovering an existing position

Severity: normal (proposed; organizer decides)
Area: SDK
Related surface: official dreamDEX bot kit, not a markets-sdk library defect
Status: reproduced offline; private draft, not published/submitted

## Impact and scope

The starter has an existing-position management path, but a startup check first requires enough unlocked collateral for the configured **new** entry. An account that could manage its smaller existing position can therefore be stopped before the bot even reads that position. The message asks for a deposit to open a first position, although no new entry is intended in the fixture.

This is an offline control-flow reproduction in the official integration example, not evidence of an actual account, missing live protection, accepted/rejected stop, liquidation or loss. Bot-kit track eligibility and severity are for the organizer to decide. The test keeps configured/existing side equal; report 002's opposite-side condition is absent.

## Environment

- Observed 2026-10-21 08:54:12 UTC; Node v24.21.0 on Windows.
- Official bot-kit revision `25798660bbe4674a6f83a960b202852896e2fed4`; exact starter/margin hashes are checked by the reproducer.
- `DRY_RUN=true`; synthetic long 0.01 base at mark 100 (notional 1), matching configured long side, no pending stops. Synthetic equity/unlocked collateral is 20, 25 or 30 USDso, with a much smaller position initial requirement of 0.5.
- Default configured new-entry notional 50 and leverage 2 imply a startup budget of 25 USDso.
- No chain/RPC/wallet/key; zero-address test sentinel only. SDK responses are fixtures, not a loaded/live SDK or account.
- Two unauthenticated GETs retrieve pinned source before execution. Execution itself is offline, with no signer/write path.

## Steps to reproduce

1. Use Node 24; no dependencies or wallet are required.
2. Run `node --experimental-vm-modules feedback/repro/003-existing-position-preflight.mjs` from the repository root. Keep its adjacent `_botkit-offline.mjs` helper.
3. Inspect the three cases: the 20-USDso fixture requests process exit 1 before any position read; the 25/30 controls read the existing position and reach the bracket-management seam. All cases prohibit a new-entry request.

The original strategy, `preflight` and `marginSnapshot` bodies execute. TypeScript types are stripped; only the strategy's automatic startup footer is replaced so `main` can be awaited and `process.exit` can abort the test invocation immediately. Virtual exit is recorded, not executed against the user's process. Exchange/position/mark/bracket helpers are explicit test doubles. Node's experimental-feature warnings are expected.

## Expected

Discover an existing position before enforcing a **new-entry** budget. If the bot elects to manage it, keep management-appropriate margin/native-fee checks and explain any real management prerequisite. Requiring the configured new-entry budget should apply when an entry will be attempted. This expectation is inferred from the [existing-position management branch](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-starter/src/index.ts#L121), rather than a claim that management must ignore account health or fee funding.

## Actual

| Synthetic unlocked USDso | Termination | Position reads | Bracket seam reached | New-entry requests |
| --- | --- | --- | --- | --- |
| 20 | `process.exit(1)` requested | 0 | No | 0 |
| 25 | Main returned | 1 | Yes | 0 |
| 30 | Main returned | 1 | Yes | 0 |

The [startup preflight/exit](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/strategies/perp-starter/src/index.ts#L86) runs before discovery. The [margin helper](https://github.com/somnia-chain/dreamdex-bot-kit/blob/25798660bbe4674a6f83a960b202852896e2fed4/packages/perp-core/src/margin.ts#L128) compares unlocked collateral with that new-entry budget. The low-budget log describes insufficient funds for a first position. No actual bracket or order was sent in any case.

## Evidence

- [Reproducer](repro/003-existing-position-preflight.mjs) and [shared offline infrastructure](repro/_botkit-offline.mjs).
- [Saved explicitly synthetic output](evidence/003-offline-existing-preflight.json), with hashes, fixture fields, call counts and logs.

## Duplicate and independence check

On 2026-10-21, public GitHub search `repo:somnia-chain/dreamdex-bot-kit is:issue preflight` returned no items. The starter's public feature request, issue 23, had already been reviewed. Private bounty Builds/community reports were not accessible/searched; first-report priority is unknown. This is independent of 002: here sides match and management is never reached; correcting bracket orientation alone would not resolve this startup gate.

## Suggested investigation and outcome

Separate existing-position management prerequisites from new-entry budget checks. Add below/exactly/above-budget restart controls with matching existing sides. Preserve valid health and native-fee checks. No upstream patch or live fix is claimed. Private draft only; no publication/submission approval, organizer response, acceptance or payment exists for this addition.
