# Approved Feedback-only submission

Proposed destination: the Feedback track of [dreamDEX Perps Builder Bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail).

Organization plan: keep approved Feedback reports together in one Feedback-only Build, and prepare ForkTrade as a separate MVP Build only when ready and authorized. A direct community reply supplied by the user supports separate Builds; its provenance and limits are recorded in [SOURCES.md](../SOURCES.md#user-supplied-build-organization-reply--2026-10-21). This clarification does not expand the existing 001 publication/text grant to report 002 or the MVP.

Published public repository: https://github.com/tang-vu/dreamdex-perps-feedback, commit `8ae7fa336d777ee6b00e73a8116d32c52ad992f3`. The current ForkTrade repository stays private. The user explicitly approved this package and the submission text below on 2026-10-21. Published only report 001, two public-site screenshots, two redacted JSON records, its dependency-free GET reproducer and a short package README/manifest. All eight remote files and the seven manifest hashes were verified against the reviewed local package. No app source, wallet/account material, environment files or databases are included.

## Proposed Build title

dreamDEX Perps Feedback — documented Perps entry redirects to spot

## Proposed Build description

This Feedback-only submission contains one reproducible app/docs report, proposed severity normal. In the observed signed-out state, the documented Perps entry redirects through the legacy Tokyo BTC-PERP route to the STT/USDso spot page, with no explanation of a perps access requirement.

The repository contains actual Edge screenshots, redacted observations, a captured three-hop HTTP 307 chain and a dependency-free Node reproducer. Testing used public navigation and GET requests only; no wallet, signature or trade was required. Authenticated behavior and root cause are not claimed.

Report: `feedback/001-perps-entry-opens-spot.md`. Reproduce the public redirects with `node feedback/repro/001-perps-entry-redirect.mjs`. Duplicate priority could not be established because the program's Builds list is private.

This is not an MVP execution submission. No acceptance or reward is claimed.

## Submission status and remaining action

Publication and submission are authorized; no repeat approval of the same package is needed. Clicking Submit Build in Edge on 2026-10-21 reached DoraHacks' login page before any Build form or submission was available. The user must sign in with their whitelisted account; the computer-use skill forbids automating user authentication dialogs. The login tab was kept for handoff. No account change, registration or Build submission occurred. No organizer acceptance or payment exists. Resume the approved submission after login, and inspect any new binding terms before accepting them. Do not publish the existing private ForkTrade repository or send a message as a substitute for submission.

## Proposed extension with report 002 — not yet authorized

The prior approval remains valid for report 001 only. The additional [report 002](002-existing-position-bracket-side.md), [reproducer](repro/002-existing-position-side.mjs) and [offline synthetic output](evidence/002-offline-existing-position.json) are private drafts. A reviewed publication candidate adds those three files and updates only the public README and manifest, resulting in eleven files total. It excludes this submission-review document and all ForkTrade application/account material. Do not push the extension or replace the approved Build text until the user approves it.

Reviewed candidate: ignored `.local/feedback-002-publication-ready` and `.local/feedback-002-publication-ready.zip`, archive SHA-256 `7bd448befb2228882d69887ee889d95efa114194c312518ececb514a41cd875f`. Exact inventory, ten payload hashes, zip-byte equality, Markdown and private-data checks passed. Baseline public commit remains `8ae7fa336d777ee6b00e73a8116d32c52ad992f3`. Approval authorizes only this nonsecurity report-only extension and the proposed replacement text below; no app, wallet, extra scope or reward claim.

Proposed replacement title:

dreamDEX Perps Feedback — entry routing and existing-position dry-run mismatch

Proposed replacement description:

This Feedback-only submission contains two independent reports, each proposed severity normal.

Report 001: in the observed signed-out state, the documented Perps entry redirects through the legacy Tokyo BTC-PERP route to the STT/USDso spot page. Evidence includes real Edge screenshots, a three-hop HTTP 307 capture and a dependency-free GET reproducer. Authenticated behavior and root cause are not claimed.

Report 002: the official bot kit's perp-starter identifies an existing position but selects its bracket side from PERP_SIDE. A source-hash-checked Node reproducer executes the pinned, unchanged strategy/helper bodies with explicit offline synthetic fixtures. Both opposite-side cases mismatch; both matching-side controls pass. No wallet, chain execution, stop acceptance, financial loss or markets-sdk library defect is claimed. Bot-kit eligibility and severity are for the organizer to determine.

Each item has its own Markdown report, evidence, reproduction steps and limitations in feedback/. No key, signature, funding or trade was needed. Duplicate priority could not be established because the program's Builds list is private. This is not an MVP execution submission. No acceptance or reward is claimed.
