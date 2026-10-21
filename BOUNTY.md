# Bounty fit and submission gates

Status: local implementation in progress; offline path, actual reads and bounded account funding exist. ForkTrade targets **both MVP and Feedback tracks** of the dreamDEX Perps bounty. No root/remix order acceptance, submission, eligibility or reward is established. The repository stays private until the user separately approves a concrete access/visibility change.

**Feedback is the active user priority as of 2026-10-21.** One actual upstream report is [reproduced](feedback/001-perps-entry-opens-spot.md), with normal severity proposed and no submission/acceptance/payment. The current ordinary-Edge rule recheck still supports the listed Feedback amounts/format; the Builds list is private, so first-report priority is unknown. The user approved the reviewed Feedback-only package and Build text; [that separate package is public](https://github.com/tang-vu/dreamdex-perps-feedback), excluding the private application and wallet material. Clicking Submit Build reached DoraHacks login; the approved submission is pending the user's whitelisted session.

A second [private report](feedback/002-existing-position-bracket-side.md) reproduces a bot-kit dry-run side mismatch using explicit offline synthetic fixtures. This is separate code-path evidence, not a live protocol failure. Its scope/duplicate/severity decision remains with the organizer, and publication/submission of this addition is not covered by report 001 approval.

## Provenance and dates

The rule facts below come from the user's full pasted official program page on **2026-10-20**, as supplied for this project. The live [DoraHacks bounty page](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail) was CAPTCHA-blocked in that review; this documentation run also could not retrieve the live rules. Reverify the current official page and any organizer clarifications before submission. Do not bypass a CAPTCHA or treat an inaccessible page as confirmation of unchanged rules.

**Reverified 2026-10-21:** the ordinary Edge browser displayed the official page without login or CAPTCHA interaction. Deadline and track requirements match the baseline. The page links directly to the testnet developer guide describing chain 50383 and the verified bank/collateral, supporting the network-label mapping in [environment evidence](evidence/environment-2026-10-21.json). This establishes the referenced test environment, not entry acceptance or a qualifying execution outcome. Extra bounty funding must not be moved into Arena accounts; no cross-account transfer was made.

Stated deadline: **2026-11-01 23:59 UTC**, equivalent to **2026-11-02 06:59 Asia/Ho_Chi_Minh (UTC+7)**. Results were expected by **November 8, 2026**; the supplied summary gives no exact results time. Recheck both dates. No automation or submission is created by this document.

The existing whitelist/application invitation is access to try the program, not guaranteed acceptance, reward or prize. Do not commit personal invitation contents or identifiers as evidence.

## Program requirements and reward conditions

| Track/requirement | Supplied rule summary | ForkTrade response |
| --- | --- | --- |
| All Builds | GitHub repository required | Private source branch contains the offline app; live acceptance and approved reviewer access still needed |
| Feedback pool | Up to $1,500 total | No guaranteed allocation; budget can exhaust |
| Critical/major accepted feedback | $40 per accepted report | Severity is proposed with evidence; organizer acceptance determines payment |
| Other accepted feedback | $15 per accepted report | No payment claim from a draft or local reproduction alone |
| Feedback priority | First reproducible report only; duplicates not paid | Check duplication and report only real independently reproduced issues |
| Feedback format | One Markdown per issue in `feedback/` with severity, area, steps, expected, actual, evidence and environment | Report 001 has actual app/docs reproduction, evidence and limits; normal severity proposed; no submission/acceptance |
| Security vulnerabilities | Private disclosure to security@dreamdex.io | Keep details out of Git/public reports; send only after user approves |
| MVP awards | Three prizes of $500 | Competition, not a guaranteed win |
| MVP payout split | $300 at result; $200 only if mainnet orders occur within 30 days of perps mainnet launch | Mainnet work is separate and not authorized by this project goal |
| MVP evidence | Actual perps testnet orders, README/run guide, demo evidence, and 2-3 X post links tagging @DreamDEXSomnia | Build/test first; prepare drafts only; actual posts need approval |

Do not combine the bounty with similarly named trading competitions or other prize pools. Testnet paper balances/returns are not real profit, and a conditional future mainnet tranche is not earned by this testnet documentation or build.

## Why this concept fits

The intended MVP demonstrates a real perps integration inside a clear human workflow: thesis version, fresh review, explicit order, reconciled evidence, share card, independent remix and visible changes/lineage. Existing official bot-kit maker/funding/guard strategies and app TP/SL mean a thin wrapper around those features is weak differentiation. ForkTrade's proposed contribution is social remix plus honest execution evidence.

Feedback is now the active user priority and may test the official perps app/API/SDK/docs directly within authorized read-only scope. It is not a reason to manufacture issues or pad the feature scope. Bugs in ForkTrade itself should be fixed as app defects; do not submit them as protocol findings. A test idea is not a confirmed bounty issue, and a confirmed observation is not automatically accepted/paid.

## Environment and eligibility verification gate

The current developer snapshot describes Hideki chain ID 50383, an explorer path containing `/tokyo` and an app label of DreamDEX region; older indexed wording used Tokyo region. These labels must not be promoted into invented separate networks or assumed to establish eligibility. Before any execution, verify live chain ID, official contracts/system configuration, selected perps market and the program's accepted environment. Before submission, verify that the actual recorded outcomes satisfy the current MVP requirement; do not assume every confirmed or resting order qualifies without checking.

If accepted-environment rules remain unavailable, continue local/offline work and record the eligibility blocker. Do not change a network silently, claim a mainnet/testnet success from another chain or hardcode stale prose addresses.

## Readiness table

| Item | Current state | Evidence needed later |
| --- | --- | --- |
| Private GitHub docs baseline | Prepared by this task | Verified repository visibility, branch, commit and Markdown inventory |
| Runnable app/source | Offline path and guarded live integration pass source/mock/browser checks; actual funded-owner sizing/simulation pass | Actual user ownership flow and root/remix order acceptance remain unrun |
| Actual root and remix perps orders | None | Separate user approvals, real identities and honest reconciled outcomes |
| Accepted environment and current rules | Official page and linked developer environment reverified 2026-10-21 | Recheck before submission; no claim that pending root/remix outcomes qualify |
| Demo evidence | Offline synthetic screenshots inspected; no live demo/recording | Real reviewed recording/screenshots/receipts with limitations |
| Feedback reports | 001 reproduced in real Edge/HTTP and published at 8ae7fa3; 002 reproduced with pinned source and explicit offline synthetic fixtures, private draft | User login and actual 001 submission; separate 002 publication/text approval; organizer scope/duplicate/acceptance decisions pending |
| 2-3 X post links | None; drafts in DEMO.md only | User-approved published posts and actual URLs |
| Judge access/public source | Not authorized | User-approved least-needed access; recheck program requirements |
| Submission | Feedback 001 package/text explicitly approved; not submitted, login gate observed | User signs in to the whitelist account, then resume approved Build submission; MVP submission remains unauthorized |
| Mainnet conditional tranche | Separate future scope | No actions planned or authorized here |

## Future submission procedure

1. Complete the narrow implementation and acceptance gates; record all remaining limitations and open exposures honestly.
2. Re-read the live official rules, dates, track criteria, access requirements, accepted environment and media/post requirements. Resolve discrepancies explicitly with the user; don't substitute an old cached summary as current proof.
3. Review the repo and all evidence for secrets, private data, security vulnerabilities, unsupported performance claims and fixture/live confusion. Keep vulnerability details outside the repo.
4. Prepare a concrete submission package with exact commit, tested run guide, actual demo evidence, genuine feedback reports if any, and final proposed posts/access changes. Complete independent preparation before requesting missing approvals.
5. Ask the user for the specific external actions still needed: source/judge access or visibility, demo hosting if desired, final post publication, submission, and any private disclosure. None is implicitly authorized by creating this repository or invoking GOAL.md.
6. After an authorized action, verify the actual result and save only safe links/evidence. A draft, queued request or timeout is not a posted/submitted result. If blocked, record the exact action/target/reason and denied/pending/uncertain status.

Do not change the repository to public now, send mail, post on X, submit reports, deploy or execute a mainnet order automatically. No award, acceptance or payment can be claimed until independently confirmed by the program.
