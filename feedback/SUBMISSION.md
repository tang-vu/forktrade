# Authorized Feedback-only submission

Destination: the Feedback track of [dreamDEX Perps Builder Bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail).

Organization: one Feedback-only Build containing reports/candidates 001–007, one Markdown per distinct issue. ForkTrade's later MVP stays separate and requires its own live evidence/publication gates. User-supplied organization provenance is in [SOURCES.md](../SOURCES.md#user-supplied-build-organization-reply--2026-10-21).

Published repository: https://github.com/tang-vu/dreamdex-perps-feedback, commit `e81ac63d91f0b5dfac7ccb2aac10a22822105df3`. Exact 33-file remote inventory, all bytes and 32 payload SHA-256/size entries were verified. Actual Edge shows seven items, 004's intent caveat and 006's related-report/duplicate risk. The package contains only nonsecurity reports/evidence/reproducers, README/manifest and a minimal standalone reproduction package/lock/ignore file. ForkTrade remains PRIVATE; app source, wallet/accounts/auth/env/DB and security disclosures are excluded.

## Build title

dreamDEX Perps Feedback — entry routing and bot-kit reliability reports

## Build description

This Feedback-only submission contains seven issue-specific reports/candidates, each proposed severity normal.

001: the documented Perps entry redirected the observed signed-out Edge session to STT/USDso spot. Real browser screenshots, a bounded three-hop HTTP capture and a GET reproducer are included; authenticated behavior/root cause are unknown.

002: perp-starter chooses bracket orientation from the configured side when the existing position has the opposite side. Both mismatching cases and matching controls are included.

003: perp-starter checks a configured new-entry margin budget before discovering an existing smaller position, preventing its management path below that budget. Below/at/above-budget controls keep the sides equal and request no new entry.

004: perp-maker can quote beyond its named maximum position near the threshold. Six controls reproduce the behavior, but hard-cap intent is not established; this is a lower-confidence documentation/intent clarification, not a protocol-cap bypass claim.

005: after both initial quotes are skipped, perp-maker suppresses sizing retries at an unchanged mark. Three bounded failure, healthy and moving-mark cases isolate this path.

006: the official maker's cancellation helper swallows errors, allowing replacement and forgetting old IDs without reconciliation. Three offline failure/control cases use explicitly labelled in-memory helper returns, not real orders. Related public issue 38 describes the same integration mistake in a different binary vault; that overlap and duplicate risk are prominently disclosed.

007: SDK 0.32.1 unified createOrder checks the lot threshold but misses BTC's separate minimum quantity. Public contract/metadata reads confirm lot 1000 and minimum 13000; 12 offline buy/sell boundary cases show below-minimum quantities reaching an intercepted trader seam. The original package's 632 files match its verified npm archive, and an isolated clean install reproduces the result.

Reports 002–006 concern the official bot kit and run hash-checked pinned source with explicit offline dependencies; 007 runs the original SDK method/grid helpers. These tests demonstrate code paths, not live account/order/stop/fill/exposure/loss outcomes or measured gas costs. Each report distinguishes observation, fixtures, controls, environment and limitations. No wallet, key, signature or transaction was needed. Scope, duplicates, intent and severity are organizer decisions; first-report priority is unknown because Builds are private. This is not an MVP execution submission. No acceptance or reward is claimed.

## Authorization and actual submission status

The user requested end-to-end Feedback completion without repeated questions after review of the concrete five-report package, then explicitly asked for further careful research. This continuation publishes verified nonsecurity findings to the same named public repo/program with no new private data or recipient. Scope was stated before action. No repeat per-report approval request is needed. This grants no wallet/order, private-app/MVP publication, new destination, email/community message or social post.

The seven-report description above is exactly the prepared replacement from private commit 4348517, and the title is unchanged. Earlier two/five-report wording and review approvals remain in Git history. Report 007 is the stronger new SDK item; 006 prominently discloses related prior issue 38 and possible duplicate treatment. All severities are proposed normal; no accepted-item count or reward estimate is inferred.

Actual DoraHacks still displayed its login gate on this turn's read-only check. No authentication dialog was automated, no form was available/filled, and no Build was created/submitted by the agent. User-operated whitelist sign-in is required under computer-use guidance. Keep that original login tab for handoff; continue this already authorized seven-report Build once authenticated and inspect any unexpected binding terms before accepting them. Do not ask for another package approval or substitute a message. No submission, acceptance or payment is established.

## Review and publication provenance

Current extension: immutable ignored `.local/feedback-006-007-publication-ready-v2.zip`, SHA-256 `6e6f59ee6cfa5a2986153e699180699869f0545493626981168f2c13ab4e9a9b`, based on public c1f662d. Exact 33 files / 32 payloads. Eight report/runner/evidence additions plus minimal public package/lock/.gitignore; README/manifest updated. Published by normal commit/push at e81ac63, with only manifest review-archive provenance appended. Original review data/reproducer/evidence bytes are preserved. The initial v1 archive remains in ignored scratch; v2 clarifies that the SDK context inherits the prototype without running a constructor, with unchanged test/SDK function bodies and a final recapture of the same 12 cases.

Prior five-report archive: `.local/feedback-003-005-publication-ready-v2.zip`, SHA-256 `90e1887d37a86951301a89be7870fde95ae976f219a94fdf354ce91e329f890a`, based on b1ec751. Earlier two-report archive: `.local/feedback-002-publication-ready.zip`, SHA-256 `7bd448befb2228882d69887ee889d95efa114194c312518ececb514a41cd875f`. Both remain immutable. Prior factual approval-status refreshes and 002's unused fixture enum correction were recorded; no fabricated live trade/receipt/fill was introduced.
