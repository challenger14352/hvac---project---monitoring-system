import type { Express, RequestHandler } from "express";
import { accountStorage, type IAccountStorage } from "./account-storage";
import { workspaceSettingsSchema, createTechnicianSchema, updateTechnicianSchema } from "@shared/workspace";
import { getAuthenticatedUserId, requireAuth } from "./auth/clerk";

export function registerAccountRoutes(
  app: Express,
  authenticate: RequestHandler = requireAuth,
  store: IAccountStorage = accountStorage,
) {
  app.get("/api/account/settings", authenticate, async (req, res) => {
    res.json(await store.getSettings(getAuthenticatedUserId(req)!));
  });
  app.put("/api/account/settings", authenticate, async (req, res) => {
    const parsed = workspaceSettingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid settings", errors: parsed.error.flatten() });
    res.json(await store.saveSettings(getAuthenticatedUserId(req)!, parsed.data));
  });
  app.get("/api/technicians", authenticate, async (req, res) => {
    res.json(await store.listTechnicians(getAuthenticatedUserId(req)!));
  });
  app.post("/api/technicians", authenticate, async (req, res) => {
    const parsed = createTechnicianSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid technician", errors: parsed.error.flatten() });
    res.status(201).json(await store.createTechnician(getAuthenticatedUserId(req)!, parsed.data));
  });
  app.patch("/api/technicians/:id", authenticate, async (req, res) => {
    const parsed = updateTechnicianSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid technician changes", errors: parsed.error.flatten() });
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const row = await store.updateTechnician(getAuthenticatedUserId(req)!, id, parsed.data);
    if (!row) return res.status(404).json({ message: "Technician not found" });
    res.json(row);
  });
}
