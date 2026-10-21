# Approved Feedback-only submission

Destination: the Feedback track of [dreamDEX Perps Builder Bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail).

Organization: one Feedback-only Build containing reports/candidates 001–005, one Markdown per distinct issue. ForkTrade will have a separate MVP Build only when ready and authorized. The user-supplied reply supports this working organization; provenance and limits are in [SOURCES.md](../SOURCES.md#user-supplied-build-organization-reply--2026-10-21).

Published repository: https://github.com/tang-vu/dreamdex-perps-feedback, commit `c1f662db6c75cb72a4017ae97af60f9dcb831d9e`. All 22 remote files, byte equality and 21 payload SHA-256/size entries were verified. Actual Edge shows all five reports and their evidence qualifications. This package contains only the reviewed nonsecurity reports, evidence, dependency-free reproducers/helpers, README and manifest. ForkTrade remains PRIVATE; no application source, private account/wallet/auth material, environment file or database is included.

## Approved Build title

dreamDEX Perps Feedback — entry routing and bot-kit reliability reports

## Approved Build description

This Feedback-only submission contains five issue-specific reports/candidates, each proposed severity normal.

001: the documented Perps entry redirected the observed signed-out Edge session to STT/USDso spot. Real browser screenshots, a bounded three-hop HTTP capture and a GET reproducer are included; authenticated behavior/root cause are unknown.

002: perp-starter chooses bracket orientation from the configured side when the existing position has the opposite side. Both mismatching cases and matching controls are included.

003: perp-starter checks a configured new-entry margin budget before discovering an existing smaller position, preventing its management path below that budget. Below/at/above-budget controls keep the sides equal and request no new entry.

004: perp-maker can quote beyond its named maximum position near the threshold. Six controls reproduce the behavior, but hard-cap intent is not established; this is a lower-confidence documentation/intent clarification, not a protocol-cap bypass claim.

005: after both initial quotes are skipped, perp-maker suppresses sizing retries at an unchanged mark. Three bounded failure, healthy and moving-mark cases isolate this path.

Reports 002–005 execute hash-checked pinned official bot-kit strategy/helper bodies with explicit offline synthetic fixtures and controlled dependencies. They demonstrate code paths, not live wallet/order/stop/fill/exposure/loss outcomes or markets-sdk library defects. Each file describes source handling, controls, environment and limitations. No wallet, key, signature or transaction was needed. Bot-kit scope, duplicates, intent and severity are for the organizer to decide; first-report priority is unknown because Builds are private. This is not an MVP execution submission. No acceptance or reward is claimed.

## Authorization and actual submission status

On 2026-10-21, after review of the concrete 22-file extension and exact five-report replacement text, the user instructed: “Cứ làm end to end đi, đừng cái gì cũng hỏi tôi”. This was treated as approval of that presented extension and Feedback submission, and that interpretation was stated before publication. No repeat package/text approval is needed. This replaces the earlier two-report Build text; its original wording remains in Git history at 2e6faf7. No MVP source publication, social post, wallet signature or order is implied by this Feedback instruction.

The reviewed addition was published through normal commit/push at c1f662d after confirming clean isolated baseline b1ec751 and unchanged official bot-kit revision. Only factual approval status in reports 003–005 and the manifest was refreshed. Report 004 retains its explicit unresolved-intent/lower-confidence qualification; all severities are proposed normal.

Re-read the current official bounty in actual Edge on 2026-10-21 12:38 UTC. A fresh Submit Build click after publication again redirected to DoraHacks login before any form. No Build was created/submitted and no acceptance or payment is established. The user must sign in with the whitelisted account; computer-use forbids automating authentication dialogs. Keep the original login tab for user handoff and continue this already authorized submission after sign-in. Do not request package approval again or substitute an email/community message.

## Reviewed package provenance

Additional review archive: ignored `.local/feedback-003-005-publication-ready-v2.zip`, SHA-256 `90e1887d37a86951301a89be7870fde95ae976f219a94fdf354ce91e329f890a`, preserved unchanged. Exact allowlist: 22 files, 21 payloads plus manifest, based on public `b1ec751c0e9ed8ace96d45b852d16e55decfe276`. Eleven added payloads are three reports, three runners, two shared offline helpers and three explicitly synthetic JSON records. Public README/manifest were updated. Existing 002's unused MARKET fixture was corrected from 1 to SDK 0.32.1's 2; all four existing-position cases are unchanged. This fixture correction is not an upstream finding.

The approved title/description above are byte-for-byte the reviewed proposed replacement, apart from surrounding document headings. Source hashes, runner behavior and evidence were preserved. Existing original extension archive `.local/feedback-002-publication-ready.zip`, SHA-256 `7bd448befb2228882d69887ee889d95efa114194c312518ececb514a41cd875f`, is retained as prior provenance. No further public-data scope extension is implicit.
