BEGIN;

CREATE SCHEMA IF NOT EXISTS mecharoon;

CREATE OR REPLACE FUNCTION mecharoon.reject_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;

CREATE TABLE IF NOT EXISTS mecharoon.participants (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('buyer', 'seller', 'system')),
  display_name text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS mecharoon.authority_grants (
  id text PRIMARY KEY,
  parent_id text REFERENCES mecharoon.authority_grants(id),
  principal_id text NOT NULL REFERENCES mecharoon.participants(id),
  delegate_id text NOT NULL REFERENCES mecharoon.participants(id),
  currency text NOT NULL CHECK (currency = 'USD'),
  domain text NOT NULL CHECK (domain = 'coding'),
  limit_minor bigint NOT NULL CHECK (limit_minor >= 0),
  reserved_minor bigint NOT NULL DEFAULT 0 CHECK (reserved_minor >= 0),
  settled_minor bigint NOT NULL DEFAULT 0 CHECK (settled_minor >= 0),
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  CHECK (reserved_minor + settled_minor <= limit_minor),
  CHECK (parent_id IS NOT NULL OR principal_id = delegate_id)
);

CREATE INDEX IF NOT EXISTS authority_grants_parent_idx
  ON mecharoon.authority_grants(parent_id);

CREATE TABLE IF NOT EXISTS mecharoon.work_orders (
  id text PRIMARY KEY,
  buyer_id text NOT NULL REFERENCES mecharoon.participants(id),
  seller_id text NOT NULL REFERENCES mecharoon.participants(id),
  authority_grant_id text NOT NULL REFERENCES mecharoon.authority_grants(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency = 'USD'),
  domain text NOT NULL CHECK (domain = 'coding'),
  task_ref text NOT NULL,
  acceptance_policy_id text NOT NULL,
  acceptance_policy_version integer NOT NULL CHECK (acceptance_policy_version > 0),
  acceptance_policy_hash text NOT NULL,
  required_checks jsonb NOT NULL,
  reputation_snapshot jsonb NOT NULL,
  route_code text NOT NULL,
  state text NOT NULL CHECK (
    state IN (
      'authorized',
      'provisional_revise',
      'final_pass',
      'settlement_unknown',
      'complete',
      'manual_review'
    )
  ),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS work_orders_seller_domain_idx
  ON mecharoon.work_orders(seller_id, domain);

CREATE TABLE IF NOT EXISTS mecharoon.reservations (
  id text PRIMARY KEY,
  work_order_id text NOT NULL UNIQUE REFERENCES mecharoon.work_orders(id),
  authority_grant_id text NOT NULL REFERENCES mecharoon.authority_grants(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  state text NOT NULL CHECK (
    state IN ('held', 'quarantined', 'settled', 'released', 'manual_review')
  ),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS mecharoon.submissions (
  id text PRIMARY KEY,
  work_order_id text NOT NULL REFERENCES mecharoon.work_orders(id),
  sequence integer NOT NULL CHECK (sequence > 0),
  artifact_ref text NOT NULL,
  artifact_sha256 text NOT NULL,
  normalized_check_results jsonb NOT NULL,
  request_hash text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (work_order_id, sequence)
);

CREATE TABLE IF NOT EXISTS mecharoon.verdicts (
  id text PRIMARY KEY,
  submission_id text NOT NULL UNIQUE REFERENCES mecharoon.submissions(id),
  evaluator_policy_hash text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('revise', 'pass')),
  reason_codes text[] NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS mecharoon.ledger_entries (
  id text PRIMARY KEY,
  event_id text NOT NULL,
  authority_grant_id text NOT NULL REFERENCES mecharoon.authority_grants(id),
  reservation_id text NOT NULL REFERENCES mecharoon.reservations(id),
  event_type text NOT NULL CHECK (event_type IN ('reserve', 'settle', 'release')),
  delta_reserved_minor bigint NOT NULL,
  delta_settled_minor bigint NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (event_id, authority_grant_id)
);

CREATE INDEX IF NOT EXISTS ledger_entries_authority_idx
  ON mecharoon.ledger_entries(authority_grant_id, created_at, id);

CREATE TABLE IF NOT EXISTS mecharoon.settlement_instructions (
  id text PRIMARY KEY,
  work_order_id text NOT NULL UNIQUE REFERENCES mecharoon.work_orders(id),
  reservation_id text NOT NULL UNIQUE REFERENCES mecharoon.reservations(id),
  adapter text NOT NULL CHECK (adapter = 'simulated_onchain_v0'),
  chain text NOT NULL CHECK (chain = 'simulated'),
  asset text NOT NULL CHECK (asset = 'USDC'),
  payer_id text NOT NULL REFERENCES mecharoon.participants(id),
  payee_id text NOT NULL REFERENCES mecharoon.participants(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  action text NOT NULL CHECK (action = 'pay'),
  policy_hash text NOT NULL,
  verdict_hash text NOT NULL,
  nonce text NOT NULL UNIQUE,
  adapter_audience text NOT NULL,
  expires_at timestamptz NOT NULL,
  instruction_hash text NOT NULL UNIQUE,
  simulated_signature text NOT NULL,
  state text NOT NULL CHECK (
    state IN ('instructed', 'submitted', 'unknown', 'confirmed', 'manual_review')
  ),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS mecharoon.onchain_settlement_records (
  id text PRIMARY KEY,
  instruction_id text NOT NULL REFERENCES mecharoon.settlement_instructions(id),
  adapter_event_id text NOT NULL UNIQUE,
  state text NOT NULL CHECK (state IN ('unknown', 'confirmed', 'mismatch')),
  tx_hash text,
  observed_amount_minor bigint,
  observed_asset text,
  observed_payer_id text,
  observed_payee_id text,
  observed_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS settlement_records_tx_hash_idx
  ON mecharoon.onchain_settlement_records(tx_hash)
  WHERE tx_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS mecharoon.final_receipts (
  id text PRIMARY KEY,
  work_order_id text NOT NULL REFERENCES mecharoon.work_orders(id),
  version integer NOT NULL CHECK (version > 0),
  receipt jsonb NOT NULL,
  receipt_hash text NOT NULL UNIQUE,
  supersedes_id text REFERENCES mecharoon.final_receipts(id),
  created_at timestamptz NOT NULL,
  UNIQUE (work_order_id, version)
);

CREATE TABLE IF NOT EXISTS mecharoon.reputation_events (
  id text PRIMARY KEY,
  final_receipt_id text NOT NULL UNIQUE REFERENCES mecharoon.final_receipts(id),
  subject_id text NOT NULL REFERENCES mecharoon.participants(id),
  transaction_role text NOT NULL CHECK (transaction_role = 'seller'),
  domain text NOT NULL CHECK (domain = 'coding'),
  evaluator_policy_hash text NOT NULL,
  proof_level text NOT NULL CHECK (proof_level = 'simulated_onchain_confirmed'),
  outcome text NOT NULL CHECK (outcome = 'pass'),
  revision_count integer NOT NULL CHECK (revision_count >= 0),
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS reputation_events_context_idx
  ON mecharoon.reputation_events(subject_id, domain, evaluator_policy_hash, created_at);

CREATE TABLE IF NOT EXISTS mecharoon.domain_events (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id text NOT NULL UNIQUE,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS domain_events_aggregate_idx
  ON mecharoon.domain_events(aggregate_type, aggregate_id, sequence);

CREATE TABLE IF NOT EXISTS mecharoon.idempotency_records (
  scope text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  response_status integer,
  response_body jsonb,
  resource_id text,
  created_at timestamptz NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (scope, key),
  CHECK (
    (response_status IS NULL AND response_body IS NULL AND completed_at IS NULL)
    OR
    (response_status IS NOT NULL AND response_body IS NOT NULL AND completed_at IS NOT NULL)
  )
);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ledger_entries',
    'onchain_settlement_records',
    'final_receipts',
    'reputation_events',
    'domain_events'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS reject_mutation ON mecharoon.%I',
      table_name
    );
    EXECUTE format(
      'CREATE TRIGGER reject_mutation BEFORE UPDATE OR DELETE ON mecharoon.%I '
      'FOR EACH ROW EXECUTE FUNCTION mecharoon.reject_append_only_mutation()',
      table_name
    );
  END LOOP;
END;
$$;

COMMIT;
