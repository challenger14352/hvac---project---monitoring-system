import { sql } from "drizzle-orm";

// Independent removal markers survive deletion of the local account. Keep the
// same advisory lock protocol for JIT provisioning and direct SQL deletions.
export const accountRemovalSchema = sql.raw(`
  SELECT pg_advisory_xact_lock(hashtextextended('account-removal-schema', 0));
  CREATE TABLE IF NOT EXISTS removed_accounts (
    id varchar PRIMARY KEY,
    removed_at timestamp NOT NULL DEFAULT now()
  );
  CREATE OR REPLACE FUNCTION record_account_removal() RETURNS trigger
  LANGUAGE plpgsql AS $$
  BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(OLD.id, 0));
    EXECUTE format(
      'INSERT INTO %I.removed_accounts (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
      TG_TABLE_SCHEMA
    ) USING OLD.id;
    RETURN OLD;
  END;
  $$;
  CREATE OR REPLACE FUNCTION reject_removed_account() RETURNS trigger
  LANGUAGE plpgsql AS $$
  DECLARE removed boolean;
  BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id, 0));
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.removed_accounts WHERE id = $1)',
      TG_TABLE_SCHEMA) INTO removed USING NEW.id;
    IF removed THEN
      RAISE EXCEPTION 'Account has been removed'
        USING ERRCODE = '23514', CONSTRAINT = 'removed_account';
    END IF;
    RETURN NEW;
  END;
  $$;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'users'::regclass AND tgname = 'record_account_removal'
    ) THEN
      CREATE TRIGGER record_account_removal BEFORE DELETE ON users
      FOR EACH ROW EXECUTE FUNCTION record_account_removal();
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'users'::regclass AND tgname = 'reject_removed_account'
    ) THEN
      CREATE TRIGGER reject_removed_account BEFORE INSERT OR UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION reject_removed_account();
    END IF;
  END;
  $$;
`);

export function isRemovedAccountError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const dbError = error as { code?: string; constraint?: string; cause?: unknown };
  return (dbError.code === "23514" && dbError.constraint === "removed_account")
    || (dbError.cause !== undefined && isRemovedAccountError(dbError.cause));
}
