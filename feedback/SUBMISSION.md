# Feedback submission record and form content

Destination: the Feedback track of [dreamDEX Perps Builder Bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail).

Organization: one Feedback-only Build containing reports/candidates 001–008, one Markdown per distinct issue. ForkTrade's later MVP stays separate and requires its own live evidence/publication gates. User-supplied organization provenance is in [SOURCES.md](../SOURCES.md#user-supplied-build-organization-reply--2026-10-21).

Published repository: https://github.com/tang-vu/dreamdex-perps-feedback, commit `7e1aade0b87fd9ff5a1bd8d909c1adefb9d97b29`. Exact 39-file remote inventory, all bytes and 38 payload SHA-256/size entries were verified. Actual Edge shows eight items, 004's intent caveat and 006's related-report/duplicate risk. The package contains only nonsecurity reports/evidence/reproducers, README/manifest and a minimal standalone reproduction package/lock/ignore file. ForkTrade remains PRIVATE; app source, wallet/accounts/auth/env/DB and security disclosures are excluded.

## Current submission record — 2026-10-22

The user reports Feedback submission as [DoraHacks Build 50119](https://dorahacks.io/build/50119) on 2026-10-22. The public Build title and GitHub repository link were independently verified in signed-out Edge; the hackathon/track registration status was not exposed on that page. Organizer acceptance, first-report priority and payment remain unverified.

The public Details field currently contains the complete old internal SUBMISSION.md, including relative links, archive paths and the outdated statement that no Build had been submitted. That content is visible on the Build; it is not evidence of a failed submission. No secrets or wallet credentials were observed. Use only [DORAHACKS_DESCRIPTION.txt](DORAHACKS_DESCRIPTION.txt) when replacing the Details body. The file contains the eight-report description and its limitations, without internal workflow notes. The signed-out agent browser exposes no edit control, so no Build edit was attempted or claimed. The user must apply this copy in their existing authenticated session, or provide the same form in a supported authenticated browser session; no repeat publication approval is needed.

The earlier login gate below is historical, superseded by this user-reported submission and verified public Build. The agent did not submit the Build on the user's behalf, did not verify a hackathon success receipt and did not create a second Build.

## Build title

dreamDEX Perps Feedback — app, bot-kit and SDK reliability

## Build description

This Feedback-only submission contains eight issue-specific reports/candidates, each proposed severity normal.

001: the documented Perps entry redirected the observed signed-out Edge session to STT/USDso spot. Real browser screenshots, a bounded three-hop HTTP capture and a GET reproducer are included; authenticated behavior/root cause are unknown.

002: perp-starter chooses bracket orientation from the configured side when the existing position has the opposite side. Both mismatching cases and matching controls are included.

003: perp-starter checks a configured new-entry margin budget before discovering an existing smaller position, preventing its management path below that budget. Below/at/above-budget controls keep the sides equal and request no new entry.

004: perp-maker can quote beyond its named maximum position near the threshold. Six controls reproduce the behavior, but hard-cap intent is not established; this is a lower-confidence documentation/intent clarification, not a protocol-cap bypass claim.

005: after both initial quotes are skipped, perp-maker suppresses sizing retries at an unchanged mark. Three bounded failure, healthy and moving-mark cases isolate this path.

006: the official maker's cancellation helper swallows errors, allowing replacement and forgetting old IDs without reconciliation. Three offline failure/control cases use explicitly labelled in-memory helper returns, not real orders. Related public issue 38 describes the same integration mistake in a different binary vault; that overlap and duplicate risk are prominently disclosed.

007: SDK 0.32.1 unified createOrder checks the lot threshold but misses BTC's separate minimum quantity. Public contract/metadata reads confirm lot 1000 and minimum 13000; 12 offline buy/sell boundary cases show below-minimum quantities reaching an intercepted trader seam. The original package's 632 files match its verified npm archive, and an isolated clean install reproduces the result.

008: SDK 0.32.1 funding-history pagination floors a millisecond cursor into an inclusive second bound. Actual public BTC history returns the previous row for `last.timestamp + 1`; 10 bounded original-SDK cases show repeated rows and a stalled tail, with passing controls and an isolated reproduction. The official release notes explicitly promise this cursor idiom terminates. This is distinct from the earlier known newest-first ordering issue.

Reports 002–006 concern the official bot kit and run hash-checked pinned source with explicit offline dependencies; 007–008 run original SDK methods/helpers, and 008 also executes the actual query/transport boundary against synthetic responses. These tests demonstrate code paths, not live account/order/stop/fill/exposure/loss outcomes or measured gas costs. Each report distinguishes observation, fixtures, controls, environment and limitations. 008 also includes a separately labelled public history capture and bounded two-read verification, with no owner or transaction. No wallet, key, signature or transaction was needed. Scope, duplicates, intent and severity are organizer decisions; first-report priority is unknown because other bounty submissions were unavailable for duplicate review. This is not an MVP execution submission. No acceptance or reward is claimed.

## Historical authorization and pre-submission status

The user requested end-to-end Feedback completion without repeated questions after review of the concrete five-report package, then explicitly asked for further careful research. This continuation publishes verified nonsecurity findings to the same named public repo/program with no new private data or recipient. Scope was stated before action. No repeat per-report approval request is needed. This grants no wallet/order, private-app/MVP publication, new destination, email/community message or social post.

The eight-report description and updated title above are the current verified package text under the standing instruction for this same named Feedback destination. The prior seven-report description/title were verified against private commit 4348517 and remain in Git history. Earlier two/five-report wording and review approvals remain in Git history. Reports 007 and 008 add independently reproduced SDK issues; 006 prominently discloses related prior issue 38 and possible duplicate treatment. All severities are proposed normal; no accepted-item count or reward estimate is inferred.

The final actual Edge check on 2026-10-21 still displayed the original DoraHacks login gate, empty fields and a disabled Continue button. No authentication was operated. No authentication dialog was automated, no form was available/filled, and no Build was created/submitted by the agent. User-operated whitelist sign-in is required under computer-use guidance. Keep that original login tab for handoff; continue this authorized Feedback Build with the current verified report package once authenticated and inspect any unexpected binding terms before accepting them. Do not ask for another package approval or substitute a message. No submission, acceptance or payment is established.

Report 008 publication is verified at 1cfb630133aeec45ac482ec7c77d0128ad56548d. Exact 38-file/37-payload archive `.local/feedback-008-publication-ready.zip`, SHA-256 `33b2eeac056d9f4d90b5ee3f8665e82c483b6f1fcba60ef1bc07b3ce7387a332`, adds five report/runner/evidence files and updates public README/package scripts/manifest from e81ac63. No dependency or existing report/evidence change. All 38 remote files exactly match that immutable review archive, including the manifest; 37 payload hashes/sizes and private-data exclusions passed. This eight-report text supersedes the prior seven-report text, while actual Build submission remains unperformed.

## Historical review and publication provenance

Prior seven-report extension: immutable ignored `.local/feedback-006-007-publication-ready-v2.zip`, SHA-256 `6e6f59ee6cfa5a2986153e699180699869f0545493626981168f2c13ab4e9a9b`, based on public c1f662d. Exact 33 files / 32 payloads. Eight report/runner/evidence additions plus minimal public package/lock/.gitignore; README/manifest updated. Published by normal commit/push at e81ac63, with only manifest review-archive provenance appended. Original review data/reproducer/evidence bytes are preserved. The initial v1 archive remains in ignored scratch; v2 clarifies that the SDK context inherits the prototype without running a constructor, with unchanged test/SDK function bodies and a final recapture of the same 12 cases.

Prior five-report archive: `.local/feedback-003-005-publication-ready-v2.zip`, SHA-256 `90e1887d37a86951301a89be7870fde95ae976f219a94fdf354ce91e329f890a`, based on b1ec751. Earlier two-report archive: `.local/feedback-002-publication-ready.zip`, SHA-256 `7bd448befb2228882d69887ee889d95efa114194c312518ececb514a41cd875f`. Both remain immutable. Prior factual approval-status refreshes and 002's unused fixture enum correction were recorded; no fabricated live trade/receipt/fill was introduced.
