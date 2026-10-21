# Demo plan and evidence manifest

**The offline browser demonstration has run. Live root/remix execution and its demo remain unrun.** Screenshots below show synthetic fixtures only. A real dedicated wallet and confirmed 5-USDso account-funding transactions exist in private local storage; these are setup evidence, not perps orders or a recorded live demo. No recording or post link exists.

Offline walkthrough is automated in `tests/e2e/offline.spec.ts`. It uses two isolated browser contexts for original/remix and covers approval, publication, comparison and withdrawal. Inspected screenshots: [desktop](evidence/offline-desktop.png), [desktop remix](evidence/offline-remix-desktop.png), [360px card](evidence/offline-card-mobile.png), [360px remix](evidence/offline-remix-mobile.png). They are actual app screenshots of an explicitly synthetic scenario, never live protocol evidence. Test databases are isolated and ignored; no fake live history was seeded.

The gated live UI and browser adapter also pass intercepted mock-wallet tests (connection/signature review, rejection, timeout and account switch); those tests provide no live screenshots or protocol evidence. Actual dev/browser smoke screenshots show only the [disabled readonly workspace](evidence/readonly-desktop.png) and [public market at 360px](evidence/readonly-market-mobile.png). The tracked public market/configuration check is [M5 read-only JSON](evidence/read-only-m5-2026-10-20.json). On 2026-10-21, actual funded-owner sizing/margin and exact unsigned order simulation passed; private records and funding results are described in [the ledger](IMPLEMENTATION_PLAN.md). The user-controlled app/wallet session is running, awaiting the user's ownership decision. Root/remix execution and publication choices remain unrun; no live-order manifest entry can be supplied yet.

## Short walkthrough to prepare

Aim for a focused 2-4 minute recording plus readable stills; verify any actual program media requirements before submission. Use a clean local browser window and redact secrets/private information. A local app is acceptable for preparation; do not imply a deployed share URL exists.

1. **Context (15 seconds):** show ForkTrade's testnet label and explain the idea: an explicit thesis and trade become an independently remixable card. State whether this recording is offline/synthetic or live.
2. **Original intent (30 seconds):** write a concise real thesis and invalidation condition; save a plan version. Show the selected single market and limit/GTC parameters. Avoid recommendations or profit promises.
3. **Review (30 seconds):** show fresh account/chain/market context, size cap, price/quantity, margin/fees and expiry. Demonstrate that viewing and previewing do not trade.
4. **User decision and outcome (30-45 seconds):** in an authorized live session the user approves the exact order and wallet action. Show submitted, chain state and actual order state separately. Do not edit away rejection/partial/unknown states to imply a fill. Pause/omit sensitive wallet screens with an honest explanation; do not recreate a fake wallet confirmation.
5. **Card (20 seconds):** explicitly select publication fields and show the resulting evidence level, testnet label, as-of time and verified links when chosen. Explain if address disclosure or missing evidence limits verification.
6. **Independent remix (45 seconds):** a separately owned viewer context clones the exact published version, changes a thesis/parameter, sees differences, and reviews its own fresh account context. The user separately approves that order. Show its independent execution identity, actual status and root -> child lineage.
7. **Honesty and recovery (20 seconds):** show a read-only refresh/reconnect state or an explicitly labelled offline failure demonstration. Explain unknown/history-unavailable behavior. Different fill times/prices are not a controlled strategy comparison and paper funds are not real profit.

Do not create extra live orders merely for a recording. Reuse read-only evidence from authorized executions. Do not stage a fill, invent users or counterparties, or splice fixture receipts into a live walkthrough. If live permission is missing, finish an offline demonstration and keep live acceptance blocked.

## Capture list

