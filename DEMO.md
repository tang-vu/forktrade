# Demo plan and evidence manifest

**The offline browser demonstration passed again on 2026-10-23. Actual root ownership authentication and both funded-account exact simulations passed. The actual user-approved root is confirmed/filled 0.00013 BTC. Independent remix execution and the complete live demo remain pending.** Two distinct user-controlled EOAs each have bank collateral after explicitly approved setup. These are two owner contexts operated by the same human, not a claim of two users. [Root order evidence](evidence/live-root-2026-10-23.json) is separate from setup receipts/signatures. A testnet long position of 0.00013 BTC and no open order were observed later; no cleanup was sent. No recording or post link exists.

Offline walkthrough is automated in `tests/e2e/offline.spec.ts`. It uses two isolated browser contexts for original/remix and covers approval, publication, comparison and withdrawal. Inspected screenshots: [desktop](evidence/offline-desktop.png), [desktop remix](evidence/offline-remix-desktop.png), [360px card](evidence/offline-card-mobile.png), [360px remix](evidence/offline-remix-mobile.png). They are actual app screenshots of an explicitly synthetic scenario, never live protocol evidence. Test databases are isolated and ignored; no fake live history was seeded.

The gated live UI and browser adapter also pass intercepted mock-wallet tests (connection/signature review, rejection, timeout and account switch); those tests provide no live screenshots or protocol evidence. Actual dev/browser smoke screenshots show only the [disabled readonly workspace](evidence/readonly-desktop.png) and [public market at 360px](evidence/readonly-market-mobile.png). The tracked public market/configuration check is [M5 read-only JSON](evidence/read-only-m5-2026-10-20.json). On 2026-10-21, actual funded-owner sizing/margin and exact unsigned order simulation passed; private records and funding results are described in [the ledger](IMPLEMENTATION_PLAN.md). That 2026-10-21 session was later closed. On 2026-10-23 the app/companion were restarted and root ownership completed; Edge remains a separate browser without that provider. Root/remix execution and publication choices remain unrun; no live-order manifest entry can be supplied yet.

User-requested [actual Edge computer-use checks](evidence/edge-ui-2026-10-21.json) passed public market, missing-wallet, unsaved draft preservation and 360px layout checks. Reviewed captures: [actual public market](evidence/edge-market-desktop-2026-10-21.jpg) and [missing-wallet draft at 360px](evidence/edge-wallet-unavailable-mobile-2026-10-21.jpg). These show no owner account, signature or execution. The attempted separate manual offline server was policy-blocked; no full offline Edge walkthrough or real Edge ownership/order result is claimed.

## Current resume evidence — 2026-10-23

Fresh inspected offline captures: [desktop](evidence/mvp-offline-desktop-2026-10-23.png), [desktop remix](evidence/mvp-offline-remix-desktop-2026-10-23.png), [360px card](evidence/mvp-offline-card-mobile-2026-10-23.png), [360px remix](evidence/mvp-offline-remix-mobile-2026-10-23.png). All four are explicitly synthetic; prior captures remain unchanged. [Verification summary](evidence/mvp-resume-2026-10-23.json) separates 104 tests/20 browser cases, actual public reads, both funded-account simulations, four confirmed setup transactions and root ownership authentication.

The local testnet app and original companion were restarted for the user. After accidental wallet-window closure, the private root remained saved and zero attempts/no wallet request journal were verified before reopening. Authentication was repeated; select the saved **BTC testnet integration check** from the left sidebar before opening a fresh review. A future `--prepare-root` launch now selects this single matching saved root automatically when the editor is blank, without replacing entered work or creating another root. Each final app/wallet order decision remains the user's. The second companion must use `.local/wallets/hideki-remix-testnet-2026-10-23` and the exact published source once available; never create an unrelated root and call it a remix. No cleanup order is authorized.

## Actual root card — 2026-10-23

