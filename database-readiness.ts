import type { RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requiredColumns } from "./database-readiness-contract";

// Read-only preflight: production DDL belongs to the publishing schema-diff flow.
export async function checkDatabaseReadiness(database: typeof db = db) {
  const result = await database.execute(sql`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  const available = new Set(result.rows.map(row => `${row.table_name}.${row.column_name}`));
  const missing = Object.entries(requiredColumns)
    .flatMap(([table, columns]) => columns.map(column => `${table}.${column}`))
    .filter(column => !available.has(column));
  return { ready: missing.length === 0, missing };
}

// Public health responses deliberately omit schema names and error details.
export function createDatabaseHealthHandler(check = checkDatabaseReadiness): RequestHandler {
  return async (_req, res) => {
    try {
      const readiness = await check();
      return res.status(readiness.ready ? 200 : 503).json({
        status: readiness.ready ? "ready" : "setup_required",
      });
    } catch {
      return res.status(503).json({ status: "unavailable" });
    }
  };
}
