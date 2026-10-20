# Product contract

Status: proposed behavior; application unbuilt. The target is a small, complete testnet experience that makes trade intent remixable and evidence understandable.

## User promise and scope

An author can explain a trade, deliberately execute their own bounded order, and share an honest card. A viewer can change the thesis or parameters without inheriting the author's authority or altering the original. Both can see what changed, whose order it is, and what the protocol actually reports.

The first release supports one live-verified market, limit/GTC as the proposed single order type, and a root with one level of remixes. A root may have multiple direct children; children cannot themselves be remixed in v1. No full feed, follows, rankings, pooled positions, copy-on-click execution, or performance winner badges. No market selection breadth until the narrow path passes acceptance.

## Core records in product language

- **Thesis:** title, rationale, invalidation conditions, optional plain-text risk notes. It is the user's opinion, not advice from an AI.
- **Plan version:** a saved, versioned set of intended execution parameters and its associated thesis version. Editing after preview creates a new version and invalidates preview/approval. A hash can detect a changed canonical payload; it cannot prove pre-trade existence.
- **Preview:** a short-lived calculation from current market/account data with provenance, freshness, limits, fees and context. It is neither execution nor a fill guarantee.
- **Approval:** a one-use decision for one exact version and wallet/network context. A wallet signature or transaction confirmation is a distinct step.
- **Execution:** observed submission, chain and order outcomes tied to this plan version. It can remain unknown.
- **Publication:** an explicit allowlist of fields from a particular version and its receipt. Saving or executing does not automatically publish.
- **Remix:** a new owner-scoped thesis/plan with server-validated root/source version links and visible differences. No inherited approval or execution.

## Screens and interactions

### 1. Draft and version

Show a compact editor for title, rationale, invalidation, side, price, quantity and permitted flags. Keep the single chosen market/order type visible. Use decimal text inputs with exact validation messages. Display base and quote units beside inputs; do not let scientific notation, locale ambiguity or hidden rounding change intent. A user can save a private draft after authenticating ownership. Anonymous visitors may experiment with a local unsaved draft, clearly labelled; they cannot edit server private plans.

Saving a new version shows which fields changed. A published or executed version remains addressable for comparison; subsequent edits do not replace its receipt. Explain that versioning is an application record and that server timestamps are not independent proof of chronology or immutability.

### 2. Fresh preview and review

Fetch current chain, market metadata, order-book/mark data, account balances/positions/orders, margin mode, relevant limits and fee inputs. Show source age and a visible expiry. Set an initial product TTL such as 15 seconds only as a testable proposed default; M0 must verify whether a shorter value is needed. Always revalidate before signing even within TTL.

Show a review sheet with the complete owner account, wallet signer or delegated role if any, chain ID/label, market/pool, side, limit price, quantity, notional, time in force, any reduce-only setting, fee/builder fields, estimated gas and margin implications. Show maximum permitted size and the user-selected size cap. Estimates must be labelled and must not promise execution price, fill, liquidation safety or fee certainty.

Disable execution when network identity, metadata, balance/risk data, sizing, permissions or freshness is unresolved. Account or network changes, stale async responses, reconnects and parameter edits invalidate the review. Never silently auto-switch networks or accept a changed payload.

### 3. Approve and track

The execution call to action reads like **Review and approve testnet order**, followed by a final explicit decision. No card view, share, clone, wallet connection or authentication signature triggers an order. The user's approval binds the complete executable payload. Wallet rejection returns to a recoverable state without a submission claim. A changed order needs a new preview and approval.

Show transaction and order progress separately: waiting for wallet, submitting, submitted, chain confirmed/reverted/unknown; then order unobserved/accepted/open/partial/filled/cancelled/rejected/unknown. Show fill quantity and remaining quantity explicitly. A partially filled then cancelled order retains the fill. A timeout says **Outcome unknown - checking the existing request**, never **Retry trade** by default.

Expose a read-only **Refresh status** action. Reconnection reconciles snapshots; show **Earlier event history unavailable** if the adapter cannot recover it. Do not animate a made-up successful lifecycle between observations.

### 4. Share card

Before publication, show the exact public view and select fields deliberately: title/rationale, canonical public parameters, testnet market/chain, lineage and verified outcome. Account/address and transaction/order links require an explicit disclosure choice; transaction links can reveal the full address and activity even if the visible address is shortened. If the owner withholds enough data to prevent independent checking, label the receipt **Owner-reported; independently verifiable evidence not shared** and do not show a verified badge.

An evidence badge must state its level, for example **Chain confirmed; order open**, **Verified filled quantity ...**, or **Unknown**. Show as-of time and evidence links when selected. Include **Testnet / paper funds** prominently. Status can change later; include observation time rather than freezing a positive claim. The share page is read-only and has an **independent remix** action, never an execute action for the author's account.

Public exposure is an explicit publication record even on a locally running app. A local share URL only works where the app is reachable; describe it as a local demo URL until hosting is separately approved. Social preview images may be omitted in v1. If later added, they must use the same allowlist and accurate status/as-of time.

### 5. Remix and compare

Show root -> child lineage, source version, author labels chosen for publication, and a field-by-field comparison. Differentiate thesis text changes from executable parameter changes. Use neutral labels such as **Original plan** and **Remix plan**. Do not rank returns or imply causation from fills at different times/prices.

The viewer becomes owner of a new private draft. All editable economic fields are independently validated under the viewer's fresh account context. Root updates do not mutate an existing remix. Source execution IDs, approvals, private risk notes and session identity are not copied. A child can be edited into new versions but cannot produce a second-generation child in v1.

If an original is unpublished, previously public copied data cannot be recalled. Existing child owners retain their own records and a minimally disclosed provenance marker; public display of withdrawn source content stops. Handle missing/private source views without leaking their content or breaking the child's ownership. No lineage tampering through client-provided IDs.

## Design and accessibility

Use a restrained trading-card design: clear typography, strong units and numeric hierarchy, readable thesis text, generous touch targets and visible keyboard focus. Aim for a usable 360px mobile viewport and a 1280px desktop layout; cards and parameter differences must work without horizontal scrolling. Use text/icons as well as color for status. Respect reduced motion and retain entered draft text through recoverable errors.

Provide labelled fields, inline errors with actionable messages, focus management in the review sheet, keyboard-operable dialogs, and status announcements for asynchronous changes. Long addresses and numbers wrap or expand safely. Unknown, unavailable, empty and rejected states receive the same visual care as success.

## Success and explicit exclusions

Success is an actual authorized root order and independently approved remix with correctly linked, honestly reconciled receipts and a working comparison. Resting, partial or cancelled outcomes must remain accurate; current bounty rules determine whether their evidence qualifies. Lack of liquidity is not permission to stage fills or manufacture another trader.

No profit leaderboard, custody, background trading, strategy optimization, automatic TP/SL, automatic cancellation/close, uncontrolled leverage, broad multi-market support, or mainnet. Optional AI, image export, analytics and extra polish beyond the acceptance bar are backlog only. If AI is later added, it drafts a structured intent with no signing authority and must go through all normal review gates.
