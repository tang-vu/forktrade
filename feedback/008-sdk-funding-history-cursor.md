# SDK funding-history millisecond cursor repeats rows and stalls documented pagination

Severity: normal
Area: SDK
Status: reproduced with actual public history and original-SDK offline controls; additional report for the authorized Feedback workflow, not submitted

## Impact and scope

In SDK 0.32.1, `fetchFundingRateHistory(symbol, since, limit)` rounds the millisecond `since` down to an inclusive second-based indexer bound. A request one millisecond after an existing row can therefore return that same row before the requested cursor. The documented `since = last.timestamp + 1` loop repeats boundary rows and never reaches an empty page at the tail of a static, nonempty history. With limit 1 it can remain on the first row without reaching later history.

This affects a funding-history downloader/chart integration following the SDK's example. It can cause repeated read requests, duplicate chart points or a backfill that does not finish. These are consequences of the cursor behavior; no production request load, financial loss, account action or transaction failure was measured. Proposed normal; organizer decides severity and acceptance.

## Steps to reproduce

1. Use Node 24 and the public repository's exact SDK 0.32.1 / viem 2.57.7 dependencies: `npm ci --ignore-scripts --no-audit --no-fund`.
2. Run `node feedback/repro/008-sdk-funding-cursor.mjs`. It checks the version and five runtime source hashes, then executes the unchanged facade method, its market/engine helpers, the original low-level history query builder and GraphQL boundary. Only market lookup, a history-only forwarding engine and HTTP responses are local test doubles. No constructor runs and no network connection or account exists.
3. Inspect the three bounded `timestamp + 1` cases (limits 1, 2 and 100), the direct fractional-second request and six controls. Each loop stops after at most five iterations; it never sends real requests. The mock evaluates the SDK's actual emitted `_gte`, ordering, limit and offset against distinct-timestamp fixtures, rather than returning a preselected failing page.
4. Optional actual public check: run `node feedback/repro/008-public-funding-cursor.mjs`. This makes two public funding-history reads on chain 50383's indexer, plus the SDK's binding metadata check if needed. It reads the latest BTC sample, requests from that sample's timestamp plus one millisecond with limit 1, and checks that the same earlier row returns. It configures no wallet, account or signer and sends no transaction. A prototype-backed facade uses dated public market metadata; a separate signerless SDK exchange supplies the real reader. No market-discovery behavior is claimed.

Both runners accept `--out feedback/evidence/<new-file>.json` to save a new observation, refuse other output directories and do not overwrite existing files. The public run is deliberately two history reads, never an unbounded live pagination loop.

## Expected

The millisecond `since` must act as the inclusive forward cursor documented by the facade. A returned row should have `timestamp >= since`; after advancing beyond the final row, a static history should yield an empty page. The official [release notes](https://prd.smk.somnia.host/docs/typescript/release-notes) explicitly describe the `last.timestamp + 1` idiom as terminating. The same example and expectation ship in SDK source `src/unified/exchange.ts` lines 5662-5698.

For second-resolution records, preserving the millisecond bound requires careful conversion (for example, a ceiling rather than a floor for an inclusive lower bound). Merely filtering an already limited page can underfill or falsely terminate a page; a fix should preserve forward paging. Same-second multi-row cursor semantics need their own design, but are not needed to reproduce this issue and are not counted as another report.

## Actual

The facade at source line 5707 sends `from: Math.floor(since / 1000)` with ascending order. `src/perp/history.ts` lines 880-881 turns it into inclusive `timestamp._gte`. The returned mapping does not reapply the original millisecond bound.

First actual public observation, **2026-10-21 14:56:48 UTC**:

| Field | Observed value |
| --- | --- |
| Public BTC funding row timestamp (seconds) | 1792591903 |
| Requested facade `since` (milliseconds) | 1792591903001 |
| Returned timestamp (milliseconds) | 1792591903000 |
| Same row ID returned | yes, `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0_29399475_1` |
| Before requested cursor | yes, by 1 ms |

The actual sample's transaction hash identifies a public funding update, **not a transaction sent by this test or a user order**. No owner/address association is included. The later public-runner verification is a separate observation, not a replacement for the first capture.

Offline results on three explicitly synthetic rows with distinct timestamps:

| Case | Result |
| --- | --- |
| `+1 ms`, limit 1 | first row returned in all five iterations; next cursor stops advancing after the first response |
| `+1 ms`, limit 2 | boundary repeats, then final row repeats; no empty page within five iterations |
| `+1 ms`, limit 100 | all three rows first, then the final row repeats; no empty page |
| Direct first timestamp `+1 ms` | returns the row 1 ms before `since` |
| `+1000 ms` control, limit 2 | traverses each distinct-second fixture once, then an empty page |
| Empty-history control | empty first page, loop terminates |
| Exact inclusive boundary control | exact row is returned as expected |
| Whole second beyond tail control | empty page |
| Omitted-`since` control | latest two rows returned oldest first as documented |
| Raw seconds-reader control | `from = firstSecond + 1` advances to the next row |

Five iterations are the observed bound. Continued repetition at a fixed history follows from the unchanged input cursor and inclusive query; no infinite live loop was run. The `+1000 ms` control isolates the conversion error for distinct-second fixtures, not a general recommendation for histories containing same-timestamp rows.

## Evidence

- [First actual public capture](evidence/008-public-funding-cursor.json), containing only a public funding sample and the request/response comparison.
- [Bounded 10-case offline output](evidence/008-offline-funding-cursor.json) and [original-SDK runner](repro/008-sdk-funding-cursor.mjs).
- [Two-read public runner](repro/008-public-funding-cursor.mjs), independently verified after preparing the first capture.
- [SDK archive verification](evidence/007-sdk-release-verification.json): official [npm archive](https://registry.npmjs.org/@somnia-chain/markets-sdk/-/markets-sdk-0.32.1.tgz) integrity and all 632 installed package files matched. The offline runner additionally checks five relevant runtime hashes. No SDK function body was changed.
- Official [release notes](https://prd.smk.somnia.host/docs/typescript/release-notes), read 2026-10-21, and package source `src/unified/exchange.ts` / `src/perp/history.ts`. The expected behavior is explicit, rather than inferred from an undocumented pagination convention.

## Environment

- Node v24.21.0, Windows; `@somnia-chain/markets-sdk@0.32.1`, viem 2.57.7. Latest npm version and the archive integrity were rechecked 2026-10-21.
- Somnia Tokyo testnet bounty environment, current SDK Hideki chain 50383; public indexer `https://hideki-dev.smk.somnia.host/v1/graphql`, BTC pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`.
- No wallet address applies: no wallet, owner/account lookup, session, key, signing request, allowance, funding action or transaction. Reading public funding history is separate from performing a funding settlement.
- Offline prices, row IDs, blocks, zero address and zero hash are labelled synthetic fixtures, never live history evidence. Only the separate public capture contains actual history.

## Duplicate and independence check

On 2026-10-21 the public bot-kit issue query for `fetchFundingRateHistory` returned zero. The broader `funding` query returned issues 23 and 28, whose bodies concern adding perps strategies and Reactivity subscription errors, respectively; neither describes this cursor conversion. The SDK's declared repository returned HTTP 404 with available access, and private bounty/community reports were unavailable. First-valid-report priority remains unknown.

The release notes describe an earlier newest-first pagination problem and say ascending order resolves it. This report isolates the remaining millisecond-to-second boundary defect even with ascending order; it does not resubmit the old ordering problem as a newly discovered issue. Limit variations and the direct `since` violation are one root cause, counted once. No submission, acceptance or reward is established.
