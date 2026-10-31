import type { Express, RequestHandler } from "express";
import { resolve } from "node:path";
import type { IStorage } from "./storage";
import { benchStorage, type IBenchStorage } from "./bench-storage";
import { createBenchSessionSchema, benchIngestSchema, benchReadings } from "@shared/bench";
import { getAuthenticatedUserId, requireAuth } from "./auth/clerk";

function param(value: string | string[]) { return Array.isArray(value) ? value[0] : value; }
export function registerBenchRoutes(
  app: Express, authenticate: RequestHandler = requireAuth, store: IBenchStorage = benchStorage,
) {
  app.get("/api/units/:unitId/bench-sessions", authenticate, async (req, res) => {
    const rows = await store.list(getAuthenticatedUserId(req)!, param(req.params.unitId));
    if (!rows) return res.status(404).json({ message: "Unit not found" });
    res.json(rows);
  });
  app.get("/api/bench-sessions/:id", authenticate, async (req, res) => {
    const row = await store.get(getAuthenticatedUserId(req)!, param(req.params.id));
    if (!row) return res.status(404).json({ message: "Bench log not found" });
    res.json(row);
  });
  app.post("/api/units/:unitId/bench-sessions", authenticate, async (req, res) => {
    const parsed = createBenchSessionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid bench recording", errors: parsed.error.flatten() });
    const result = await store.save(getAuthenticatedUserId(req)!, param(req.params.unitId), parsed.data);
    if (result.kind === "not_found") return res.status(404).json({ message: "Unit not found" });
    if (result.kind === "conflict") return res.status(409).json({ message: "This recording ID was already used for different data. Keep the original log or start a new recording." });
    res.status(result.kind === "created" ? 201 : 200).json(result.row);
  });
}
export function registerUsbBenchRoutes(app: Express, storage: IStorage, authenticate: RequestHandler) {
  // Fixed public source/documentation downloads; never accept a caller-supplied path.
  app.get("/api/bench/files/firmware", (_req, res) => {
    res.download(resolve(process.cwd(), "hardware/esp32_bench/esp32_bench.ino"));
  });
  app.get("/api/bench/files/guide", (_req, res) => {
    res.download(resolve(process.cwd(), "hardware/BENCH_SETUP.md"));
  });

  app.post("/api/bench/ingest", authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const payload = benchIngestSchema.safeParse(req.body);
    if (!payload.success) return res.status(400).json({ message: "Invalid bench frame", errors: payload.error.flatten() });
    const { unitId, frame } = payload.data;
    const unit = await storage.getUnit(unitId, ownerId);
    if (!unit) return res.status(404).json({ message: "Unit not found" });
    // Keep test data out of real equipment histories and diagnostic processing.
    if (unit.systemType !== "bench_test") {
      return res.status(400).json({ message: "Select a dedicated bench_test unit, not operational HVAC equipment." });
    }
    const ts = new Date();
    const values = benchReadings(frame);
    await storage.insertReadings(unitId, ownerId, ts, values);
    // insertReadings deliberately ignores rows after ownership is revoked.
    // Confirm a full account-visible frame before telling the browser it saved.
    const saved = await storage.getLatestReadingsForUnit(unitId, ownerId);
    if (!Object.entries(values).every(([key, value]) =>
      saved.some(row => row.key === key && row.value === value &&
        new Date(row.ts).getTime() === ts.getTime()))) {
      return res.status(409).json({ message: "The complete frame could not be confirmed saved. Check unit access." });
    }
    // Deliberately no runWorker, status update, or HVAC diagnostic keys.
    return res.json({ ok: true, unitId, ts: ts.toISOString(), source: "usb_bench", diagnosticRun: false });
  });

  app.get("/api/bench/units/:id", authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const unit = await storage.getUnit(id, ownerId);
    if (!unit) return res.status(404).json({ message: "Unit not found" });
    if (unit.systemType !== "bench_test") return res.status(400).json({ message: "Not a bench unit" });
    const readings = await storage.getLatestReadingsForUnit(id, ownerId);
    res.json({ unit: { id: unit.id, name: unit.name }, readings: readings.filter(r => r.key.startsWith("bench_")) });
  });
}
