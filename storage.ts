import { eq, desc, gte, asc, sql, and, inArray, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  customers, customerArchiveEvents, units, readings, diagnostics, unitStatus, users,
  type Customer, type InsertCustomer,
  type Unit, type InsertUnit,
  type Reading, type UnitStatus, type Diagnostic,
} from "@shared/schema";
import { isFreshTelemetry } from "@shared/telemetry-quality";

// Both fleet and customer summaries must use the same evidence threshold as
// the equipment screen, rather than treating stale/incomplete rows as healthy.
const currentHealthEvidence = sql`
  us.updated_at >= NOW() - INTERVAL '10 minutes'
  AND us.updated_at <= NOW() + INTERVAL '1 minute'
  AND us.faults->'data_quality'->>'complete' = 'true'
  AND (
    SELECT COUNT(DISTINCT r.key) FROM readings r
    WHERE r.unit_id = u.id
      AND r.ts >= NOW() - INTERVAL '10 minutes'
      AND r.ts <= NOW() + INTERVAL '1 minute'
      AND r.key IN ('temp_return_f','temp_supply_f','amp_blower','amp_condenser','dp_filter_pa','call_y')
  ) = 6
`;

export interface IStorage {
  getCustomers(ownerId: string): Promise<(Omit<Customer, "ownerId"> & { unitCount: number; healthScore: number | null })[]>;
  getCustomer(id: string, ownerId: string): Promise<Omit<Customer, "ownerId"> | undefined>;
  createCustomer(c: InsertCustomer, ownerId: string): Promise<Omit<Customer, "ownerId">>;
  archiveCustomer(id: string, ownerId: string, actorId: string): Promise<boolean>;
  getCustomerArchiveEvents(): Promise<{ customerId: string; archivedBy: string; archivedAt: Date }[]>;
  getUnassignedCustomers(): Promise<{
    id: string;
    name: string;
    location: string;
    plan: string;
    units: { id: string; name: string; systemType: string | null; timezone: string | null; ownershipStatus: "unassigned" | "conflict" }[];
  }[]>;
  getAccountChoices(): Promise<{ id: string; email: string | null; firstName: string | null; lastName: string | null }[]>;
  assignUnassignedCustomer(customerId: string, accountId: string): Promise<
    "assigned" | "customer_not_found" | "account_not_found" | "already_assigned" | "unit_owner_conflict"
  >;

  getUnits(customerId: string, ownerId: string): Promise<Omit<Unit, "ownerId">[]>;
  getUnit(id: string, ownerId: string): Promise<Omit<Unit, "ownerId"> | undefined>;
  createUnit(u: InsertUnit, ownerId: string): Promise<Omit<Unit, "ownerId"> | undefined>;

  insertReadings(unitId: string, ownerId: string, ts: Date, data: Record<string, number>): Promise<void>;

  getLatestReading(unitId: string, ownerId: string, key: string, since: Date): Promise<Reading | undefined>;
  getReadingSeries(unitId: string, ownerId: string, key: string, since: Date): Promise<Reading[]>;
  getLatestReadingsForUnit(unitId: string, ownerId: string): Promise<Reading[]>;

  upsertUnitStatus(unitId: string, ownerId: string, healthScore: number, faults: Record<string, any>): Promise<void>;
  getUnitStatus(unitId: string, ownerId: string): Promise<UnitStatus | undefined>;

  insertDiagnostics(ownerId: string, rows: { unitId: string; ts: Date; metric: string; value: number; meta: any }[]): Promise<void>;
  getRecentDiagnostics(unitId: string, ownerId: string, limit?: number): Promise<Diagnostic[]>;

  getFleetStats(ownerId: string): Promise<{ totalUnits: number; optimal: number; critical: number; avgHealth: number }>;
}

export class DatabaseStorage implements IStorage {
  constructor(private readonly database: typeof db = db) {}

