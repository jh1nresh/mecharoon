# Mecharoon

**The AI hardware wallet for autonomous actors.**

Mecharoon is a hardware-backed authority and proof agent. It lets a human,
organization, AI agent, robot, or other autonomous machine hold a
hardware-bound identity, control assets, delegate bounded capabilities, and
produce verifiable receipts for consequential actions.

The long-term product is not only a payment wallet. It is a hardware root for
four separable concerns:

- **Identity:** which autonomous actor and device executed the action;
- **Authority:** which policy, capability, amount, counterparty, and time
  boundary allowed it;
- **Assets:** which wallet, account, payment rail, or resource it could control;
- **Governance:** how its policy can be upgraded, recovered, revoked, or
  terminated.

An agent may itself be the operational root and issue attenuated capabilities
to child agents or machines. A human does not have to sit at the top of every
tree. Self-sovereign roots still require an explicit governance constitution,
recovery path, or threshold policy so the same agent cannot silently rewrite
its constraints, execute an action, and declare itself correct.

See [the hardware authority architecture](docs/hardware-authority-wallet.md)
for the product boundary and node model.

## Current software proof

**Verify agent work. Then pay.**

Mecharoon verifies agent work offchain and authorizes only approved value for
onchain settlement. Each finalized receipt updates contextual reputation,
setting the agent’s next limit and routing. This MVP uses a simulated
settlement adapter; no real funds move.

This repository currently proves software invariants around delegated
authority, atomic reservation, settlement reconciliation, and replayable
receipts. It does **not** yet contain a secure element, production signer,
device attestation, robot integration, custom hardware, or real asset custody.

The first wedge is verified settlement for external agent work: a buyer
delegates bounded authority and creates a frozen WorkOrder; Mecharoon reserves
the budget, evaluates committed evidence, quarantines uncertain settlement,
and reconciles the adapter result into a replayable receipt.

## What this MVP proves

This repository contains three deliberately separate proof surfaces:

