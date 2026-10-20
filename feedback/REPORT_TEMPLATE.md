# [Short factual title]

> Blank template, not a finding. Copy to one issue-specific Markdown file only after real authorized reproduction. Remove this notice in the copied report and fill observed facts. Do not insert security vulnerabilities or secrets; follow ../SECURITY.md instead.

## Status and scope

- Status: unconfirmed / reproduced draft / user-approved for submission / submitted / accepted / rejected / duplicate (select only the actual state).
- First observed (UTC): not observed.
- Independently reproduced (UTC): not reproduced.
- Reporter-controlled app/version/commit, if relevant: not recorded.
- Upstream area: UI / orders / margin / market data / SDK / documentation / other (specify).
- Proposed severity: unassigned; explain using the program's current definitions.
- Impact and severity rationale: describe demonstrated impact, affected users/conditions and limits. Do not inflate severity or claim acceptance.

## Environment

| Field | Observed value |
| --- | --- |
| Test date/time UTC | Not tested |
| App URL/build and selected region label | Not recorded |
| Chain ID and runtime verification source | Not verified |
| Market/pool and base/quote decimals | Not recorded |
| Tick/lot/minimum and metadata as-of | Not recorded |
| Wallet type/browser/OS/device | Not recorded; never include secrets |
| SDK/package version and transport | Not installed/recorded |
| Account mode/permissions/collateral restrictions relevant to reproduction | Not recorded; redact private data |
| Authorization scope for any signatures/transactions | Not authorized by this template |

## Preconditions

Describe the minimum required account, market, UI or data state. Distinguish actual conditions from assumptions. List any necessary permissions. Do not ask a reproducer to import a key, grant an operator or send a transaction without appropriate authorization.

## Reproduction steps

1. Specify the exact starting state and route.
2. Give precise inputs, units and actions; include exact order type/time in force if relevant.
3. Identify the point at which the observed mismatch occurs, with matching timestamps/evidence.

Record actual reproduction count and failed attempts. If interrupted or uncertain, say so. Do not blindly resubmit an order to obtain a cleaner result.

## Expected behavior

State the expectation and link the current official documentation or product contract that supports it. If the expectation is an inference, label it as an inference. A desired improvement alone is different from a documented malfunction.

## Actual behavior

Describe only observed facts. Separate transaction submitted/confirmed/reverted and order accepted/open/partial/filled/cancelled/rejected/unknown. A transaction hash alone is not proof of a fill. Include filled/remainder units and source as-of/block identity where relevant. Mark unavailable history instead of reconstructing it.

## Evidence

- Redacted screenshot/video/log path or approved URL: none.
- Exact request/order/transaction identity when safe to disclose: none; never invent placeholders resembling real evidence.
- Source/chain/pool/account association and observation time: not verified.
- Reproduction count and consistency: not tested.
- Evidence gaps/unknowns: no observation yet.

Review URLs, headers, console output, wallet screens, cookies, signatures, API keys, balances and personal data before committing. Security-sensitive evidence stays outside Git even while the repository is private.

## Duplicate and known-behavior check

- Sources/issues/reports searched and date: not checked.
- Matching known issue or documentation: unknown.
- Why this appears distinct, if known: not established.
- Limits of the search (for example inaccessible private submissions): unknown.

Do not claim first reporting unless established. The program may reject duplicates even when the search found none.

## Analysis and suggested remedy (optional)

Separate a suspected cause from confirmed observations. Offer a bounded remediation or clarification if evidence supports it; do not present an untested patch as a verified fix.

## Submission and outcome

- User approval of exact report/destination: not requested.
- Authorized submission date/link: not submitted.
- Organizer response: none.
- Acceptance/duplicate decision: none.
- Reward/payment: none; never infer from proposed severity.

For security vulnerabilities, do not use this public-compatible report flow. Prepare a private disclosure to security@dreamdex.io outside Git and send only after explicit user approval.
