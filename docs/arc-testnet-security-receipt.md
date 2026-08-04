# Arc Testnet ERC-8183 security receipt

Date: 2026-08-03  
Scope: `arc_testnet_erc8183_v0` only  
Status: code and mocked integration verified; live Circle transaction blocked on
project-specific testnet wallet credentials and funding.

## Fixed trust boundary

- Chain: Arc Testnet, chain ID `5042002`.
- RPC: `https://rpc.testnet.arc.io`.
- USDC: `0x3600000000000000000000000000000000000000`, 6 token decimals.
- ERC-8183 proxy: `0x0747EEf0706327138c69792bF28Cd525089e4583`.
- Roles: one fixed Circle buyer wallet, one fixed provider wallet, and one fixed
  evaluator wallet.
- Allowed calls, in order: `createJob`, USDC `approve`, `setBudget`, `fund`,
  `submit`, and `complete`.
- The provider sets the budget, matching the deployed reference contract's
  role check; the buyer creates and funds, and the evaluator completes.
- The browser and API caller cannot provide wallet IDs, addresses, chain,
  contract, function signature, or calldata.

Circle API key, entity secret, and wallet IDs are read only from server
environment variables. They are not stored in PostgreSQL, included in receipts,
logged, exposed through `NEXT_PUBLIC_*`, or accepted in request bodies.

## Live read-only verification

The Arc RPC returned chain ID `0x4cef52` (`5042002`) and non-empty bytecode for
the fixed ERC-8183 address. The EIP-1967 implementation slot resolved to
`0xA316fd02827242D537F84730F8a37D0BA5fd351a`. Arcscan identifies that verified
implementation as `AgenticCommerce`; its ABI exposes the six methods and
`getJob` used by the adapter. The proxy initializer identifies the same Arc
Testnet USDC address used by Circle's official contract-address documentation.

References:

- <https://ercs.ethereum.org/ERCS/erc-8183>
- <https://developers.circle.com/stablecoins/usdc-contract-addresses>
- <https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/create-developer-transaction-contract-execution>
- <https://testnet.arcscan.app/address/0x0747EEf0706327138c69792bF28Cd525089e4583>

## Verification gates

- Circle mutations use a deterministic UUIDv4 per instruction and step, so a
  local retry requests the original Circle transaction rather than a second
  economic effect.
- `$5.00` local cents (`500`) converts exactly to 6-decimal USDC atomic units
  (`5000000`). Floating-point values are never used.
- Every completed Circle step is fetched from Arc and checked for successful
  receipt status, caller address, target address, and function selector.
- Final confirmation additionally checks chain ID, payment token, job ID,
  client, provider, evaluator, description commitment, budget, Completed status,
  `JobCompleted`, and `PaymentReleased` amount/provider.
- Pending, failed, reverted, or missing evidence stays unknown and preserves
  reserved authority. Terminal field mismatch becomes manual review. Neither
  path creates a FinalReceipt or reputation event.
- The final receipt contains commitments and public chain evidence, never raw
  check output, Circle credentials, wallet IDs, or private evidence.

Automated evidence:

- `npm run check`: lint, TypeScript, 26 unit tests, 9 integration tests, 2
  concurrency tests, and production build.
- `npm run test:contracts`: reads the live Arc chain ID, payment token, proxy
  implementation slot, and bytecode, then runs 7 lifecycle/fuzz tests plus 2
  invariants over 64 generated action sequences (1,024 calls).
- `npm audit --omit=dev`: zero production vulnerabilities.

Arc USDC delegates state-changing transfers to a chain-specific system contract
that vanilla Foundry cannot execute. The lifecycle tests therefore preserve the
real deployed ERC-8183 proxy and implementation but replace only the USDC code
inside the local fork with a minimal test ERC-20. A funded live Circle run is
still required to verify the native USDC transfer boundary.

## Residual risk and live blocker

Update 2026-08-04: the first live Arc Testnet job completed end to end with
dedicated Circle testnet wallets. Job `167406`, `$5.00` (`5000000` atomic
USDC), six transactions from `createJob` through `complete`, completion
confirmed on-chain (status `0x1`); FinalReceipt read back from PostgreSQL and
archived at `docs/arc-first-live-receipt-2026-08-04.json.txt` (public chain
evidence only). The run also caught and fixed an adapter defect: the
job-ID parameter patch was overwriting the `approve` spender address
(`ABI_SIGNATURE_PARAMS_MISMATCH`); the failed instruction stayed correctly
quarantined and no funds moved, which exercised the fail-closed path with
real settlement for the first time. A regression assertion now pins every
step's first ABI parameter.

The paragraph below is the original pre-live note, kept for history:

No live Arc job was created in this change because no project-specific Circle
API key, entity secret, three Arc Testnet wallet IDs, or funded test-USDC wallet
set was supplied. Therefore there is no truthful Arc job ID, transaction hash,
balance delta, or Arcscan completion link yet.

Before recording or submission, run one fresh `$5` flow with dedicated testnet
wallets, verify balances before and after, replay the same instruction, and
read the FinalReceipt back from PostgreSQL. Do not enable mainnet or customer
funds; a production custody path requires a separate review.
