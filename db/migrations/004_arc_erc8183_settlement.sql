BEGIN;

ALTER TABLE mecharoon.settlement_instructions
  DROP CONSTRAINT IF EXISTS settlement_instructions_adapter_check,
  DROP CONSTRAINT IF EXISTS settlement_instructions_chain_check;

ALTER TABLE mecharoon.settlement_instructions
  ADD CONSTRAINT settlement_instructions_adapter_check
    CHECK (adapter IN ('simulated_onchain_v0', 'arc_testnet_erc8183_v0')),
  ADD CONSTRAINT settlement_instructions_chain_check
    CHECK (chain IN ('simulated', 'arc_testnet'));

ALTER TABLE mecharoon.settlement_instructions
  ALTER COLUMN simulated_signature DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS authorization_commitment text,
  ADD COLUMN IF NOT EXISTS deliverable_hash text,
  ADD COLUMN IF NOT EXISTS payer_address text,
  ADD COLUMN IF NOT EXISTS payee_address text,
  ADD COLUMN IF NOT EXISTS evaluator_address text,
  ADD COLUMN IF NOT EXISTS contract_address text,
  ADD COLUMN IF NOT EXISTS external_job_id text;

UPDATE mecharoon.settlement_instructions
SET
  authorization_commitment = COALESCE(authorization_commitment, simulated_signature),
  deliverable_hash = COALESCE(deliverable_hash, repeat('0', 64))
WHERE authorization_commitment IS NULL OR deliverable_hash IS NULL;

ALTER TABLE mecharoon.settlement_instructions
  ALTER COLUMN authorization_commitment SET NOT NULL,
  ALTER COLUMN deliverable_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS settlement_instructions_arc_job_idx
  ON mecharoon.settlement_instructions(adapter, external_job_id)
  WHERE adapter = 'arc_testnet_erc8183_v0' AND external_job_id IS NOT NULL;

ALTER TABLE mecharoon.onchain_settlement_records
  ADD COLUMN IF NOT EXISTS observed_amount_atomic text,
  ADD COLUMN IF NOT EXISTS observed_payer_address text,
  ADD COLUMN IF NOT EXISTS observed_payee_address text,
  ADD COLUMN IF NOT EXISTS observed_evaluator_address text,
  ADD COLUMN IF NOT EXISTS observed_chain_id bigint,
  ADD COLUMN IF NOT EXISTS observed_contract_address text,
  ADD COLUMN IF NOT EXISTS external_job_id text,
  ADD COLUMN IF NOT EXISTS external_status text,
  ADD COLUMN IF NOT EXISTS explorer_url text,
  ADD COLUMN IF NOT EXISTS transaction_hashes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE mecharoon.reputation_events
  DROP CONSTRAINT IF EXISTS reputation_events_proof_level_check;

ALTER TABLE mecharoon.reputation_events
  ADD CONSTRAINT reputation_events_proof_level_check
    CHECK (proof_level IN ('simulated_onchain_confirmed', 'arc_testnet_erc8183_confirmed'));

COMMIT;