The user explicitly selected all eight public fields and confirmed local publication. Actual Edge displays the verified confirmed/filled root, 0.00013 BTC filled / 0 unfilled, complete disclosed owner/evidence link, as-of time and history-gap label. Captures: [desktop](evidence/live-root-card-desktop-2026-10-23.jpg), [360px top](evidence/live-root-card-mobile-top-2026-10-23.jpg), [360px receipt](evidence/live-root-card-mobile-status-2026-10-23.jpg). CSS viewport 1280/360, mobile content width/scroll width both 345px. Full-page capture timed out; normal viewport captures succeeded, unmodified. These are actual published-card screenshots, separate from the synthetic captures above. [Allowlisted public projection](evidence/live-root-public-card-2026-10-23.json). Local only, no internet URL or video implied.

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
| App branch/commit and build command | feat/forktrade-core; source 6ec2ac65d40733ecbc7eaf60f277ebf4aef854cd; npm.cmd run build; CI 39542698499 passed 104 tests and 20 browser cases; actual Edge scope recorded separately above |
| Recording date/time UTC, browser/OS/device | Not recorded |
| Mode | Offline synthetic browser demo; separate actual account funding/read-only simulation; no live root/remix order |
| Chain ID, observed network/app label, RPC/config verification date | Actual reads/setup: 50383, Hideki / DreamDEX app region, verified 2026-10-21; fixtures: synthetic chain 0 |
| SDK/package lock version | SDK 0.32.1, exact resolved dependencies in package-lock.json |
| Market/pool, metadata source/as-of | BTC / USDso; public pool and source/block recorded in evidence/read-only-2026-10-20.json; offline pool is explicitly synthetic |
| Root plan ID/version/hash, approval context | One actual private root v1 saved after real ownership on 2026-10-23; IDs/hash stay private pending selected disclosure. No order approval or receipt |
| Root request ID, tx hash, order ID, source/block | Actual private identities persisted; canonical receipt block 31131276. Full identifiers remain ignored pending owner-selected disclosure |
| Root actual tx state, order state, filled/remainder amounts | Confirmed / filled / 13000 raw (0.00013 BTC) / 0 remaining; later independent snapshot verification passed |
| Remix source/root/depth and changed parameters | None |
| Remix owner context and separate approval | None |
| Remix request/tx/order identity and actual outcome | No order |
| Receipt/history coverage and unresolved gaps | Root initial event range 31131276–31131280; later reconnect used authoritative snapshots with earlier history gap disclosed. No fabricated replay |
| Publication allowlist and user consent | Not requested |
| Screenshots/video/evidence paths or approved links | Four offline screenshot links above; no live screenshots, video or hosted URL |
| Remaining exposure and cleanup status | Setup bank balance 5 USDso, wallet 95 USDso, allowance 0 as of 2026-10-21 02:00:50 UTC; no ForkTrade order sent; future cleanup requires separate authorization |
| Accepted bounty environment/rules recheck | Official program-resource mapping verified 2026-10-21 in evidence/environment-2026-10-21.json; final outcome/entry eligibility and pre-submission recheck remain pending |

Evidence should identify chain, market/pool and order/account context sufficiently for authorized verification. If address evidence is withheld for privacy, disclose the resulting verification limitation. Store only reviewed nonsecret evidence in the repository; keep security vulnerabilities and secrets outside it. Existing offline media is explicitly synthetic; live media needs the authorized run and redaction review.

## Separate ForkTrade MVP Build draft - not ready to submit

This draft is for the separate MVP Build discussed with the user. The Feedback-only Build has its own approved text in [feedback/SUBMISSION.md](feedback/SUBMISSION.md). No MVP source publication, hosted demo, X post or MVP submission is authorized by this draft.

Proposed title: **ForkTrade - versioned trade theses with independent remixes**

Proposed description:

ForkTrade helps a trader keep a testnet order tied to the reasoning and exact parameters they reviewed. A thesis becomes a versioned plan, then a fresh order preview. After the owner's explicit decision, its card distinguishes transaction submission, confirmation and the actual order outcome. A viewer can independently remix a published version, change its parameters and inspect the root-to-remix lineage without inheriting the original owner's approval.

The initial scope is one BTC/USDso limit/GTC workflow on dreamDEX Perps testnet. The local app implements the offline thesis, review, synthetic execution, card and remix path, with public market/configuration reads and actual funded-account sizing/order simulation checked separately. The source now passes 106 unit/integration tests and 21 offline browser scenarios locally. Separately, the user approved a real root order that was verified confirmed/filled for 0.00013 BTC. Independent remix acceptance and a complete live demo remain pending. No performance or profit claim is made.

Current evidence limitations for the reviewer: root wallet ownership authentication has completed, but independent remix authentication and its separately approved order have not been completed. The original root is confirmed/filled. The GitHub application repository is private; no public app URL, live demo recording or required X post links exist. This description is a preparation draft and is not yet a qualifying MVP entry.

Before converting this draft into a submission, complete the existing live-acceptance checklist in [ACCEPTANCE.md](ACCEPTANCE.md): the second owner context, a fresh exact root order and separately owned/approved remix, authoritative outcomes, selected-field publication choices and reviewed live demo evidence. Then replace the evidence limitations above only with verified results and approved links, obtain the concrete MVP source/demo/post/submission permissions and recheck the current program requirements. No additional market or feature is needed before those gates.

## X post drafts - do not publish automatically

The supplied rule summary requires 2-3 actual X post links tagging @DreamDEXSomnia for an MVP entry. These drafts are not posted links and do not satisfy that requirement. Update them to match demonstrated features and obtain user approval for any publication. Use a real authorized demo URL only when one exists.

**Draft 1 - concept:** Building ForkTrade for @DreamDEXSomnia: write a trade thesis, review an exact testnet order, and share a card that shows what actually happened. A remix becomes its owner's independent plan and decision. Demo evidence will be added after testing.

**Draft 2 - evidence:** ForkTrade's testnet demo for @DreamDEXSomnia is being prepared around honest order states: submitted is different from filled, and unknown stays unknown. The goal is a visible thesis -> execution -> remix trail, with separate approval for each order. Add only verified demo links and outcomes before posting.

**Draft 3 - learnings:** Preparing ForkTrade notes for @DreamDEXSomnia on explicit testnet approval, parameter differences and recovery after reconnect. Any findings will include reproducible steps and evidence. Different fill times/prices are not a controlled strategy comparison; testnet paper funds are not real profit.

Before turning a draft into a post, replace future/provisional claims with actual supported facts, recheck the program tag and requirements, and have the user approve the final text and destination. No automatic posts or replies are authorized.
