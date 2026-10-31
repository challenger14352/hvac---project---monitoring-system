import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, doublePrecision, timestamp, jsonb, primaryKey, foreignKey, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
import { isValidTimezone } from "./workspace";
import { DEFER_CUSTOMER_OWNER_FOREIGN_KEY } from "./ownership-publish-stage";
export * from "./workspace";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Null ownership archives records from deleted accounts and keeps unresolved records inaccessible.
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  location: text("location").notNull(),
  plan: text("plan").notNull().default("premium"),
}, (table) => [
  index("customers_owner_id_idx").on(table.ownerId),
  unique("customers_id_owner_id_unique").on(table.id, table.ownerId),
]);

export const customerArchiveEvents = pgTable("customer_archive_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  // Store the actor ID without a users foreign key so account removal does not erase audit attribution.
  archivedBy: varchar("archived_by").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("customer_archive_events_customer_id_idx").on(table.customerId),
  index("customer_archive_events_archived_at_idx").on(table.archivedAt),
]);

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, ownerId: true }).extend({
  name: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(240),
  plan: z.string().trim().min(1).max(40).optional(),
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const assignUnassignedCustomerSchema = z.object({
  accountId: z.string().trim().min(1),
}).strict();

export const units = pgTable("units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  // Duplicated from the owning customer so every unit query can enforce tenant scope directly.
  // The direct account link retains history and clears ownership on account deletion.
  // During the staged upgrade, application transactions synchronize customer ownership.
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  systemType: text("system_type").default("split_ac"),
  timezone: text("timezone").default("America/New_York"),
}, (table) => [
  index("units_owner_id_idx").on(table.ownerId),
  ...(!DEFER_CUSTOMER_OWNER_FOREIGN_KEY ? [foreignKey({
    columns: [table.customerId, table.ownerId],
    foreignColumns: [customers.id, customers.ownerId],
    name: "units_customer_owner_fk",
  }).onDelete("cascade").onUpdate("cascade")] : []),
]);

export const insertUnitSchema = createInsertSchema(units).omit({ id: true, ownerId: true }).extend({
  name: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(100).refine(isValidTimezone, "Invalid timezone").optional(),
  systemType: z.enum(["split_ac", "heat_pump", "package_unit"]).optional(),
});
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof units.$inferSelect;

// One active device per unit. Rotation replaces the hash, never the equipment.
export const deviceCredentials = pgTable("device_credentials", {
  unitId: varchar("unit_id").primaryKey().references(() => units.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

const deviceCurrent = z.number().finite().min(0).max(100);
// Only a measured CT current channel; never accept invented temperatures/status.
export const deviceReadingSchema = z.object({
  ts: z.string().datetime(),
  readings: z.union([
    z.object({ amp_blower: deviceCurrent }).strict(),
    z.object({ amp_condenser: deviceCurrent }).strict(),
  ]),
}).strict();
export type DeviceReading = z.infer<typeof deviceReadingSchema>;

export const readings = pgTable("readings", {
  unitId: varchar("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  key: text("key").notNull(),
  value: doublePrecision("value").notNull(),
}, (table) => [
  primaryKey({ columns: [table.unitId, table.ts, table.key] }),
]);

export const insertReadingSchema = createInsertSchema(readings).omit({});
export type InsertReading = z.infer<typeof insertReadingSchema>;
export type Reading = typeof readings.$inferSelect;

export const diagnostics = pgTable("diagnostics", {
  unitId: varchar("unit_id").notNull().references(() => units.id, { onDelete: "cascade" }),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  metric: text("metric").notNull(),
  value: doublePrecision("value").notNull(),
  meta: jsonb("meta").default({}),
}, (table) => [
  primaryKey({ columns: [table.unitId, table.ts, table.metric] }),
]);

export type Diagnostic = typeof diagnostics.$inferSelect;

export const unitStatus = pgTable("unit_status", {
  unitId: varchar("unit_id").primaryKey().references(() => units.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  healthScore: doublePrecision("health_score").notNull().default(100),
  faults: jsonb("faults").notNull().default({}),
});

export type UnitStatus = typeof unitStatus.$inferSelect;

export const ingestPayloadSchema = z.object({
  unitId: z.string().trim().min(1).max(128),
  ts: z.string().datetime().refine(value => new Date(value).getTime() <= Date.now() + 60_000, "Timestamp is in the future").optional(),
  readings: z.record(z.string().min(1).max(64), z.number().finite())
    .refine(value => Object.keys(value).length > 0 && Object.keys(value).length <= 32, "Provide between 1 and 32 readings"),
});

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;

export * from "./models/auth";

export const benchSessions = pgTable("bench_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
  unitId: varchar("unit_id").notNull().references(() => units.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 120 }).notNull(),
  notes: text("notes").notNull().default(""),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sampleCount: integer("sample_count").notNull(),
  minAmps: doublePrecision("min_amps").notNull(),
  maxAmps: doublePrecision("max_amps").notNull(),
  meanAmps: doublePrecision("mean_amps").notNull(),
  source: text("source").notNull().default("usb_web_serial"),
  sensor: text("sensor").notNull().default("SCT013_100A_1V"),
  calibrationStatus: text("calibration_status").notNull().default("UNCALIBRATED_BENCH"),
  samples: jsonb("samples").$type<import("./bench").BenchSample[]>().notNull(),
}, table => [index("bench_sessions_owner_unit_idx").on(table.ownerId, table.unitId, table.createdAt)]);
