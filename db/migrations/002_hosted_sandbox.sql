BEGIN;

CREATE TABLE IF NOT EXISTS mecharoon.sandbox_runs (
  id text PRIMARY KEY,
  partner_id text NOT NULL,
  idempotency_key_hash text NOT NULL,
  request_hash text NOT NULL,
  namespace text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('running', 'complete', 'failed')),
  result jsonb,
  failure_reason_code text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  completed_at timestamptz,
  UNIQUE (partner_id, idempotency_key_hash),
  CHECK (
    (
      status = 'running'
      AND result IS NULL
      AND failure_reason_code IS NULL
      AND completed_at IS NULL
    )
    OR (
      status = 'complete'
      AND result IS NOT NULL
      AND failure_reason_code IS NULL
      AND completed_at IS NOT NULL
    )
    OR (
      status = 'failed'
      AND result IS NULL
      AND failure_reason_code IS NOT NULL
      AND completed_at IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS sandbox_runs_partner_created_idx
  ON mecharoon.sandbox_runs(partner_id, created_at DESC);

COMMIT;
