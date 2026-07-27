BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'mecharoon_runtime'
  ) THEN
    CREATE ROLE mecharoon_runtime
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END;
$$;

ALTER ROLE mecharoon_runtime SET search_path = mecharoon, pg_catalog;
ALTER FUNCTION mecharoon.reject_append_only_mutation()
  SET search_path = pg_catalog;

REVOKE ALL ON SCHEMA mecharoon FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA mecharoon FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA mecharoon FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mecharoon FROM PUBLIC;

GRANT CONNECT ON DATABASE postgres TO mecharoon_runtime;
GRANT USAGE ON SCHEMA mecharoon TO mecharoon_runtime;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA mecharoon
  TO mecharoon_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mecharoon
  TO mecharoon_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA mecharoon
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA mecharoon
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA mecharoon
  REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA mecharoon
  GRANT SELECT, INSERT, UPDATE ON TABLES TO mecharoon_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA mecharoon
  GRANT USAGE, SELECT ON SEQUENCES TO mecharoon_runtime;

DO $$
DECLARE
  role_name text;
BEGIN
  FOR role_name IN
    SELECT rolname
    FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated', 'service_role')
    ORDER BY rolname
  LOOP
    EXECUTE format(
      'REVOKE ALL ON SCHEMA mecharoon FROM %I',
      role_name
    );
    EXECUTE format(
      'REVOKE ALL ON ALL TABLES IN SCHEMA mecharoon FROM %I',
      role_name
    );
    EXECUTE format(
      'REVOKE ALL ON ALL SEQUENCES IN SCHEMA mecharoon FROM %I',
      role_name
    );
    EXECUTE format(
      'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mecharoon FROM %I',
      role_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA mecharoon '
      'REVOKE ALL ON TABLES FROM %I',
      role_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA mecharoon '
      'REVOKE ALL ON SEQUENCES FROM %I',
      role_name
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA mecharoon '
      'REVOKE ALL ON FUNCTIONS FROM %I',
      role_name
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'mecharoon'
    ORDER BY tablename
  LOOP
    EXECUTE format(
      'ALTER TABLE mecharoon.%I ENABLE ROW LEVEL SECURITY',
      table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS mecharoon_runtime_full_access ON mecharoon.%I',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY mecharoon_runtime_full_access ON mecharoon.%I '
      'FOR ALL TO mecharoon_runtime USING (true) WITH CHECK (true)',
      table_name
    );
  END LOOP;
END;
$$;

COMMIT;
