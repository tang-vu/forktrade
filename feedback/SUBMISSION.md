# Feedback-only submission draft

Proposed destination: the Feedback track of [dreamDEX Perps Builder Bounty](https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail).

Proposed public repository: `https://github.com/tang-vu/dreamdex-perps-feedback` (not created). The current ForkTrade repository stays private. Only the reviewed Feedback package is proposed for publication: report 001, two public-site screenshots, two redacted JSON records, its dependency-free GET reproducer and a short package README/manifest. No app source, wallet/account material, environment files or databases are included.

## Proposed Build title

dreamDEX Perps Feedback — documented Perps entry redirects to spot

## Proposed Build description

This Feedback-only submission contains one reproducible app/docs report, proposed severity normal. In the observed signed-out state, the documented Perps entry redirects through the legacy Tokyo BTC-PERP route to the STT/USDso spot page, with no explanation of a perps access requirement.

The repository contains actual Edge screenshots, redacted observations, a captured three-hop HTTP 307 chain and a dependency-free Node reproducer. Testing used public navigation and GET requests only; no wallet, signature or trade was required. Authenticated behavior and root cause are not claimed.

Report: `feedback/001-perps-entry-opens-spot.md`. Reproduce the public redirects with `node feedback/repro/001-perps-entry-redirect.mjs`. Duplicate priority could not be established because the program's Builds list is private.

This is not an MVP execution submission. No acceptance or reward is claimed.

## Required before sending

The user must approve the exact public package/destination and this submission text. DoraHacks currently shows Log in in the tested Edge browser; the user must sign in with their whitelisted account. Private Builds do not eliminate the separate GitHub visibility decision. Do not publish the existing private ForkTrade repository or send a message as a substitute for submission. No publication, account change, registration or Build submission has occurred.
