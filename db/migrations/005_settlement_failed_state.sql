-- A terminally failed Circle transaction (FAILED / DENIED / CANCELLED) is
-- pinned by its deterministic idempotency key and can never complete, so the
-- adapter now reports it as 'failed' and the operator routes the instruction
-- to manual review instead of leaving the reservation quarantined forever.
ALTER TABLE mecharoon.onchain_settlement_records
  DROP CONSTRAINT IF EXISTS onchain_settlement_records_state_check;
ALTER TABLE mecharoon.onchain_settlement_records
  ADD CONSTRAINT onchain_settlement_records_state_check
  CHECK (state IN ('unknown', 'confirmed', 'mismatch', 'failed'));
