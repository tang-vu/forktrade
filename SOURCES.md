# Sources, provenance and verification checklist

Documentation baseline date: **2026-10-20 (UTC)**. This file separates supplied program facts, live page observations, project design decisions and unverified implementation assumptions. It is not a runtime network/contract manifest.

## Official sources

| Source | Purpose | Observation and limitation on 2026-10-20 |
| --- | --- | --- |
| [Perps testnet developer guide](https://app.dreamdex.io/docs/developers/perps-testnet) | Current integration starting point | Live page read; snapshot below. No RPC, SDK or contract call executed for ForkTrade |
| [Perps testnet orders](https://app.dreamdex.io/docs/trading/perps-testnet/orders) | Order behavior and available time-in-force choices | Live page read; limit/GTC proposed for this product, not runtime-tested |
| [Margin and liquidations](https://app.dreamdex.io/docs/trading/perps-testnet/margin-and-liquidations) | Account risk, collateral and paper-credit context | Live page read; no balances/positions verified |
| [somnia-chain/dreamdex-bot-kit](https://github.com/somnia-chain/dreamdex-bot-kit) | Existing perps integration/reference strategies and limitations | Live README inspected; no code installed/run or exact upstream commit pinned |
| [dreamDEX Perps bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail) | Authoritative current program rules | Live content unavailable in this run; prior review reported CAPTCHA. Rule facts below come from user's pasted official page |

### Dated developer snapshot

The live developer page described Hideki testnet, chain ID **50383**, an example using `@somnia-chain/markets-sdk` **0.32.1**, app region label **DreamDEX**, and an explorer path **`/tokyo`**. Read-only SDK use is supported by omitting signing credentials. Market-specific addresses and decimals should be read dynamically and system configuration checked. This is a dated observation, not a guarantee that the version, endpoints, addresses or accepted bounty environment remain valid. Re-read the official page and verify runtime configuration before execution.

Earlier indexed text supplied in the project context used **Tokyo region**. Do not interpret naming differences as proof of multiple independent networks or a migration. Record actual chain ID/configuration and verify program acceptance. No contract addresses are copied into this guide as permanent constants.

### Order/risk reference summary

The orders page describes market/limit orders, GTC/IOC/FOK/ALO time in force and TP/SL. Limit/GTC is the deliberately narrow proposed baseline, not a claim of fill. The margin page distinguishes perps account collateral, risk modes and paper-credit restrictions. Treat current rules and limits as runtime inputs; do not turn documentation examples into a safe-size or liquidation guarantee. Testnet paper funds are not real profit.

The bot kit already includes perps maker, funding and guard strategies. Its general quickstart also covers other products/networks and bot-key workflows; it must not be blindly reused as the ForkTrade perps web-wallet setup. Existing strategies are reference material; differentiation here is the independently approved social remix and its honest evidence.

## User-supplied official-page facts

The project context provides the user's pasted program page, dated 2026-10-20, as the source for these facts: all Builds require GitHub; Feedback pool up to $1,500; $40 accepted critical/major and $15 other accepted reports; first reproducible report only, duplicates not paid and budget may exhaust; one Markdown per issue in `feedback/`; private security disclosure to security@dreamdex.io after user approval; three $500 MVP prizes split $300 at result and $200 conditional on mainnet orders within 30 days of perps mainnet launch; actual perps testnet orders, README/run guide, demo evidence and 2-3 X post links tagging @DreamDEXSomnia; deadline 2026-11-01 23:59 UTC and expected results by November 8.

These are supplied program facts, not independently live-reverified rules in this documentation task. The invitation establishes whitelist/application access only. See BOUNTY.md for operational gates. Do not commit personal invitation data or confuse access with reward entitlement.

## Project decisions rather than official requirements

ForkTrade's one market, one limit/GTC type, one remix level, exact payload approval, robust reconciliation, owner-controlled publication, neutral comparisons and no custody are product/safety choices for this goal. The Next.js/TypeScript/SQLite stack, suggested preview TTL and milestone/test organization are proposed implementation decisions. They are not program mandates or verified installed software. Confirm compatibility and pin versions in M0.

Optional AI is deferred and can draft intent only. Plan hashes/application versions are integrity aids, not proof of independent pre-trade existence. These are explicit product constraints; no official source is being cited as having audited this design.

## Verification tasks for M0 and before live execution

- [ ] Record current retrieval date and any official-source changes; recheck the bounty page without bypassing access gates.
- [ ] Verify accepted perps environment with current rules/organizer clarification when needed. A region name alone is insufficient.
- [ ] Record exact Node/app/SDK dependency versions, lockfile and relevant upstream reference commit, plus official documentation links.
- [ ] Verify SDK read methods, browser wallet support, any ABI path, request correlation, receipt/order semantics and history availability. Do not invent method names or evidence coverage.
- [ ] Read the active RPC chain ID and current official system/market configuration; check contract identities and selected market metadata. Verify endpoints/addresses from current sources rather than this prose.
- [ ] Verify per-market decimals, tick/lot/minimum, current sizing/risk bounds, market availability and collateral restrictions.
- [ ] Verify actual HTTP/WebSocket/indexer availability in the execution environment; record permission/access blockers separately.
- [ ] Confirm wallet/account permissions with the user before any authentication signature, funding/claim/allowance/operator setup or order. No real credentials belong in notes.
- [ ] Recheck rules, accepted outcomes, deadline, access and post requirements again immediately before submission.

## Future verification log

### M1 clean-install adjustment — 2026-10-20 16:18 UTC

The initial native SQLite smoke test passed, but `npm.cmd ci` exposed a clean-install failure: better-sqlite3 attempted a C++ rebuild and this host has no supported Visual Studio toolchain. No system tools/settings were changed. Replaced the native npm addon with Node 24's built-in `node:sqlite` and the officially documented Drizzle `node-sqlite` driver, pinned at `drizzle-orm@1.0.0-rc.4`. Removed better-sqlite3 and its types. This is a deliberate RC dependency tradeoff to keep local setup reproducible without a compiler; record updates before changing that pin. A second `npm.cmd ci` passed (229 packages; audit zero findings), and migrations plus all 39 unit/integration tests passed on this driver. SQL storage remains the same format and migration checksums; existing offline records were preserved.

GitHub Actions checkout/setup-node v6 refs verified with `git ls-remote` and pinned to their full SHAs in `.github/workflows/ci.yml`. CI runs only source/offline checks; no network execution or credentials are supplied.

At 16:26 UTC, CI 39456931257 completed successfully on commit `0eff0b3`, including a clean Ubuntu install, source checks and all offline browser scenarios. Further SDK source inspection confirmed `marginBankReadAbi` contains `isolated(address)` and `isolationAllowsMarket(address,address)`, and `previewPerpOrderMargin` includes effective IMF, adverse-gap reserve, leverage surcharge and funding gates. These are source facts only: no real owner's account was read. `buildPlacePerpOrder` shares calldata construction with the sending verb and returns no approval; real payload/wallet/reconciliation remains to implement and test. The [contract functions page](https://app.dreamdex.io/docs/developers/contracts/functions) was re-read for order expiry and call shape; it includes spot/general behavior, so do not promote it into perps funding proof. Perps funding details were inspected in SDK `dist/perp/margin.js` and `dist/orders.js` at the pinned version. No bot scripts or transactions ran.

### M0 runtime verification — 2026-10-20 15:55 UTC

User invoked GOAL and authorized local implementation, then requested commit/push after each verified update. Branch: `feat/forktrade-core`. Node `24.21.0`, npm `11.19.0` (`npm.cmd` on this PowerShell host; no execution-policy change).

`npm.cmd run check:readonly` passed. Safe public snapshot: [evidence/read-only-2026-10-20.json](evidence/read-only-2026-10-20.json). HTTP `eth_chainId` and SDK WebSocket reads worked. Chain 50383; 21 perps rows; selected BTC / USDso, limit/GTC. BTC precision 8/18, raw tick `100000000000000000`, lot `1000`, minimum `13000`. Token-decimal and pool-parameter reads match indexer metadata. Pool/bank bytecode exists and system configuration is fully wired; collateral matches the market. Re-read before preview/signing; this is not a permanent signing manifest.

Official developer/orders/margin pages re-read at the URLs above. DoraHacks retrieval returned an internal error; eligibility remains unresolved. Bot-kit reference HEAD: `25798660bbe4674a6f83a960b202852896e2fed4` (not installed/run).

Installed SDK `0.32.1` declarations/implementation confirm `client.listPerpMarkets`, `getPerpSystemConfig`, `getPerpState`, `getPerpRiskParams`, `getMaxPerpOrderSize`, `getOrderOnchain`, `listPerpOrderHistory`, `listPerpOrderRejections`, `createTrader({walletClient})`, `trader.buildPlacePerpOrder` and `trader.placePerpOrder`. Wallet executor sends through `walletClient.sendTransaction` and waits separately for a receipt. Build-only payload/ABI still needs M5 verification. Browser signing is source-inspected, not exercised with a real wallet. UUID uniqueness is not protocol exactly-once delivery; history/correlation coverage remains to verify.

Exact direct pins: `package.json`; full tree/integrities: `package-lock.json`. Next `16.4.2`, React/DOM `19.3.1`, Drizzle `0.45.4`, better-sqlite3 `13.0.3`, Zod `4.6.7`, viem `2.57.7`, SDK `0.32.1`, reactivity `0.2.1`, TypeScript `6.0.3`, Vitest `5.0.5`, Playwright `1.64.1`, Tailwind `4.3.3`. [Next installation](https://nextjs.org/docs/app/getting-started/installation) and [Drizzle SQLite](https://orm.drizzle.team/docs/sqlite/get-started-sqlite) checked. Native SQLite smoke test passed (`3.53.4`). ESLint 10 with typescript-eslint/react-hooks replaces eslint-config-next after the initial tooling audit; final install audit reports zero vulnerabilities. No force fix or app downgrade used. Further app checks pending.

No account reads, wallet connection/authentication, funds, claims, allowances, signatures or orders occurred. Account eligibility, exact sizing and accepted bounty environment remain gates.

Use compact entries and safe values only:

| Date/time UTC | Source/ref/version | What was actually checked | Result/change | Remaining unknown |
| --- | --- | --- | --- | --- |
| 2026-10-20 | Official URLs above | Read public developer/orders/margin pages and bot-kit README; attempted bounty page | Dated documentation snapshot only; live bounty content unavailable | All runtime integration, accepted environment and live acceptance |

If a source conflicts with this guide, stop dependent live activity, record the exact discrepancy and update the design with evidence. Do not silently choose the interpretation that makes a demo look complete. Hypotheses in feedback/README.md remain unconfirmed until independently reproduced within authorized scope.
