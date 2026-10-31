import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./models/auth";

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch { return false; }
}

export const workspaceSettingsSchema = z.object({
  organizationName: z.string().trim().max(120),
  defaultTimezone: z.string().trim().min(1).max(100).refine(isValidTimezone, "Use a valid IANA timezone, such as America/New_York."),
  refreshSeconds: z.union([z.literal(15), z.literal(30), z.literal(60)]),
}).strict();

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;
export const defaultWorkspaceSettings: WorkspaceSettings = {
  organizationName: "",
  defaultTimezone: "America/New_York",
  refreshSeconds: 15,
};

export const accountSettings = pgTable("account_settings", {
  ownerId: varchar("owner_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  organizationName: varchar("organization_name", { length: 120 }).notNull().default(""),
  defaultTimezone: varchar("default_timezone", { length: 100 }).notNull().default("America/New_York"),
  refreshSeconds: integer("refresh_seconds").notNull().default(15),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const technicianFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().max(254).refine(value => !value || z.string().email().safeParse(value).success, "Enter a valid email address."),
  phone: z.string().trim().max(40),
  notes: z.string().trim().max(1000),
});
export const createTechnicianSchema = technicianFieldsSchema.extend({
  email: technicianFieldsSchema.shape.email.default(""),
  phone: technicianFieldsSchema.shape.phone.default(""),
  notes: technicianFieldsSchema.shape.notes.default(""),
}).strict();
export const updateTechnicianSchema = technicianFieldsSchema.extend({
  isActive: z.boolean(),
}).partial().strict().refine(value => Object.keys(value).length > 0, "Provide at least one change.");
export type NewTechnician = z.infer<typeof createTechnicianSchema>;
export type TechnicianChanges = z.infer<typeof updateTechnicianSchema>;

// A private contact roster, not authentication identities or permission grants.
export const technicians = pgTable("technicians", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull().default(""),
  phone: varchar("phone", { length: 40 }).notNull().default(""),
  notes: text("notes").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("technicians_owner_id_idx").on(table.ownerId)]);
