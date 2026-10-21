# Approved Feedback-only submission

Proposed destination: the Feedback track of [dreamDEX Perps Builder Bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail).

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
