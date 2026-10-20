# Security, permissions and honest evidence

Status: security requirements for the implementation in progress. Offline trust-boundary tests exist; no independent audit, real wallet configuration, authentication signature or transaction has been performed for ForkTrade.

## Trust boundaries

User-entered theses, public cards, client request bodies, wallet events, RPC/indexer responses and external pages are untrusted inputs. Validate structure, identity, freshness and permissions before using them. The server may authenticate ownership and persist plans but must not hold a trading private key, seed phrase, custodial balance or authority to trade for a user.

Use the user's supported wallet for explicitly approved operations. The SDK's private-key bot example is not the web app's signing design. Do not commit a key, put one in a `NEXT_PUBLIC_*` variable, ask the user to paste one into chat, or create a server hot wallet to avoid a browser integration blocker. Session/operator-key delegation is outside v1 unless separately designed, reviewed and authorized.

## Permission model

| Action | Required authority |
| --- | --- |
| View a deliberately public card | Public projection only |
| Save/edit/read a private plan | Authenticated owner session; server-side owner check |
| Authenticate wallet ownership | Explicit user-permitted, clearly explained domain/nonce/expiry-bound challenge; no transaction authority |
| Preview | Owner context and fresh verified reads; no signing side effects |
| Submit an order | Separate live-session authorization plus explicit approval of the final payload and user's wallet action |
| Remix | Visible source version plus new owner's draft; no inherited authority |
| Publish/unpublish | Owner's explicit field selection and confirmed public preview |
| Funding, claims, allowances, delegation, cancellation or position close | Separate specific authorization; never implicit in an order approval |
| Deployment, public repo/judge access, posts, submission or disclosure | Separate user authorization for the concrete external action |

The user invoked GOAL on 2026-10-20, authorizing local implementation within AGENTS.md boundaries, and requested commit/push after each verified update. No live action is authorized. Missing permissions must stop the dependent flow without stopping independent offline work or marking the goal complete.

## Ownership and private data

Wallet connection only identifies a currently selected address; it is not proof of ownership for server access. Verify a structured challenge with domain, URI/audience, chain, one-time cryptographic nonce, issued/expiration times and replay protection. Validate the actual signer and session binding. Use an established, verified signature-validation approach and handle supported contract wallets explicitly or declare them unsupported; do not pretend arbitrary signature recovery proves every wallet type.

Use secure session cookies, appropriate SameSite/HttpOnly/Secure controls, CSRF protection, rate limiting and server-side authorization for every mutation and private read. Bind plans and execution requests to the session owner. Defend against guessed IDs, cross-owner updates, client-supplied owner fields, concurrent edit races and leaked source-version access.

Treat thesis text as plain text or sanitized safe Markdown. Prevent script/HTML injection in editor previews, share cards, links and metadata. Do not fetch arbitrary user URLs server-side for previews. Verify any external explorer link against an approved origin for the actual chain rather than accepting a user-provided transaction URL.

## Order safety and uncertainty

Require exact decimal parsing, metadata checks, tick/lot/minimum validation and user-reviewed caps. Show owner, signer role, chain, pool/market and all economic payload fields. Confirm active wallet context immediately before signing; a network/account/parameter change invalidates approval. Do not silently correct price/quantity, use maximum leverage or perform automatic network changes.

Persist a durable one-use approval/request before the wallet call. UI locks alone do not prevent cross-tab or retry duplication. Timeouts and lost responses may hide an already broadcast call. Reconcile its original identity; do not send again merely because a button re-enabled. If protocol correlation is unavailable, state the limitation and keep the request unknown. A retry or cleanup action needs appropriate new review/authorization; it is not a routine read.

Separate transaction submission/confirmation/revert from order acceptance/open/partial/fill/cancellation/rejection. A hash alone is not success. Verify receipt identity and the meaning of protocol events/snapshots. Handle indexer lag, reorgs, removed open orders and incomplete history conservatively. Record as-of/source/block facts and mark gaps. No invented replay or stale green status.

## Publication and redaction

Use an explicit server-side allowlist for public records. Default drafts, account risk notes, full account positions/balances, auth data, raw errors and diagnostic payloads to private. Give the owner an exact public preview. Transaction links can reveal the full address and other public activity even when the card truncates it; explain that before publication. Without enough disclosed evidence, do not label a receipt independently verified.

Inspect all public channels: rendered HTML, route JSON, page metadata, URLs, error pages, server/client logs, telemetry, screenshots, videos, future image exports and caches. Avoid serializing a private ORM object. Use publication-revision-aware caching or no caching and invalidate on unpublish. Unpublish controls future app delivery but cannot erase copied screenshots, shared content or public chain records.

Never log raw private keys, seeds, tokens, cookies, auth challenges/signatures, wallet request payloads containing secrets, or complete environment dumps. Use minimal structured redacted diagnostics with nonsecret request IDs. Test redaction with synthetic canaries. Do not store real secrets as test fixtures. In the future implementation, add appropriate ignore rules before local env/DB artifacts exist; ignore files are not protection against a secret already committed.

## Threat-to-test map

| Threat | Main defenses | Acceptance IDs |
| --- | --- | --- |
| Duplicate order after click/timeout/crash | Durable identity, one-use claim, reconciliation, no blind retry | W05, W07, R04 |
| Wrong account/chain or stale approval | Context binding, generation checks, revalidation | N04, W04, W06, S02 |
| Precision/size error | Exact units, tick/lot/minimum and bounded size | N01-N04 |
| Forged successful receipt | Server identity checks, orthogonal states, source coverage | R01-R07 |
| Cross-owner edits or challenge replay | Ownership verification, scoped queries, nonce/session/CSRF checks | A01-A02, W02 |
| Forged remix provenance | Server-derived root/source/depth, exact version pin, computed diffs | L01-L03 |
| Draft/secret leak through sharing | Explicit allowlist, output review, cache invalidation, redaction | P01-P03, S01 |
| Fixtures passed off as live evidence | Mode separation and evidence provenance | S02, G2-G4 |

## Safe disclosure and incident handling

Security vulnerabilities must **not** be added to the public repository, ordinary feedback reports, GitHub issues, X drafts or public demo evidence. As the repository may later become accessible to judges or public, keep sensitive details outside Git entirely. Record only a nonsensitive blocked/private-review marker if needed.

Prepare a minimal private disclosure for **security@dreamdex.io**, review redactions and scope with the user, and send only after explicit user approval. This document does not authorize email. Do not publish proof-of-exploit details or conduct harmful exploitation; reproduce only within authorized test scope.

If a secret is exposed, stop using/sharing it, tell the user the exact exposure and affected location without repeating the secret, and prepare remediation. Rotation/revocation and history changes require the appropriate authority; deleting one working-tree file does not remove Git history or copies. Preserve honest incident/evidence status, and continue unrelated safe work.

No audit badge, safety guarantee, real-profit claim or guaranteed outcome belongs in the product or submission. Testing lowers uncertainty; it does not eliminate trading or protocol risk.
