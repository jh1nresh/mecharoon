# Arc Testnet live run — runbook

Goal: produce the first truthful Arc Testnet ERC-8183 FinalReceipt (real job
ID, transaction hashes, Arcscan links). Testnet only; tokens have no value.

## One manual step (founder)

Create a **testnet** API key in the Circle developer console
(<https://console.circle.com> → API Keys). Nothing else requires the console.

## Then, from the repo root

```bash
export CIRCLE_API_KEY=TEST_API_KEY:...        # never committed, never echoed
npm run arc:provision
```

`arc:provision` will:

1. Generate and register a `CIRCLE_ENTITY_SECRET` if one is not exported
   (prints it once; a recovery file is written to `.tmp/` — save both).
2. Create one wallet set and three EOA wallets on `ARC-TESTNET`
   (buyer, provider, evaluator).
3. Request faucet USDC for each wallet (buyer gets a second drip; it funds
   the $5 job and pays gas — Arc gas is USDC).
4. Print the exact `.env.local` block to append.

Append the printed block to `.env.local`, wait ~1 minute for the faucet
transactions, then:

```bash
npm run db:migrate   # if mecharoon_dev is not already migrated
npm run arc:live
```

`arc:live` seeds a namespaced golden scenario in local PostgreSQL, authorizes
a $5 work order, records `REVISE → PASS`, then drives the real six-step
sequence (`createJob → approve → setBudget → fund → submit → complete`)
through Circle on Arc Testnet. Unknown states stay quarantined; the script
polls `reconcile` every 8 s (15 min timeout — safe to rerun later; Circle
idempotency keys resume the same job). It exits by printing the FinalReceipt
JSON, which includes the Arc job ID, six-decimal USDC amount, wallet
addresses, transaction hashes, and Arcscan URL.

## After the first receipt

- Save the receipt JSON to `docs/` (it contains only public chain evidence).
- Update `docs/arc-testnet-security-receipt.md` ("no live job yet" is then
  stale).
- The landing proof chapter can then show the real receipt instead of only
  the adapter facts.

## Failure modes

- `ARC_EXECUTOR_NOT_CONFIGURED`: missing env var; recheck the printed block.
- Faucet not yet arrived: `arc:live` quarantines and times out — rerun once
  balances exist (Arcscan shows the wallet balances).
- Terminal mismatch → manual review: by design, nothing settles and no
  receipt is written; inspect the settlement observations table.
