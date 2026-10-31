import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Preserved legacy session storage. Clerk now owns active sessions.
// Do not drop this table or its schema declaration during auth migration.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Local application accounts and ownership FK targets. Clerk owns identity.
// Preserve existing IDs, nullable identity columns, and all referencing FKs.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Kept independently of users so deleting an account cannot enable re-registration.
export const removedAccounts = pgTable("removed_accounts", {
  id: varchar("id").primaryKey(),
  removedAt: timestamp("removed_at").defaultNow().notNull(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
