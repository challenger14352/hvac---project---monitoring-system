import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import {
  accountSettings, technicians, defaultWorkspaceSettings,
  type WorkspaceSettings, type NewTechnician, type TechnicianChanges,
} from "@shared/workspace";

const contactFields = {
  id: technicians.id, name: technicians.name, email: technicians.email,
  phone: technicians.phone, notes: technicians.notes, isActive: technicians.isActive,
  createdAt: technicians.createdAt, updatedAt: technicians.updatedAt,
};

export class AccountStorage {
  constructor(private readonly database: typeof db = db) {}
  async getSettings(ownerId: string): Promise<WorkspaceSettings> {
    const [row] = await this.database.select({
      organizationName: accountSettings.organizationName,
      defaultTimezone: accountSettings.defaultTimezone,
      refreshSeconds: accountSettings.refreshSeconds,
    }).from(accountSettings).where(eq(accountSettings.ownerId, ownerId));
    return row ? { ...row, refreshSeconds: row.refreshSeconds as WorkspaceSettings["refreshSeconds"] } : { ...defaultWorkspaceSettings };
  }

  async saveSettings(ownerId: string, settings: WorkspaceSettings) {
    await this.database.insert(accountSettings).values({ ownerId, ...settings })
      .onConflictDoUpdate({
        target: accountSettings.ownerId,
        set: { ...settings, updatedAt: new Date() },
      });
    return settings;
  }

  async listTechnicians(ownerId: string) {
    return this.database.select(contactFields).from(technicians)
      .where(eq(technicians.ownerId, ownerId))
      .orderBy(desc(technicians.isActive), asc(technicians.name), asc(technicians.id));
  }

  async createTechnician(ownerId: string, data: NewTechnician) {
    const [row] = await this.database.insert(technicians).values({ ...data, ownerId })
      .returning(contactFields);
    return row;
  }

  async updateTechnician(ownerId: string, id: string, data: TechnicianChanges) {
    const [row] = await this.database.update(technicians).set({ ...data, updatedAt: new Date() })
      .where(and(eq(technicians.id, id), eq(technicians.ownerId, ownerId)))
      .returning(contactFields);
    return row;
  }
}

export type IAccountStorage = Pick<AccountStorage, "getSettings" | "saveSettings" | "listTechnicians" | "createTechnician" | "updateTechnician">;
export const accountStorage = new AccountStorage();
