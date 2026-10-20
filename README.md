# ForkTrade

**Current state: documentation only. The application is unbuilt.** No packages have been installed for this project, no wallet has been configured, and no orders, demo runs, feedback findings, or bounty submissions have been produced.

ForkTrade is a proposed dreamDEX Perps testnet entry for the MVP and Feedback tracks: write a trade thesis, approve an explicit order, share a card with honest execution evidence, and let another person remix the thesis into an independently approved order. The useful difference is the social remix and its evidence, rather than another maker, funding, guard, or TP/SL bot.

## Start a future Codex implementation run

1. Clone this **private** repository into a dedicated working directory and open it in Codex. Use the `main` branch as the documentation baseline; inspect existing changes before editing.
2. Read [AGENTS.md](AGENTS.md), then [GOAL.md](GOAL.md). Copy the entire fenced objective in GOAL.md into a new Codex goal in this repository. The objective authorizes the future local implementation, not financial or publication actions.
3. Have Codex complete the source and environment verification milestone in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), then build the narrow offline path. Record exact versions, choices, checks, and blockers in its progress ledger.
4. When the local app exists, follow the run commands that the implementation adds here. **There is currently no `package.json`, install command, development server, or application test suite to run.** Do not interpret the proposed commands below as already working.
5. Review the completed preview before authorizing any wallet interaction or actual testnet order. Live acceptance remains blocked until the user separately permits the required actions and approves each final order.

Proposed baseline: a single Next.js/React TypeScript app, Tailwind CSS, a small SQLite database with Drizzle, Zod validation, viem and an EIP-1193 wallet interface, and a narrow adapter around the official markets SDK. Vitest and Playwright cover the eventual code. Nothing in this baseline is installed or version-pinned yet; verify current official compatibility during milestone M0.

Expected **future** local commands after scaffolding and scripts exist:

```powershell
npm ci
npm run db:migrate
npm run dev
# Separate check session:
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

The implementation must supply these scripts, document the Node version, local database location, environment variables, offline fixture mode, and read-only/live-mode controls. Until then the commands are a contract for the future run, not a claim of successful execution. Local operation is the default; deployment requires separate authorization.

## The experience to ship first

1. Choose one verified, available perps testnet market and one limit order with GTC time in force.
2. Save a versioned thesis and order plan; preview fresh market and account data, bounds, costs, and risk.
3. The user reviews the exact account, chain, market, side, price, quantity, and other economic fields, then explicitly approves their own testnet order.
4. Reconcile submission, chain confirmation, order acceptance, and fill state separately. Show partial, cancelled, rejected, unavailable, and unknown outcomes honestly.
5. Publish selected nonsecret fields to a shareable card only after an explicit publication choice.
6. A viewer creates a one-level independent remix, sees parameter differences and lineage, reviews fresh conditions, and separately approves their own order.

The initial market is selected from live metadata at M0; a familiar symbol is a candidate, not a hardcoded address or eligibility promise. Limit/GTC is the proposed single order type because it makes an explicit price and resting status visible. If current SDK support or liquidity makes it unsuitable, record a bounded alternative before implementing it. Do not add multiple order types to solve the decision.

## Guide map

| File | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Repository rules, authorization gates, and evidence discipline |
| [GOAL.md](GOAL.md) | One copy-paste implementation objective |
| [PRODUCT.md](PRODUCT.md) | Scope, screens, copy, and product behavior |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Proposed components, records, state machines, and integration seams |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Milestones, dependencies, status ledger, and resume procedure |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Required tests, live evidence, and completion gates |
| [SECURITY.md](SECURITY.md) | Trust boundaries, ownership, privacy, signing, and disclosure |
| [DEMO.md](DEMO.md) | Honest demo script and evidence checklist |
| [BOUNTY.md](BOUNTY.md) | Track requirements, deadlines, and submission gates |
| [SOURCES.md](SOURCES.md) | Source provenance, dated facts, and unresolved environment questions |
| [feedback/README.md](feedback/README.md) | Reproducible feedback workflow and hypothesis backlog |
| [feedback/REPORT_TEMPLATE.md](feedback/REPORT_TEMPLATE.md) | Blank template for a real nonsecurity issue |

## Boundaries and current readiness

No autonomous copy-trading, pooled custody, full social feed, profit leaderboard, AI trading decisions, guaranteed returns, or guaranteed bounty win claims. Testnet paper funds and simulated outcomes are not real profit. Optional AI may only draft structured intent for human review after the core path works.

The repository stays private. Public/judge access, deployment, X posts, bounty submission, wallet setup, funding/claims/approvals, testnet transactions, and mainnet work each require appropriate later authorization. The whitelist/application invitation is access, not an award guarantee. See [BOUNTY.md](BOUNTY.md) for the distinction between app completion and submission readiness.

Documentation checks can establish that the guide is internally consistent and Markdown-only. They cannot establish SDK compatibility, a working app, live order acceptance, fill success, eligibility, or an accepted report. All implementation and live-test gates currently remain open in the progress ledger.
