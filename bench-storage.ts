import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";
import { db } from "./db";
import { benchSessions, units, users } from "@shared/schema";
import type { NewBenchSession } from "@shared/bench";

const { ownerId: _owner, samples: _samples, ...summaryFields } = getTableColumns(benchSessions);
const { ownerId: _private, ...detailFields } = getTableColumns(benchSessions);

export class BenchStorage {
  constructor(private readonly database: typeof db = db) {}

  async list(ownerId: string, unitId: string) {
    const [unit] = await this.database.select({ id: units.id }).from(units)
      .where(and(eq(units.id, unitId), eq(units.ownerId, ownerId)));
    if (!unit) return undefined;
    return this.database.select(summaryFields).from(benchSessions)
      .innerJoin(units, eq(units.id, benchSessions.unitId))
      .where(and(eq(benchSessions.ownerId, ownerId), eq(units.ownerId, ownerId), eq(units.id, unitId)))
      .orderBy(desc(benchSessions.createdAt)).limit(100);
  }

  async get(ownerId: string, id: string) {
    const [row] = await this.database.select(detailFields).from(benchSessions)
      .innerJoin(units, eq(units.id, benchSessions.unitId))
      .where(and(eq(benchSessions.id, id), eq(benchSessions.ownerId, ownerId), eq(units.ownerId, ownerId)));
    return row;
  }

  async save(ownerId: string, unitId: string, data: NewBenchSession) {
    return this.database.transaction(async tx => {
      // Consistent account-then-unit lock order prevents saves crossing a
      // committed account deletion or ownership revocation.
      const [account] = await tx.select({ id: users.id }).from(users)
        .where(eq(users.id, ownerId)).for("key share");
      if (!account) return { kind: "not_found" as const };
      const [unit] = await tx.select({ id: units.id }).from(units)
        .where(and(eq(units.id, unitId), eq(units.ownerId, ownerId))).for("update");
      if (!unit) return { kind: "not_found" as const };
      const currents = data.samples.map(sample => sample.currentAmps);
      const [saved] = await tx.insert(benchSessions).values({
        ...data, ownerId, unitId,
        startedAt: new Date(data.startedAt), endedAt: new Date(data.endedAt),
        sampleCount: currents.length,
        minAmps: Math.min(...currents), maxAmps: Math.max(...currents),
        meanAmps: currents.reduce((sum, current) => sum + current, 0) / currents.length,
      }).onConflictDoNothing({ target: benchSessions.id }).returning(detailFields);
      if (saved) return { kind: "created" as const, row: saved };
      const [existing] = await tx.select(detailFields).from(benchSessions).where(and(
        eq(benchSessions.id, data.id), eq(benchSessions.ownerId, ownerId), eq(benchSessions.unitId, unitId),
      ));
      if (existing && existing.name === data.name && existing.notes === data.notes &&
          existing.startedAt.toISOString() === data.startedAt && existing.endedAt.toISOString() === data.endedAt &&
          isDeepStrictEqual(existing.samples, data.samples)) {
        return { kind: "existing" as const, row: existing };
      }
      return { kind: "conflict" as const };
    });
  }
}
export type IBenchStorage = Pick<BenchStorage, "list" | "get" | "save">;
export const benchStorage = new BenchStorage();
