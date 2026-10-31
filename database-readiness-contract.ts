// Keep this contract explicit: the regression test compares it with Drizzle's
// model metadata, independently of a configured or running database.
export const requiredColumns: Record<string, readonly string[]> = {
  users: ["id", "email", "first_name", "last_name", "profile_image_url", "created_at", "updated_at"],
  sessions: ["sid", "sess", "expire"],
  removed_accounts: ["id", "removed_at"],
  customers: ["id", "owner_id", "name", "location", "plan"],
  units: ["id", "owner_id", "customer_id", "name", "system_type", "timezone"],
  device_credentials: ["unit_id", "owner_id", "token_hash", "created_at", "revoked_at"],
  readings: ["unit_id", "ts", "key", "value"],
  diagnostics: ["unit_id", "ts", "metric", "value", "meta"],
  unit_status: ["unit_id", "updated_at", "health_score", "faults"],
  customer_archive_events: ["id", "customer_id", "archived_by", "archived_at"],
  account_settings: ["owner_id", "organization_name", "default_timezone", "refresh_seconds", "updated_at"],
  technicians: ["id", "owner_id", "name", "email", "phone", "notes", "is_active", "created_at", "updated_at"],
  bench_sessions: ["id", "owner_id", "unit_id", "name", "notes", "started_at", "ended_at", "created_at",
    "sample_count", "min_amps", "max_amps", "mean_amps", "source", "sensor", "calibration_status", "samples"],
};

// Fully qualified column -> reason it may be absent from the database.
// There are currently no exceptions: nullable/defaulted fields are still
// selected by the ORM, including users.* and removed_accounts.* in account
// resolution. Legacy sessions remain part of the preserved schema contract.
// Future exclusions must name individual columns and explain a runtime path
// that actually tolerates their absence; nullability alone is not sufficient.
export const optionalReadinessColumns: Record<string, string> = {};