  async getCustomers(ownerId: string) {
    const result = await db.execute(sql`
      SELECT c.*, 
        COALESCE((SELECT COUNT(*) FROM units u WHERE u.customer_id = c.id AND u.owner_id = c.owner_id), 0) as unit_count,
        (SELECT AVG(us.health_score) FROM unit_status us JOIN units u ON us.unit_id = u.id WHERE u.customer_id = c.id AND u.owner_id = c.owner_id AND ${currentHealthEvidence}) as health_score
      FROM customers c
      WHERE c.owner_id = ${ownerId}
      ORDER BY c.name ASC
    `);
    return result.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      location: r.location,
      plan: r.plan,
      unitCount: Number(r.unit_count),
      healthScore: r.health_score == null ? null : Number(r.health_score),
    }));
  }

  async getCustomer(id: string, ownerId: string) {
    const [row] = await db.select({
      id: customers.id,
      name: customers.name,
      location: customers.location,
      plan: customers.plan,
    }).from(customers)
      .where(and(eq(customers.id, id), eq(customers.ownerId, ownerId)));
    return row;
  }

  async createCustomer(c: InsertCustomer, ownerId: string) {
    const [row] = await db.insert(customers).values({ ...c, ownerId }).returning({
      id: customers.id,
      name: customers.name,
      location: customers.location,
      plan: customers.plan,
    });
    return row;
  }

  async archiveCustomer(id: string, ownerId: string, actorId: string) {
    return this.database.transaction(async (tx) => {
      // Lock/update the customer first, matching createUnit and assignment.
      // Explicitly synchronize units even while the composite FK is deferred.
      const [archived] = await tx.update(customers)
        .set({ ownerId: null })
        .where(and(eq(customers.id, id), eq(customers.ownerId, ownerId)))
        .returning({ id: customers.id });
      if (!archived) return false;

      await tx.update(units).set({ ownerId: null })
        .where(eq(units.customerId, archived.id));

      await tx.insert(customerArchiveEvents).values({
        customerId: archived.id,
        archivedBy: actorId,
      });
      return true;
    });
  }

  async getCustomerArchiveEvents() {
    return db.select({
      customerId: customerArchiveEvents.customerId,
      archivedBy: customerArchiveEvents.archivedBy,
      archivedAt: customerArchiveEvents.archivedAt,
    }).from(customerArchiveEvents).orderBy(desc(customerArchiveEvents.archivedAt));
  }

  async getUnassignedCustomers() {
    const unassignedCustomers = await db.select({
      id: customers.id,
      name: customers.name,
      location: customers.location,
      plan: customers.plan,
    }).from(customers).where(isNull(customers.ownerId)).orderBy(asc(customers.name));

    if (unassignedCustomers.length === 0) return [];

    const unassignedIds = unassignedCustomers.map((customer) => customer.id);
    const customerUnits = await db.select({
      id: units.id,
      customerId: units.customerId,
      name: units.name,
      systemType: units.systemType,
      timezone: units.timezone,
      ownerId: units.ownerId,
    }).from(units).where(inArray(units.customerId, unassignedIds)).orderBy(asc(units.name));
    const unitsByCustomer = new Map<string, typeof customerUnits>();

    for (const unit of customerUnits) {
      const grouped = unitsByCustomer.get(unit.customerId) ?? [];
      grouped.push(unit);
      unitsByCustomer.set(unit.customerId, grouped);
    }

    return unassignedCustomers.map((customer) => ({
      ...customer,
      units: (unitsByCustomer.get(customer.id) ?? []).map((unit) => ({
        id: unit.id,
        name: unit.name,
        systemType: unit.systemType,
        timezone: unit.timezone,
        ownershipStatus: unit.ownerId === null ? "unassigned" as const : "conflict" as const,
      })),
    }));
  }

  async getAccountChoices() {
    return db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(users).orderBy(asc(users.email), asc(users.id));
  }

  async assignUnassignedCustomer(customerId: string, accountId: string) {
    return this.database.transaction(async (tx) => {
      const [account] = await tx.select({ id: users.id }).from(users)
        .where(eq(users.id, accountId)).for("key share");
      if (!account) return "account_not_found" as const;

      const [customer] = await tx.select({
        id: customers.id,
        ownerId: customers.ownerId,
      }).from(customers).where(eq(customers.id, customerId)).for("update");
      if (!customer) return "customer_not_found" as const;
      if (customer.ownerId !== null) return "already_assigned" as const;

      const customerUnits = await tx.select({ ownerId: units.ownerId }).from(units)
        .where(eq(units.customerId, customerId)).for("update");
      if (customerUnits.some((unit) => unit.ownerId !== null)) {
        return "unit_owner_conflict" as const;
      }

      const [updatedCustomer] = await tx.update(customers)
        .set({ ownerId: accountId })
        .where(and(eq(customers.id, customerId), isNull(customers.ownerId)))
        .returning({ id: customers.id });
      if (!updatedCustomer) return "already_assigned" as const;

      await tx.update(units)
        .set({ ownerId: accountId })
        .where(and(eq(units.customerId, customerId), isNull(units.ownerId)));

      return "assigned" as const;
    });
  }

  async getUnits(customerId: string, ownerId: string) {
    return this.database.select({
      id: units.id,
      customerId: units.customerId,
      name: units.name,
      systemType: units.systemType,
      timezone: units.timezone,
    }).from(units).where(and(
      eq(units.customerId, customerId),
      eq(units.ownerId, ownerId),
    ));
  }

  async getUnit(id: string, ownerId: string) {
    const [row] = await this.database.select({
      id: units.id,
      customerId: units.customerId,
      name: units.name,
      systemType: units.systemType,
      timezone: units.timezone,
    }).from(units)
      .where(and(eq(units.id, id), eq(units.ownerId, ownerId)));
    return row;
  }

  async createUnit(u: InsertUnit, ownerId: string) {
    return this.database.transaction(async tx => {
      const [account] = await tx.select({ id: users.id }).from(users)
        .where(eq(users.id, ownerId)).for("key share");
      if (!account) return undefined;
      const [customer] = await tx.select({ id: customers.id }).from(customers).where(and(
        eq(customers.id, u.customerId),
        eq(customers.ownerId, ownerId),
      )).for("update");
      if (!customer) return undefined;
      const [row] = await tx.insert(units).values({ ...u, ownerId }).returning({
        id: units.id,
        customerId: units.customerId,
        name: units.name,
        systemType: units.systemType,
        timezone: units.timezone,
      });
      return row;
    });
  }

  async insertReadings(unitId: string, ownerId: string, ts: Date, data: Record<string, number>) {
    const rows = Object.entries(data).map(([key, value]) => ({
      unitId,
      ts,
      key,
      value,
    }));
    if (rows.length === 0) return;
    
    for (const row of rows) {
      await db.execute(sql`
        INSERT INTO readings (unit_id, ts, key, value)
        SELECT ${row.unitId}, ${row.ts}, ${row.key}, ${row.value}
        FROM units u WHERE u.id = ${unitId} AND u.owner_id = ${ownerId}
        ON CONFLICT (unit_id, ts, key) DO UPDATE SET value = EXCLUDED.value
      `);
    }
  }

  async getLatestReading(unitId: string, ownerId: string, key: string, since: Date) {
    const [row] = await db.select().from(readings)
      .where(and(
        eq(readings.unitId, unitId),
        eq(readings.key, key),
        gte(readings.ts, since),
        inArray(readings.unitId, db.select({ id: units.id }).from(units).where(eq(units.ownerId, ownerId))),
      ))
      .orderBy(desc(readings.ts))
      .limit(1);
    return row;
  }

  async getReadingSeries(unitId: string, ownerId: string, key: string, since: Date) {
    return db.select().from(readings)
      .where(and(
        eq(readings.unitId, unitId),
        eq(readings.key, key),
        gte(readings.ts, since),
        inArray(readings.unitId, db.select({ id: units.id }).from(units).where(eq(units.ownerId, ownerId))),
      ))
      .orderBy(asc(readings.ts));
  }

  async getLatestReadingsForUnit(unitId: string, ownerId: string) {
    const result = await db.execute(sql`
      SELECT DISTINCT ON (key) * FROM readings 
      WHERE unit_id = ${unitId}
        AND EXISTS (SELECT 1 FROM units u WHERE u.id = ${unitId} AND u.owner_id = ${ownerId})
      ORDER BY key, ts DESC
    `);
    return result.rows as unknown as Reading[];
  }

  async upsertUnitStatus(unitId: string, ownerId: string, healthScore: number, faults: Record<string, any>) {
    await db.execute(sql`
      INSERT INTO unit_status (unit_id, updated_at, health_score, faults)
      SELECT ${unitId}, NOW(), ${healthScore}, ${JSON.stringify(faults)}::jsonb
      WHERE EXISTS (SELECT 1 FROM units u WHERE u.id = ${unitId} AND u.owner_id = ${ownerId})
      ON CONFLICT (unit_id) DO UPDATE SET 
        updated_at = NOW(),
        health_score = EXCLUDED.health_score,
        faults = EXCLUDED.faults
      WHERE EXISTS (SELECT 1 FROM units u WHERE u.id = ${unitId} AND u.owner_id = ${ownerId})
    `);
  }

  async getUnitStatus(unitId: string, ownerId: string) {
    const [row] = await db.select().from(unitStatus).where(and(
      eq(unitStatus.unitId, unitId),
      inArray(unitStatus.unitId, db.select({ id: units.id }).from(units).where(eq(units.ownerId, ownerId))),
    ));
    if (!row || !isFreshTelemetry(row.updatedAt) || (row.faults as any)?.data_quality?.complete !== true) return undefined;
    return row;
  }

  async insertDiagnostics(ownerId: string, rows: { unitId: string; ts: Date; metric: string; value: number; meta: any }[]) {
    if (rows.length === 0) return;
    for (const row of rows) {
      await db.execute(sql`
        INSERT INTO diagnostics (unit_id, ts, metric, value, meta)
        SELECT ${row.unitId}, ${row.ts}, ${row.metric}, ${row.value}, ${JSON.stringify(row.meta)}::jsonb
        WHERE EXISTS (SELECT 1 FROM units u WHERE u.id = ${row.unitId} AND u.owner_id = ${ownerId})
        ON CONFLICT (unit_id, ts, metric) DO UPDATE SET value = EXCLUDED.value, meta = EXCLUDED.meta
        WHERE EXISTS (SELECT 1 FROM units u WHERE u.id = ${row.unitId} AND u.owner_id = ${ownerId})
      `);
    }
  }

  async getRecentDiagnostics(unitId: string, ownerId: string, limit = 80) {
    return db.select({ unitId: diagnostics.unitId, ts: diagnostics.ts, metric: diagnostics.metric, value: diagnostics.value, meta: diagnostics.meta })
      .from(diagnostics)
      .where(and(
        eq(diagnostics.unitId, unitId),
        inArray(diagnostics.unitId, db.select({ id: units.id }).from(units).where(eq(units.ownerId, ownerId))),
      ))
      .orderBy(desc(diagnostics.ts))
      .limit(limit);
  }

  async getFleetStats(ownerId: string) {
    const result = await db.execute(sql`
      WITH live_status AS (
        SELECT us.health_score FROM unit_status us JOIN units u ON us.unit_id = u.id
        WHERE u.owner_id = ${ownerId} AND ${currentHealthEvidence}
      )
      SELECT
        (SELECT COUNT(*) FROM units u WHERE u.owner_id = ${ownerId}) as total_units,
        (SELECT COUNT(*) FROM live_status WHERE health_score >= 85) as optimal,
        (SELECT COUNT(*) FROM live_status WHERE health_score < 60) as critical,
        (SELECT COUNT(*) FROM live_status) as assessed_units,
        (SELECT COALESCE(AVG(health_score), 0) FROM live_status) as avg_health
    `);
    const r = result.rows[0] as any;
    return {
      totalUnits: Number(r.total_units),
      optimal: Number(r.optimal),
      critical: Number(r.critical),
      avgHealth: Number(r.avg_health),
      assessedUnits: Number(r.assessed_units),
    };
  }
}

export const storage = new DatabaseStorage();
