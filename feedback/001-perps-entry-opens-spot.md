# Documented Perps entry sends signed-out visitors to the STT spot market

Severity: normal (proposed; organizer decides)
Area: app
Related surface: docs onboarding link
Status: reproduced draft — not submitted

## Impact and scope

Following the trader guide's Perps entry does not show a perp market or an explanation of an authentication requirement. In the observed signed-out state, it ends at the STT/USDso **spot** interface. This interrupts the documented onboarding path and makes a visitor troubleshoot the wrong product. No order was submitted and no loss is demonstrated. Authenticated behavior, other browsers and the underlying cause have not been established; this report does not claim all perps trading is unavailable.

## Environment

| Field | Observed value |
| --- | --- |
| Date / first precisely captured reproduction | 2026-10-21; HTTP observations at 04:28:48.219Z and 04:28:48.655Z |
| Browser / OS | Microsoft Edge on Windows; existing user browser controlled through computer-use; exact browser build not captured |
| Account / wallet | Signed out, Connect shown; no account or wallet required |
| Document | https://app.testnet.dreamdex.io/docs/trading/perps-testnet |
| Documented entry | https://app.testnet.dreamdex.io/perps |
| Server redirects observed | `/perps` → `/trade/perps/tokyo/BTC-PERP` → `/trade` → `/trade/spot/tokyo/STT:USDso`, all three responses HTTP 307 |
| Final browser destination | https://app.testnet.dreamdex.io/trade/spot/tokyo/STT:USDso |
| Network context | Official testnet website; developer guide identifies current perps chain 50383 (Hideki / DreamDEX region). No chain transaction is needed for this issue |
| SDK | Not needed for UI reproduction; optional HTTP capture uses Node 24.21.0 with no package dependency |
| Authorization | Public navigation and read-only GET requests only; no login, signature, funding or order |

## Steps to reproduce

1. Open the official [Perps trader guide](https://app.testnet.dreamdex.io/docs/trading/perps-testnet) while signed out.
2. Follow the `app.testnet.dreamdex.io` link in the introduction (the Get started link has the same destination). Its actual `href` is `https://app.testnet.dreamdex.io/perps`.
3. Inspect the **new tab** opened by this link. The original documentation tab stays open; that is not the failure.
4. After the application loads, observe the destination URL, selected market and spot order form.
5. As a second browser reproduction, open `https://app.testnet.dreamdex.io/perps` directly in a new tab. The same STT spot result was observed.

Optional server-side evidence capture:

```powershell
node feedback/repro/001-perps-entry-redirect.mjs
```

The helper follows at most three same-origin public GET responses, prints only timestamps/status/Location and sends no credentials. It captures the server redirects; the rendered destination is verified separately in the browser.

## Expected

The guide presents this as the entry to perps and describes a DreamDEX-region perp workflow. A reasonable expectation is to reach a valid perp market, or an explicit sign-in/region gate that retains the intended destination. This expectation is inferred from the guide and link purpose; no documented guarantee of unauthenticated trading is asserted.

Sources: [Perps trader guide](https://app.testnet.dreamdex.io/docs/trading/perps-testnet), [current developer/network guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet).

## Actual

- Two unauthenticated HTTP GET observations returned 307 with Location `/trade/perps/tokyo/BTC-PERP`.
- The saved follow-up capture at 04:34:31–04:34:32 UTC recorded the complete three-hop 307 chain from `/perps` to the STT spot URL. The spot fallback is therefore also visible in server responses; it is not inferred solely from client navigation.
- A direct fresh-tab visit and a visit through the guide's real link both displayed `/trade/spot/tokyo/STT:USDso`, STT/USDso market statistics and the spot order form.
- No explanation of a perps-specific access/region requirement was visible. The Connect controls remained available.
- Earlier market-picker/navigation experiments also remained on spot, but they are not counted as separate findings or as proof of a shared cause.

## Evidence

- [Official guide entry screenshot](evidence/001-perps-docs-entry.jpg), captured 2026-10-21 04:30:03 UTC.
- [Actual destination screenshot](evidence/001-perps-entry-lands-on-spot.jpg), captured 2026-10-21 04:30:43 UTC.
- [Public HTTP redirect capture](evidence/001-http-redirect.json).
- [Redacted observation record](evidence/001-observations.json).
- [Dependency-free HTTP reproducer](repro/001-perps-entry-redirect.mjs).

Browser repetitions used the same Edge profile; no second human or clean-profile reproduction is claimed. Screenshots are real captures of the official site, with no mocked responses or generated UI. They contain no authenticated account, wallet address, signature, balance or order evidence.

## Duplicate / known behavior check

Checked the [official program rules](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail), the linked trader/developer pages and the [Builds list](https://dorahacks.io/hackathon/dreamdex-perps-bounty/build) on 2026-10-21. The organizer has made Builds private, so submitted reports cannot be compared. Two targeted public searches for dreamDEX/perps feedback redirects/navigation returned no relevant matching report. The package's listed `somnia-chain/somnia-markets` GitHub repository was inaccessible to the current client. Discord, Telegram and private reports were not searched. First-report priority and absence of duplicates are **not** established.

## Suggested investigation

Check the legacy `/perps` redirect and the client handling of its region/market destination. The redirect includes `tokyo`, while the current developer guide identifies Hideki/DreamDEX for perps; this is a diagnostic clue, not a proven cause. Preserve the intended perps destination through sign-in/region selection, or explain the requirement explicitly instead of silently showing spot.

## Submission and outcome

No publication/submission approval has been requested yet. Not submitted; no organizer response, acceptance or reward. Proposed normal severity does not imply a payment entitlement.
