# Approved Feedback-only submission

Destination: the Feedback track of [dreamDEX Perps Builder Bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail).

Organization: one Feedback-only Build for reports 001 and 002, with each issue in its own Markdown file. ForkTrade will have a separate MVP Build only when ready and authorized. The user supplied a direct community reply supporting separate Builds; provenance/limits are in [SOURCES.md](../SOURCES.md#user-supplied-build-organization-reply--2026-10-21).

Published repository: https://github.com/tang-vu/dreamdex-perps-feedback, commit `b1ec751c0e9ed8ace96d45b852d16e55decfe276`. Both reports are public. All eleven remote files, byte equality and the ten payload hashes/sizes were verified. This package contains only the reviewed reports, evidence, two dependency-free reproducers, README and manifest. ForkTrade remains PRIVATE; no application source, wallet/account material, environment files or databases are included.

## Approved Build title

dreamDEX Perps Feedback — entry routing and existing-position dry-run mismatch

## Approved Build description

This Feedback-only submission contains two independent reports, each proposed severity normal.

Report 001: in the observed signed-out state, the documented Perps entry redirects through the legacy Tokyo BTC-PERP route to the STT/USDso spot page. Evidence includes real Edge screenshots, a three-hop HTTP 307 capture and a dependency-free GET reproducer. Authenticated behavior and root cause are not claimed.

Report 002: the official bot kit's perp-starter identifies an existing position but selects its bracket side from PERP_SIDE. A source-hash-checked Node reproducer executes the pinned, unchanged strategy/helper bodies with explicit offline synthetic fixtures. Both opposite-side cases mismatch; both matching-side controls pass. No wallet, chain execution, stop acceptance, financial loss or markets-sdk library defect is claimed. Bot-kit eligibility and severity are for the organizer to determine.

Each item has its own Markdown report, evidence, reproduction steps and limitations in feedback/. No key, signature, funding or trade was needed. Duplicate priority could not be established because the program's Builds list is private. This is not an MVP execution submission. No acceptance or reward is claimed.

## Submission status and remaining action

The user instructed continuation on 2026-10-21 after review of the concrete report 002 extension and two-Build plan. That instruction was interpreted as approval to publish the reviewed extension and use this already presented two-report title/description; the scope was stated in commentary before publication. No repeat package/text approval is needed.

A fresh Submit Build attempt in actual Edge still redirected to DoraHacks login before any form was available. The user must sign in with their whitelisted account; the computer-use skill forbids automating user authentication dialogs. The login tab was reopened and kept for handoff. No registration, account change or Build submission occurred. No organizer acceptance or payment exists. Resume this approved submission after sign-in and inspect any unexpected binding terms before accepting them. Do not publish the private ForkTrade app or send a message as a substitute for submission.

## Reviewed package provenance

Original extension review archive: ignored `.local/feedback-002-publication-ready.zip`, SHA-256 `7bd448befb2228882d69887ee889d95efa114194c312518ececb514a41cd875f`. Public baseline was `8ae7fa336d777ee6b00e73a8116d32c52ad992f3`; publication refreshed only factual approval status in report 002 and the manifest before pushing `b1ec751`. Report bodies/evidence/reproducer behavior stayed as reviewed. The exact two-report Build text above is the previously proposed replacement. This grant covers the nonsecurity Feedback package and submission only; no MVP publication, social post, wallet signature or order approval is implied.

## Proposed additional reports — not yet authorized

Destination: extend the existing public `tang-vu/dreamdex-perps-feedback` repository and the same Feedback-only DoraHacks Build. Keep the private ForkTrade application and its later MVP separate. This proposal does not revoke the already approved two-report submission above.

Prepared review archive: ignored `.local/feedback-003-005-publication-ready-v2.zip`, SHA-256 `90e1887d37a86951301a89be7870fde95ae976f219a94fdf354ce91e329f890a`. Exact allowlist: 22 files (21 payloads plus manifest), based on public commit `b1ec751c0e9ed8ace96d45b852d16e55decfe276`. Eleven added payloads are three reports, three runners, two shared offline helpers and three explicitly synthetic JSON records. Public README/manifest are updated. Existing 002's unused fixture enum is corrected from MARKET 1 to MARKET 2 to match SDK 0.32.1; entry is never reached in its four existing-position cases, and its observed result is unchanged. This fixture correction is not an upstream finding.

Reports 003 and 005 are the stronger additions: startup budget blocks discovery/management of an existing smaller position, and skipped initial quotes are not retried at an unchanged mark after sizing recovery. Both have controls and distinct causes. Report 004 reproduces a quote beyond a named maximum but explicitly asks whether that setting is intended as a hard cap or soft threshold; lower confidence as a malfunction. All propose normal, and bot-kit eligibility, intent, duplicates and severity remain organizer decisions. No new live account, quote, fill, loss, acceptance or payment is claimed.

No app source, env/DB, private account/address association, auth or wallet material is included. On approval, publish only this allowlist, refreshing factual approval/publication status and the manifest; use the replacement title/description below. Reverify the remote baseline before a normal commit/push. The original review archive stays immutable. No public extension or replacement submission text is authorized yet.

### Proposed replacement Build title

dreamDEX Perps Feedback — entry routing and bot-kit reliability reports

### Proposed replacement Build description

This Feedback-only submission contains five issue-specific reports/candidates, each proposed severity normal.

001: the documented Perps entry redirected the observed signed-out Edge session to STT/USDso spot. Real browser screenshots, a bounded three-hop HTTP capture and a GET reproducer are included; authenticated behavior/root cause are unknown.

002: perp-starter chooses bracket orientation from the configured side when the existing position has the opposite side. Both mismatching cases and matching controls are included.

003: perp-starter checks a configured new-entry margin budget before discovering an existing smaller position, preventing its management path below that budget. Below/at/above-budget controls keep the sides equal and request no new entry.

004: perp-maker can quote beyond its named maximum position near the threshold. Six controls reproduce the behavior, but hard-cap intent is not established; this is a lower-confidence documentation/intent clarification, not a protocol-cap bypass claim.

005: after both initial quotes are skipped, perp-maker suppresses sizing retries at an unchanged mark. Three bounded failure, healthy and moving-mark cases isolate this path.

Reports 002–005 execute hash-checked pinned official bot-kit strategy/helper bodies with explicit offline synthetic fixtures and controlled dependencies. They demonstrate code paths, not live wallet/order/stop/fill/exposure/loss outcomes or markets-sdk library defects. Each file describes source handling, controls, environment and limitations. No wallet, key, signature or transaction was needed. Bot-kit scope, duplicates, intent and severity are for the organizer to decide; first-report priority is unknown because Builds are private. This is not an MVP execution submission. No acceptance or reward is claimed.
