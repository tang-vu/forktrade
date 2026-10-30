# ForkTrade demo and separate MVP submission preparation

Hosting update (2026-10-30): [forktrade.vercel.app](https://forktrade.vercel.app) is deployed on Vercel with a new Free Neon database and explicitly synthetic fixtures. HTTPS and desktop/mobile checks pass; this demo's real order captures remain from the prior local SQLite build. No private historical data or real order was imported. User-supplied first X post: [@vovivothien](https://x.com/vovivothien/status/2116149013636640970); web retrieval returned 403, so content/tagging remain independently unverified. No second actual post URL has been recorded.

Source-storage clarification, 2026-10-30: the user confirmed they intentionally made the original source repository PUBLIC and explicitly instructed the agent to push and update the notes. The earlier private-storage hold is resolved; the agent did not change repository visibility. The narrated video remains complete at `55466a5`; PostgreSQL/Vercel code is committed at `68eaf62`. Source synchronization is authorized; deployment and separate MVP submission remain pending.

The narrow local/testnet path completed on 2026-10-23. Two distinct real EOAs controlled by the same human each executed one independently approved BTC/USDso BUY limit/GTC order. Both transactions are confirmed and matching orders filled 0.00013 BTC, remainder 0. These are two owner contexts, not two users. Different execution times/prices do not establish a controlled strategy comparison or profit.

Root approval was performed manually by the user in app and companion wallet. The user explicitly delegated the exact prepared child order and directed the agent into Edge. The agent operated the child app approval and scoped local-wallet transport. Root publication was human-selected; child local publication was agent-operated under the completion instruction. Do not describe child clicks as manual human actions.

## Actual evidence

| Item | Observed result / artifact |
| --- | --- |
| Source/local verification | Typecheck/lint/build, 109 tests in 9 files and 23 synthetic browser scenarios pass; [source check record](evidence/final-source-checks-2026-10-23.json). Actual execution is separate |
| Root | v1, BUY 0.00013 BTC @ 82027.6 USDso, limit/GTC; confirmed/filled, receipt block 31131276 |
| Independent remix | Child v2, BUY 0.00013 BTC @ 82027.5; own owner/approval/request/order; confirmed/filled, receipt block 31167081 |
| Fixed boundaries | Chain 50383, quantity cap 0.00013 BTC, notional cap 20 USDso, reduce-only off, builder/fee 0, transaction value 0 |
| Order identity and receipt | [Paired actual evidence](evidence/live-root-remix-2026-10-23.json); disclosed hashes/order IDs match independently verified public projections |
| Publication | Eight fields: title, parameters, lineage, evidence, links, address, rationale, invalidation; [allowlisted projections](evidence/live-root-remix-public-2026-10-23.json). No private risk notes or auth/session material |
| Lineage/comparison | Exact root v1 -> child v2, depth 1; changed title, rationale and price 82027.6 -> 82027.5; no second-generation remix |
| History | Initial bounded ranges root 31131276–31131280, child 31167081–31167086; later snapshots disclose earlier event-history gaps |
| Actual Edge recovery | Browser offline deliberately emulated after confirmation; saved draft/receipt retained and preview invalidated. Online read-only refresh reconciled same request without resend |
| Remaining exposure | Last independent read 2026-10-23T15:25:52.222Z: zero open orders and +0.00013 BTC long per account. No cancellation/close authorized or sent |
| Runtime cleanup | Temporary provider/binding removed, wallet backend exited normally, network and viewport restored |

Local links require the app on this machine; they are not hosted:

- [Root card](http://127.0.0.1:3000/share/59e87ff8-ebab-4d59-a908-4452ea1ae903)
- [Remix card and comparison](http://127.0.0.1:3000/share/0a769425-6af1-491e-be7b-54eb708ccf06)

## Video and stills

**Narrated edition, created 2026-10-30:** [100-second 1080p demo with MiMo voice and English captions](evidence/forktrade-demo-narrated-2026-10-30.mp4), [English SRT](evidence/forktrade-demo-2026-10-30.en.srt), [Vietnamese SRT](evidence/forktrade-demo-2026-10-30.vi.srt), [provenance/QA](evidence/narrated-demo-2026-10-30.json). This edited walkthrough combines the actual dated screenshots below with labelled editorial graphics. It uses the 2026-10-23 observations and does not establish fresh account state or show wallet signing/order approvals. Same human/two-wallet and root/manual versus child/delegated distinctions remain explicit. [Local authoring instructions](tools/demo/README.md). This media is stored locally/in private Git; no X or DoraHacks action follows from its creation. The older immutable public-release ZIP does not yet contain this edition.

[Actual Edge walkthrough](evidence/forktrade-live-walkthrough-2026-10-23.mp4): 27.1 seconds, H264, 1280x900, recorded **after both executions**. It shows actual published root/child receipts and comparison. Ownership signatures and order approvals are not recorded. Ten original browser frames remain unmodified; static pauses were shortened to at most four seconds and a visible provenance caption added. No fill lifecycle or wallet confirmation was recreated. [Metadata and SHA-256](evidence/live-demo-video-2026-10-23.json).

Reviewed unmodified actual screenshots:

- Root: [desktop](evidence/live-root-card-desktop-2026-10-23.jpg), [360px top](evidence/live-root-card-mobile-top-2026-10-23.jpg), [360px receipt](evidence/live-root-card-mobile-status-2026-10-23.jpg).
- Child: [desktop](evidence/live-remix-card-desktop-2026-10-23.jpg), [360px top](evidence/live-remix-card-mobile-top-2026-10-23.jpg), [360px receipt](evidence/live-remix-card-mobile-status-2026-10-23.jpg).
- Comparison: [desktop](evidence/live-comparison-desktop-2026-10-23.jpg), [360px values](evidence/live-comparison-mobile-values-2026-10-23.jpg).
- Recovery: [emulated browser offline](evidence/live-remix-edge-emulated-offline-2026-10-23.jpg), [online read-only reconciliation](evidence/live-remix-edge-reconciled-2026-10-23.jpg). This is not a spontaneous protocol outage.

Verified at 1280x900 desktop and 360x800 mobile; mobile document client/scroll widths both 345px. Full-page capture timed out; normal viewport captures succeeded. Viewport overrides cleared afterward. Historical [offline desktop](evidence/offline-desktop.png) and [offline remix mobile](evidence/offline-remix-mobile.png) captures remain explicitly synthetic and separate.

## Concrete external package — pending final approval

Original `tang-vu/forktrade` stays **private**. Proposed separate public source/media destination: `tang-vu/forktrade-mvp`. Only an allowlisted source snapshot is prepared under ignored `.local/mvp/public-release`, with audience/purpose/run guide and selected actual evidence. Excludes private Git history, AGENTS/ledger, Feedback package, environments, databases, wallets and auth/session files. No deployment or judge invitation is proposed.

Separate MVP Build title: **ForkTrade — versioned trade theses with independent remixes**

Brief: **An exact testnet order, its reasoning and an independently approved remix, connected by honest receipts.**

Description for the separate DoraHacks MVP Build:

ForkTrade is a local workspace for traders who want to keep the reasoning behind a trade attached to the exact decision they reviewed. A private versioned thesis becomes a fresh bounded order preview. After a separate approval, its public card distinguishes transaction confirmation from the actual order outcome. A viewer can remix the exact published version, change parameters and review root-to-child differences without inheriting its owner's approval.

The initial scope is BTC/USDso limit/GTC on dreamDEX Perps testnet, chain 50383. The completed acceptance path used two distinct EOAs controlled by the same human: a root BUY of 0.00013 BTC at 82027.6 USDso and an independently owned child at 82027.5. Both canonical receipts and matching FILLED orders were verified, each with zero remainder. Root approval was manual; the exact child was agent-operated in Edge under explicit user delegation using a scoped local wallet. These are not two users or a controlled strategy comparison.

The app includes decimal-safe sizing, expiring previews, fresh context checks, durable request identity, unknown-outcome reconciliation, selected-field publication, one-level lineage and canonical parameter differences. Typecheck/lint/build, 109 unit/integration tests and 23 synthetic browser scenarios pass separately from actual protocol evidence. Later authoritative reads disclose event-history gaps. Each testnet account retains its small long position; no cleanup transaction was sent.

The video shows actual public cards and comparison after execution, with shortened static pauses. It does not show ownership signing or order approval. The app runs locally; no hosted application or profit claim is made. Source/run instructions, selected receipt evidence, desktop/mobile images and video will be linked from the reviewed source package after approved publication. This MVP Build is separate from Feedback Build 50119.

Before submission, insert only verified approved source/video/post URLs, recheck current rules and use the user's whitelisted DoraHacks account. No entry, acceptance or reward is established by this draft.

## X posts — exact proposed copy, not posted

Proposed destination: X @keryxpays (current signed-in Edge account), two posts tagging `@DreamDEXSomnia`. The source URL is a **proposed** destination, not claimed to exist yet. Attach the actual comparison image to post 1 and the after-execution video to post 2. No further trades for media.

1. Built ForkTrade for @DreamDEXSomnia: version a thesis, review an exact testnet order, then share a card others can remix independently. BTC/USDso limit/GTC; paper funds only. Source + run guide: https://github.com/tang-vu/forktrade-mvp
2. ForkTrade testnet check for @DreamDEXSomnia: root + independently approved remix each filled 0.00013 BTC. Two wallets, same human. Video shows receipts after execution; no performance claim. Evidence: https://github.com/tang-vu/forktrade-mvp

Actual post URL supplied by the user: https://x.com/vovivothien/status/2116149013636640970 (retrieval 403; not independently verified). No second URL supplied. After authorized publication, verify both posts and insert their real URLs into the approved copy's README **X posts** section. A draft is not a posted link or qualifying submission. Original private source, separate Feedback Build and mainnet stay unchanged.
