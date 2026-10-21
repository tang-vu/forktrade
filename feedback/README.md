# Feedback track workflow

**Current state: one reproduced nonsecurity report draft; zero submitted/accepted/paid reports.** The user prioritized Feedback on 2026-10-21. Report 001 documents the official Perps entry's three-hop redirect to STT spot with actual Edge screenshots and a dependency-free HTTP reproducer. A reproduced observation is not organizer acceptance. Do not count README.md or REPORT_TEMPLATE.md as reports.

## What belongs here

After authorized, real testing, create **one Markdown file per distinct reproducible nonsecurity issue**, for example `001-short-issue-title.md`. Describe an observed dreamDEX perps product/protocol problem with enough redacted evidence for another person to reproduce it. Bugs only in ForkTrade should be fixed and tracked as app defects, not misrepresented as upstream bounty findings.

Use [REPORT_TEMPLATE.md](REPORT_TEMPLATE.md). Each report needs severity and rationale, area, steps, expected behavior, actual behavior, evidence and environment. Preserve first observation/reproduction times and versions. Separate an observation from a suspected cause; do not claim causality without proof. Reproduce only inside authorized scope; do not send extra trades or stress traffic without permission.

## Workflow

1. Record a hypothesis in the backlog without calling it a finding.
2. Check the current official docs and rules. Decide whether behavior may be documented/expected, a local integration mistake, a ForkTrade bug, or a possible upstream issue.
3. Prepare a minimal safe test. Complete offline analysis first. Obtain any missing permission for account access, wallet interaction or transactions before performing dependent steps.
4. Observe the real result; retry only when safe and authorized. A lost/uncertain transaction must be reconciled before considering a new order. Never fabricate an error, fill, screenshot or user account to complete a report.
5. Reproduce the behavior with exact environment/steps where possible. If not reproduced, retain an explicit unconfirmed note; do not create a completed bounty report.
6. Check existing known issues/reports available to the user and record the duplicate search scope/date. Do not claim exhaustive first reporting when other submissions are private or inaccessible.
7. Write one report with redacted evidence, expected/actual, impact and severity rationale. Distinguish observed fact, hypothesis and requested clarification. Mark it `draft - reproduced, not submitted` until an actual authorized submission occurs.
8. Have the user review the final package and destination before submission. A private Git commit is not submission or acceptance. Record actual response/acceptance/payment only if received and verified.

The official page was re-read in ordinary Edge on 2026-10-21: $40 for accepted critical/major items and $15 for other accepted items, up to a $1,500 pool, with reproducibility and first-valid-report requirements. Builds are private, so submitted-report duplicate checking is unavailable. Organizers determine acceptance; no severity label or local reproduction guarantees payment. See [BOUNTY.md](../BOUNTY.md) and recheck before submission.

Run the first report's public HTTP check with `node feedback/repro/001-perps-entry-redirect.mjs`. It performs at most three same-origin GETs and uses no wallet or credentials. The optional `--out feedback/evidence/<new-file>.json` preserves a new observation without overwriting existing evidence.

## Security exception

Do **not** put vulnerabilities, exploit details, secrets or security evidence into these files, public GitHub issues, demo material or X posts. Keep sensitive details outside Git, prepare a private disclosure to **security@dreamdex.io**, and send only after the user approves the final email. This task authorizes no message. See [SECURITY.md](../SECURITY.md).

## Unconfirmed test hypotheses

The original items below remain **unconfirmed hypotheses**, not report counts. They may turn out to be expected behavior or local mistakes. Current triage: the developer-guide operator ABI question is unconfirmed; read-only `placeOrderFor` probes reverted without a usable reason and no operator authorization was granted. SDK 0.32.1 remains the current npm version. A mismatch with the self-order ABI alone does not prove the operator ABI is wrong. No report was created for that hypothesis.

| Hypothesis / question | Safe first investigation | Evidence needed before a report |
| --- | --- | --- |
| UI/API message may be unclear for precision/tick/lot mismatch | Compare documented units and offline validation first | Real authorized observation with exact metadata, inputs and expected documented behavior |
| Account/network change may leave a stale preview or misleading UI state | Inspect source/behavior with mock wallet then read-only session if permitted | Reproduced original app issue, not merely ForkTrade's mock behavior |
| Reconnect may not explain missing order-event history | Determine documented replay/snapshot semantics | Real gap and documented expectation; unavailable history alone is not automatically a bug |
| Partial-fill/remainder presentation may be confusing | Review documented state semantics and sample nonsecret observations | Real order facts and UI display with matching account/market/time |
| Voucher/isolated-market limits may lack actionable explanation | Read current restrictions; verify inputs before testing | Authorized actual response, metadata and a clear expected/actual mismatch |
| Mobile confirmation or card layout may obscure a critical field | Inspect at small viewport without sending an order | Reproducible original app layout and browser/device evidence |

Avoid dangerous or disruptive testing, broad scans, abusive load, real-fund experiments or manipulative trades. The goal is a reproducible useful report, not a manufactured issue count.

## Report index

Add a row only for a real issue file:

| File | Observed/reproduced UTC | Proposed severity | Status | Duplicate check | Authorized submission/result |
| --- | --- | --- | --- | --- | --- |
| [001 — Perps entry opens spot](001-perps-entry-opens-spot.md) | 2026-10-21; first precisely captured GET 04:28:48 UTC; Edge captures 04:30 UTC; full HTTP chain 04:34 UTC | normal | Reproduced draft | Official docs/rules checked; public Builds private; targeted public searches found no relevant match; priority unknown | Not approved for publication/submission; not submitted or paid |