- The public [hosted walkthrough](https://mecharoon.vercel.app/demo) steps
  through fixed illustrative data in the browser. It makes no API calls, uses
  no database or wallet, and moves no funds.
- The local sandbox runs the same golden loop against PostgreSQL and reads the
  result back from the database.
- The optional invite-only hosted sandbox runs that fixed loop through one
  token-gated API against managed PostgreSQL. It has database-backed
  idempotency, a rolling run limit, and an audit row, but still uses simulated
  settlement and moves no funds.

The deterministic golden loop is:

```text
$20 root authority
→ $15 child grant
→ $8 denied for a new seller
→ $5 reserved atomically
→ first artifact REVISE
→ corrected artifact PASS
→ simulated settlement becomes unknown
→ the full $5 remains quarantined
→ reconciliation confirms simulated finality
→ FinalReceipt + contextual reputation
→ next cap rises from $5 to $10
→ a second $8 WorkOrder is authorized
```

Implemented:

- PostgreSQL authority, reservation, work, settlement, receipt, and reputation
  records.
- Root-to-leaf row locking so concurrent child reservations cannot exceed an
  ancestor budget.
- Request-hash idempotency for every mutation.
- Deterministic coding evaluation with `REVISE → PASS`.
- Reservation-bound simulated onchain settlement instructions.
- `unknown` quarantine and explicit reconciliation.
- Append-only ledger entries, settlement observations, FinalReceipts,
  reputation events, and domain events.
- Separate buyer, seller, evaluator, and settlement-operator API identities.
- A `/demo` page that is an explicitly illustrative walkthrough in production
  by default, becomes the PostgreSQL-backed runner in authorized local demo
  mode, and can use the invite-only hosted endpoint when explicitly enabled.
- One fixed `POST /api/v0/sandbox/runs` workflow for a single design partner,
  with a distinct bearer key, top-level idempotency, quota, and run audit state.

Not implemented:

- A blockchain RPC, smart contract, wallet, signer, or real USDC transfer.
- General production authentication, tenant isolation, custody, issuing, or
  compliance controls. The hosted sandbox is one manually configured partner,
  not a self-serve or multi-tenant product.
- Multiple rails, chains, currencies, evaluator marketplaces, or portable
  global reputation.

The word `onchain` in this MVP always means the deterministic
`simulated_onchain_v0` adapter. No real funds move.

## Architecture boundary

```text
offchain
  authority → reservation → WorkOrder → evidence → verdict
                                                    │
                                                    ▼
                                      settlement instruction
                                                    │
simulated onchain adapter                           ▼
                                      unknown / confirmed
                                                    │
offchain                                            ▼
                                 reconcile → FinalReceipt
                                           → ReputationView
```

Only the asset-settlement adapter is intended to become onchain. Work,
evidence, policy, receipts, and contextual reputation remain offchain.

## Run locally

Requirements:

- Node.js 20+
- PostgreSQL 14+

Create the two local databases:

```bash
createdb mecharoon_dev
createdb mecharoon_test
```

Install, configure, and migrate:

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed
```

Generate a different token for each role and replace the five placeholders in
`.env.local`:

```bash
openssl rand -hex 32
```

Run that command once per token. Reusing one token for multiple roles fails
closed. Then start the loopback-only development server:

```bash
npm run dev
```

Open:

- Landing page: <http://localhost:3000>
- Walkthrough or database-backed proof: <http://localhost:3000/demo>
- Health response: <http://localhost:3000/api/v0/health>

The one-click demo route requires `MECHAROON_DEMO_MODE=true`, a separately
generated `MECHAROON_DEMO_TOKEN`, and the same token entered in the demo page.
It refuses to run when `NODE_ENV=production` or the request is not a same-origin
localhost request.

You can also run the flow from the terminal:

```bash
npm run demo:run
```

## Invite-only hosted sandbox

The hosted path is deliberately narrower than the role APIs. The caller cannot
choose an amount, participant, evidence result, or settlement scenario. One
authorized request always runs the fixed golden workflow and returns its real
PostgreSQL-backed result:

```bash
curl -sS https://your-sandbox.example/api/v0/sandbox/runs \
  -X POST \
  -H "Authorization: Bearer $MECHAROON_SANDBOX_TOKEN" \
  -H "Idempotency-Key: demo-recording-001"
```

The success response uses the regular service envelope, with the demo result
under `resource`. Reusing the same idempotency key returns the same run and
receipt without creating another economic effect.

Before enabling it:

1. Provision a dedicated managed PostgreSQL database and require TLS with
   certificate verification.
2. Set `MECHAROON_DATABASE_URL` without SSL query parameters, set the
   provider CA PEM in `MECHAROON_DATABASE_CA_CERT`, and run
   `npm run db:migrate` against that database.
3. Set `MECHAROON_HOSTED_SANDBOX_MODE=true`, one lowercase
   `MECHAROON_SANDBOX_PARTNER_ID`, and a distinct random
   `MECHAROON_SANDBOX_TOKEN` of at least 32 characters.
4. Optionally set `MECHAROON_SANDBOX_DAILY_RUN_LIMIT` from 1 to 100; the
   default is 20 runs per rolling 24 hours.
5. Leave the buyer, seller, evaluator, operator, and local demo tokens unset in
   the hosted deployment. The fixed workflow does not expose or require them.

The invite key is entered into `/demo` and retained only in that browser tab's
component memory. There is no CORS opt-in, wallet, blockchain RPC, or real
asset movement.

## API v0

All mutation endpoints require `Idempotency-Key`. Tokens are scoped by role:

| Endpoint | Role | Purpose |
| --- | --- | --- |
| `POST /api/v0/work-orders` | buyer | Reserve authority and create a WorkOrder |
| `GET /api/v0/work-orders/:id` | buyer, seller, evaluator, operator | Inspect work state |
| `POST /api/v0/work-orders/:id/submissions` | evaluator | Commit artifact evidence and run the declared deterministic policy |
| `POST /api/v0/settlements/:id/execute` | operator | Execute the simulated adapter |
| `POST /api/v0/settlements/:id/reconcile` | operator | Resolve an unknown observation |
| `GET /api/v0/work-orders/:id/receipt` | buyer, seller, operator | Read the FinalReceipt |
| `GET /api/v0/authorities/:id/exposure` | scoped participant, operator | Read reserved and settled exposure |
| `GET /api/v0/reputation/:subjectId` | scoped participant, operator | Derive contextual reputation |
| `POST /api/v0/sandbox/runs` | invite-only partner | Run the fixed PostgreSQL-backed recording workflow |

The seller token cannot self-approve work. In v0, a separate evaluator identity
receives the artifact through the surrounding workflow, commits its reference
and hash, and supplies normalized check results to the declared deterministic
policy. An untrusted artifact-upload service and production CI attestation are
deliberately out of scope.

Create a `$5` work order after `npm run db:seed`:

```bash
curl -sS http://localhost:3000/api/v0/work-orders \
  -H "Authorization: Bearer $MECHAROON_BUYER_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: readme-work-1' \
  --data '{
    "buyer_id": "participant_demo_buyer",
    "seller_id": "participant_demo_seller",
    "authority_grant_id": "authority_demo_child",
    "amount_minor": "500",
    "task_ref": "demo://readme/task-1",
    "required_checks": ["lint", "unit"]
  }'
```

Money is always an integer minor-unit string at the API boundary. `$5.00` is
`"500"`; floats are rejected.

## Verify

The test reset helper refuses to touch any database except
`mecharoon_test`.

```bash
npm run check
npm audit --omit=dev
npm run brand:export
```

The suite covers:

- bigint-safe amounts and deterministic hashing;
- `REVISE → PASS → unknown → confirmed`;
- no receipt or reputation before confirmed reconciliation;
- mismatched settlement remaining reserved for manual review;
- 50 concurrent unique reservation attempts without ancestor overspend;
- 50 concurrent identical idempotency keys producing one economic effect;
- hosted sandbox authentication, replay, rolling quota, hashed request keys,
  and final database exposure;
- append-only mutation rejection and receipt privacy.

## Deployment gate

The fixed walkthrough remains the default production surface. The code also
contains a single-partner hosted sandbox suitable for an invite-only demo after
a managed database, migration, and deployment secret are configured. This
repository change does not provision that database, set a secret, enable the
mode, merge, or deploy it.

Do not present the hosted sandbox as a money-moving service or a multi-tenant
production API. The local demo runner must remain disabled in production. A
real-money pilot additionally needs tenant isolation, customer-controlled
connectors, provider fetch-back, webhook verification, hard aggregate caps,
incident controls, legal review, and an independent security review.

## Brand assets

The logo, standalone symbols, micro marks, banners, PNG exports, and portable
ZIP package live under `public/brand/`. Run `npm run brand:export` to rebuild
the raster package from the versioned SVG masters.
