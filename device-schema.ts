import { sql } from "drizzle-orm";

// Additive and idempotent, like account-removal protection. Run before serving
// requests; never push or rewrite the existing customer/equipment/history schema.
export const deviceCredentialSchema = sql.raw(`
  SELECT pg_advisory_xact_lock(hashtextextended('device-credential-schema', 0));
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_attribute
      WHERE attrelid = to_regclass('units') AND attname = 'owner_id' AND NOT attisdropped)
      OR NOT EXISTS (SELECT 1 FROM pg_attribute
      WHERE attrelid = to_regclass('customers') AND attname = 'owner_id' AND NOT attisdropped)
      OR NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conrelid = to_regclass('units') AND conname = 'units_customer_owner_fk'
        AND contype = 'f' AND convalidated)
    THEN
      RAISE EXCEPTION 'Device ingestion requires the account ownership schema. Run npm run db:push before provisioning devices.'
        USING ERRCODE = '55000';
    END IF;
  END;
  $$;
  CREATE TABLE IF NOT EXISTS device_credentials (
    unit_id varchar PRIMARY KEY,
    owner_id varchar NOT NULL,
    token_hash varchar(64) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CONSTRAINT device_credentials_token_hash_unique UNIQUE (token_hash),
    CONSTRAINT device_credentials_unit_id_units_id_fk FOREIGN KEY (unit_id)
      REFERENCES units(id) ON DELETE CASCADE,
    CONSTRAINT device_credentials_owner_id_users_id_fk FOREIGN KEY (owner_id)
      REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE OR REPLACE FUNCTION revoke_device_on_owner_change() RETURNS trigger
  LANGUAGE plpgsql AS $$
  BEGIN
    IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
      EXECUTE format(
        'UPDATE %I.device_credentials SET revoked_at = now() WHERE unit_id = $1',
        TG_TABLE_SCHEMA
      ) USING OLD.id;
    END IF;
    RETURN NEW;
  END;
  $$;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'units'::regclass AND tgname = 'revoke_device_on_owner_change')
    THEN
      CREATE TRIGGER revoke_device_on_owner_change AFTER UPDATE OF owner_id ON units
        FOR EACH ROW EXECUTE FUNCTION revoke_device_on_owner_change();
    END IF;
  END;
  $$;
`);
