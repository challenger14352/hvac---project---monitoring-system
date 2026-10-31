import { eq, sql } from "drizzle-orm";
import { users, removedAccounts } from "@shared/models/auth";
import { db } from "../db";
import { accountRemovalSchema } from "./account-removal";

export class AccountStore {
  private protectionReady = false;

  get removalProtectionReady() {
    return this.protectionReady;
  }

  constructor(private readonly database: typeof db = db) {}

  async initializeAccountRemovalProtection() {
    await this.database.execute(accountRemovalSchema);
    this.protectionReady = true;
  }

  async resolveUser(id: string) {
    return this.database.transaction(async (tx) => {
      // Match the deletion trigger's lock. Each SELECT after the lock gets a
      // fresh READ COMMITTED snapshot, including a just-committed removal.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`);
      const [removed] = await tx.select().from(removedAccounts)
        .where(eq(removedAccounts.id, id)).limit(1);
      if (removed) return undefined;
      const [existing] = await tx.select().from(users).where(eq(users.id, id)).limit(1);
      if (existing) return existing;
      // Identity belongs to Clerk. No email matching or ownership backfill.
      const [created] = await tx.insert(users).values({ id }).onConflictDoNothing().returning();
      if (created) return created;
      const [found] = await tx.select().from(users).where(eq(users.id, id)).limit(1);
      return found;
    });
  }
}

export const accountStore = new AccountStore();
