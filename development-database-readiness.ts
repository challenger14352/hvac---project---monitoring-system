import type { RequestHandler } from "express";
import { checkDatabaseReadiness } from "./database-readiness";

const ownershipColumns = new Set(["customers.owner_id", "units.owner_id"]);
const repairAdvice =
  "Run npm run check:database to inspect the development schema. " +
  "Review scripts/repair-development-ownership.sql for a targeted development-only repair, " +
  "or npm run db:push for a reviewed full schema update. Verify the development database target first; " +
  "never use --force or truncate data. No repair or ownership assignment was performed. " +
  "After an explicit repair, retry the request. The local /connect tool remains available.";

// Development only: callers must not install this guard in production.
// Check again on requests so an explicit repair does not require a restart.
export function createDevelopmentDatabaseReadiness(
  check = checkDatabaseReadiness,
  warn: (message: string) => void = console.warn,
) {
  let lastWarning: string | undefined;
  async function inspect() {
    try {
      const result = await check();
      const missing = result.missing.filter(column => ownershipColumns.has(column));
      if (missing.length === 0) {
        lastWarning = undefined;
        return undefined;
      }
      const message = `Development database setup is incomplete. Missing ownership columns: ${missing.join(", ")}. ${repairAdvice}`;
      if (lastWarning !== message) warn(message);
      lastWarning = message;
      return { code: "DEVELOPMENT_DATABASE_SETUP_REQUIRED", message, missing };
    } catch {
      // Do not print connection strings or low-level connection errors.
      const message =
        "Development database readiness could not be checked. Verify the development database connection " +
        "and run npm run check:database. No data was changed. The local /connect tool remains available.";
      if (lastWarning !== message) warn(message);
      lastWarning = message;
      return { code: "DEVELOPMENT_DATABASE_UNAVAILABLE", message };
    }
  }

  const middleware: RequestHandler = async (_req, res, next) => {
    const problem = await inspect();
    if (problem) return res.status(503).json(problem);
    next();
  };
  return { inspect, middleware };
}
