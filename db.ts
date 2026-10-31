import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
// pg removes a disconnected idle client itself, but emits an error on the pool.
// Without a listener that event terminates the whole server, including public
// local USB tools. Active queries still reject normally; never bypass security
// initialization or account checks when the database is unavailable.
pool.on("error", () => {
  console.error("An idle database connection was lost. Database requests may be unavailable; public local USB tools remain available.");
});
export const db = drizzle(pool, { schema });