- [ ] Desktop editor and complete final review (all relevant units/fields visible).
- [ ] Actual root request/transaction/order evidence and current outcome, if authorized.
- [ ] Published root card with disclosure/evidence labels and as-of time.
- [ ] Remix differences and validated source version/lineage.
- [ ] Actual remix request/transaction/order evidence and current outcome, if authorized.
- [ ] Mobile card and comparison around 360px width; readable without horizontal scroll.
- [ ] Honest disconnected/unknown/history-gap state; fixture mode labelled if simulated.
- [ ] Remaining open orders/positions/unknown attempts noted; any cleanup separately authorized.

## Evidence manifest template

Fill with observed facts, not proposed values. Do not insert placeholder transaction hashes that resemble real evidence.

| Field | Actual value |
| --- | --- |
| App branch/commit and build command | feat/forktrade-core; source 01543f0911b23d40cb8b808c6a25b2c4cb56e8f5; npm.cmd run build; CI 39541603896 passed 104 tests and 20 browser cases |
| Recording date/time UTC, browser/OS/device | Not recorded |
| Mode | Offline synthetic browser demo; separate actual account funding/read-only simulation; no live root/remix order |
| Chain ID, observed network/app label, RPC/config verification date | Actual reads/setup: 50383, Hideki / DreamDEX app region, verified 2026-10-21; fixtures: synthetic chain 0 |
| SDK/package lock version | SDK 0.32.1, exact resolved dependencies in package-lock.json |
| Market/pool, metadata source/as-of | BTC / USDso; public pool and source/block recorded in evidence/read-only-2026-10-20.json; offline pool is explicitly synthetic |
| Root plan ID/version/hash, approval context | None |
| Root request ID, tx hash, order ID, source/block | None |
| Root actual tx state, order state, filled/remainder amounts | No order |
| Remix source/root/depth and changed parameters | None |
| Remix owner context and separate approval | None |
| Remix request/tx/order identity and actual outcome | No order |
| Receipt/history coverage and unresolved gaps | No observations |
| Publication allowlist and user consent | Not requested |
| Screenshots/video/evidence paths or approved links | Four offline screenshot links above; no live screenshots, video or hosted URL |
| Remaining exposure and cleanup status | Setup bank balance 5 USDso, wallet 95 USDso, allowance 0 as of 2026-10-21 02:00:50 UTC; no ForkTrade order sent; future cleanup requires separate authorization |
| Accepted bounty environment/rules recheck | Official program-resource mapping verified 2026-10-21 in evidence/environment-2026-10-21.json; final outcome/entry eligibility and pre-submission recheck remain pending |

Evidence should identify chain, market/pool and order/account context sufficiently for authorized verification. If address evidence is withheld for privacy, disclose the resulting verification limitation. Store only reviewed nonsecret evidence in the repository; keep security vulnerabilities and secrets outside it. Existing offline media is explicitly synthetic; live media needs the authorized run and redaction review.

## X post drafts - do not publish automatically

The supplied rule summary requires 2-3 actual X post links tagging @DreamDEXSomnia for an MVP entry. These drafts are not posted links and do not satisfy that requirement. Update them to match demonstrated features and obtain user approval for any publication. Use a real authorized demo URL only when one exists.

**Draft 1 - concept:** Building ForkTrade for @DreamDEXSomnia: write a trade thesis, review an exact testnet order, and share a card that shows what actually happened. A remix becomes its owner's independent plan and decision. Demo evidence will be added after testing.

**Draft 2 - evidence:** ForkTrade's testnet demo for @DreamDEXSomnia is being prepared around honest order states: submitted is different from filled, and unknown stays unknown. The goal is a visible thesis -> execution -> remix trail, with separate approval for each order. Add only verified demo links and outcomes before posting.

**Draft 3 - learnings:** Preparing ForkTrade notes for @DreamDEXSomnia on explicit testnet approval, parameter differences and recovery after reconnect. Any findings will include reproducible steps and evidence. Different fill times/prices are not a controlled strategy comparison; testnet paper funds are not real profit.

Before turning a draft into a post, replace future/provisional claims with actual supported facts, recheck the program tag and requirements, and have the user approve the final text and destination. No automatic posts or replies are authorized.
