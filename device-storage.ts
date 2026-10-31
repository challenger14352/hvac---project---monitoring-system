import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, notExists } from "drizzle-orm";
import { db } from "./db";
import { customers, deviceCredentials, readings, removedAccounts, units, users, type DeviceReading } from "@shared/schema";

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createDeviceToken(): string {
  return `ots_${randomBytes(32).toString("base64url")}`;
}

export interface DeviceStorage {
  status(unitId: string, ownerId: string): Promise<{ active: boolean; createdAt: Date | null } | undefined>;
  provision(unitId: string, ownerId: string, tokenHash: string): Promise<boolean>;
  revoke(unitId: string, ownerId: string): Promise<boolean>;
  ingest(unitId: string, tokenHash: string, payload: DeviceReading): Promise<boolean>;
}

export class DatabaseDeviceStorage implements DeviceStorage {
  constructor(private readonly database: typeof db = db) {}

  private liveAccount(ownerId: string) {
    return and(eq(users.id, ownerId), notExists(
      this.database.select().from(removedAccounts).where(eq(removedAccounts.id, ownerId)),
    ));
  }

  async status(unitId: string, ownerId: string) {
    const [unit] = await this.database.select({ id: units.id }).from(units)
      .innerJoin(customers, and(eq(customers.id, units.customerId), eq(customers.ownerId, units.ownerId)))
      .innerJoin(users, eq(users.id, units.ownerId))
      .where(and(eq(units.id, unitId), this.liveAccount(ownerId)));
    if (!unit) return undefined;
    const [credential] = await this.database.select().from(deviceCredentials)
      .where(and(eq(deviceCredentials.unitId, unitId), eq(deviceCredentials.ownerId, ownerId)));
    return { active: !!credential && credential.revokedAt === null, createdAt: credential?.createdAt ?? null };
  }

  async provision(unitId: string, ownerId: string, tokenHash: string) {
    return this.database.transaction(async (tx) => {
      // Shared lock order: account -> customer -> unit -> credential.
      // Account deletion and archival must finish before a later write can pass.
      const [account] = await tx.select({ id: users.id }).from(users)
        .where(this.liveAccount(ownerId)).for("update");
      if (!account) return false;
      const [customer] = await tx.select({ id: customers.id }).from(customers)
        .where(and(eq(customers.ownerId, ownerId), eq(customers.id,
          tx.select({ id: units.customerId }).from(units).where(eq(units.id, unitId)),
        ))).for("update");
      if (!customer) return false;
      const [unit] = await tx.select({ id: units.id }).from(units)
        .where(and(eq(units.id, unitId), eq(units.ownerId, ownerId))).for("update");
      if (!unit) return false;
      await tx.insert(deviceCredentials).values({ unitId, ownerId, tokenHash })
        .onConflictDoUpdate({ target: deviceCredentials.unitId, set: { ownerId, tokenHash, createdAt: new Date(), revokedAt: null } });
      return true;
    });
  }

  async revoke(unitId: string, ownerId: string) {
    // A successful revoke waits for any earlier credential-locked write to finish.
    return this.database.transaction(async (tx) => {
      const [account] = await tx.select({ id: users.id }).from(users)
        .where(this.liveAccount(ownerId)).for("update");
      if (!account) return false;
      const [unit] = await tx.select({ id: units.id }).from(units)
        .where(and(eq(units.id, unitId), eq(units.ownerId, ownerId))).for("update");
      if (!unit) return false;
      await tx.update(deviceCredentials).set({ revokedAt: new Date() })
        .where(and(eq(deviceCredentials.unitId, unitId), eq(deviceCredentials.ownerId, ownerId)));
      return true;
    });
  }

  async ingest(unitId: string, tokenHash: string, payload: DeviceReading) {
    return this.database.transaction(async (tx) => {
      // Lookup grants no access: all fields are rechecked under locks below.
      const [candidate] = await tx.select().from(deviceCredentials)
        .where(and(eq(deviceCredentials.unitId, unitId), eq(deviceCredentials.tokenHash, tokenHash), isNull(deviceCredentials.revokedAt)));
      if (!candidate) return false;
      const [account] = await tx.select({ id: users.id }).from(users)
        .where(this.liveAccount(candidate.ownerId)).for("update");
      if (!account) return false;
      const [customer] = await tx.select({ id: customers.id }).from(customers)
        .where(and(eq(customers.ownerId, candidate.ownerId), eq(customers.id,
          tx.select({ id: units.customerId }).from(units).where(eq(units.id, unitId)),
        ))).for("update");
      if (!customer) return false;
      const [unit] = await tx.select({ id: units.id }).from(units)
        .where(and(eq(units.id, unitId), eq(units.customerId, customer.id), eq(units.ownerId, candidate.ownerId))).for("update");
      if (!unit) return false;
      const [credential] = await tx.select().from(deviceCredentials)
        .where(and(eq(deviceCredentials.unitId, unitId), eq(deviceCredentials.ownerId, candidate.ownerId),
          eq(deviceCredentials.tokenHash, tokenHash), isNull(deviceCredentials.revokedAt))).for("update");
      if (!credential) return false;
      // Stable measurement timestamp makes bounded retries idempotent.
      await tx.insert(readings).values(Object.entries(payload.readings).map(([key, value]) => ({
        unitId, ts: new Date(payload.ts), key, value,
      }))).onConflictDoNothing();
      // A current-only measurement must not fabricate HVAC diagnostics/health.
      return true;
    });
  }
}
