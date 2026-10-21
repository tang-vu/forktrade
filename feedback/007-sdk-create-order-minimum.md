# Unified createOrder uses the lot threshold instead of the current perp minimum

Severity: normal (proposed; organizer decides)
Area: SDK
Status: actual public configuration plus offline SDK reproduction; reviewed additional Feedback report, not submitted

## Impact and scope

SDK 0.32.1's unified `SomniaMarkets.createOrder` rejects amounts that round below one lot, but does not reject a positive aligned quantity below a perp market's separate `minQuantity`. The implementation comment assumes one lot equals the venue minimum. Actual BTC metadata and a pinned public contract read show lot `1000` and minimum `13000` raw base units, so that assumption does not hold for this perp market.

The unchanged SDK method reaches a mocked trader boundary for `0.00001`, `0.00012` and `0.000129` BTC, sending the seam quantities `1000`, `12000` and `12000` respectively, all below that minimum. **No real writer, signer, transaction, reverted order, wallet prompt or gas loss was observed.** This is a local validation/developer-experience issue; the test demonstrates no protocol bypass or acceptance of an undersized order.

## Steps to reproduce

1. Use Node 24. The public Feedback repository's minimal package/lock pins SDK 0.32.1 and viem 2.57.7: run `npm ci --ignore-scripts --no-audit --no-fund` in that repository. In ForkTrade's private checkout, the existing pinned installation already supplies them. No wallet/environment configuration is needed. The reproducer was also checked in an isolated directory with only those public files/dependencies.
2. Keep `feedback/evidence/007-btc-public-grid.json` next to the evidence output and run `node feedback/repro/007-sdk-perp-minimum.mjs` from the repository root.
3. The runner checks SDK version and hashes of the original published `dist/unified/exchange.js` / `structs.js`, then invokes the actual SDK method on a prototype-backed test context. Only market lookup and trader resolution are test doubles; original grid/generation/collateral helper bodies execute.
4. Compare all 12 cases, covering buy/sell and below-lot, below-minimum, rounding-below-minimum, exact-minimum and above-minimum controls. The trader test double throws immediately before any writer can be called; no order result, hash, fill or receipt is created.

No `SomniaMarkets` constructor is run and no configured exchange/client, provider or account is created. The context inherits the SDK prototype solely to call its original methods. Metadata is the separately observed public BTC configuration. Price 100 is an explicitly synthetic test input, not a live quote. `funding:'skip'` follows the normal single-chain no-funding path; it grants no allowance or funding authority.

## Expected

After downward lot alignment, validate the actual market minimum separately and raise a local `InvalidInputError` when the quantity is below it, before trader/wallet interaction. Preserve the existing below-lot rejection, valid-minimum controls and no-enlargement behavior. A caller should not need to infer that the comment's one-lot minimum assumption excludes a current perp market.

This expectation concerns the unified adapter's existing input-validation responsibility, not a claim that a raw transaction builder must simulate every protocol rule. Even if intentionally deferred to the chain, correct the implementation's blanket minimum claim and document the missing local check.

## Actual

The same results hold for buy and sell:

| Input BTC | Quantity raw after SDK alignment | Local result |
| --- | --- | --- |
| 0.000009 | below one lot | `InvalidInputError`, no trader-boundary call |
| 0.00001 | 1000 | reaches mocked trader boundary, below minimum 13000 |
| 0.00012 | 12000 | reaches mocked trader boundary, below minimum |
| 0.000129 | 12000 | reaches mocked trader boundary after rounding, below minimum |
| 0.00013 | 13000 | reaches mocked trader boundary, valid minimum control |
| 0.00014 | 14000 | reaches mocked trader boundary, above-minimum control |

In package source `src/unified/exchange.ts`, `createOrder` lines 5087–5102 align and check only `quantity <= 0n`; the PERP branch at 5146–5155 forwards it to `placePerpOrder`. Market lookup, live/generation checks, unit conversion, tick/lot alignment and the no-funding collateral helper remain original SDK code. The trader boundary is intercepted, so no actual live outcome beyond this local handoff is claimed.

## Evidence

- [Reproducer](repro/007-sdk-perp-minimum.mjs) and [12-case offline output](evidence/007-offline-sdk-minimum.json).
- [Actual public BTC configuration](evidence/007-btc-public-grid.json): chain 50383, block 29350404, observed 2026-10-21 12:49:55 UTC; SDK-row and on-chain tick/lot/minimum match. Only public market data is included; no owner/account read.
- [Release verification](evidence/007-sdk-release-verification.json): official [npm 0.32.1 archive](https://registry.npmjs.org/@somnia-chain/markets-sdk/-/markets-sdk-0.32.1.tgz) SHA-512 integrity verified; all 632 installed package files matched its bytes. Runner separately checks the two relevant runtime hashes.

## Environment

- Node v24.21.0 / Windows; `@somnia-chain/markets-sdk@0.32.1`, viem 2.57.7. npm's latest tag was rechecked as 0.32.1 on 2026-10-21.
- Somnia testnet chain 50383 (official bounty's Tokyo label; current SDK Hideki naming), public BTC / USDso configuration only. Offline execution does not connect to testnet.
- BTC base precision 8 / quote precision 18, raw tick `100000000000000000`, lot `1000`, minimum `13000` at the recorded block. These are dated observations, not permanent parameters.
- No wallet address applies: there is no owner, signer, key, session, allowance, funding action or transaction.

## Duplicate and independence check

On 2026-10-21 public bot-kit issue searches for `minQuantity` and `createOrder` returned zero. The SDK repository declared by the npm package returned HTTP 404 with available access, so its issue history could not be reviewed. Private bounty/community submissions were unavailable/unsearched; first-report priority is unknown. This affects the SDK unified entry point, distinct from 004's bot-local inventory setting and from our earlier test-harness enum correction. Buy/sell and boundary cases are one issue, not separate reports. Proposed normal; organizer determines acceptance and reward. No submission, acceptance or payment is claimed.
