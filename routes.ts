import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { IStorage } from "./storage";
import { assignUnassignedCustomerSchema, insertCustomerSchema, insertUnitSchema, ingestPayloadSchema } from "@shared/schema";
import { deviceReadingSchema } from "@shared/schema";
import { createDeviceToken, hashDeviceToken, DatabaseDeviceStorage, type DeviceStorage } from "./device-storage";
import { runWorker } from "./worker";
import type { RequestHandler } from "express";
import { accountStorage } from "./account-storage";
import type { WorkspaceSettings } from "@shared/workspace";
import { registerUsbBenchRoutes } from "./bench-routes";
import { getAuthenticatedUserId, requireAuth, isStaff } from "./auth/clerk";

function getRouteParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  dependencies: {
    storage?: IStorage;
    authenticate?: RequestHandler;
    staffAuthenticate?: RequestHandler;
    authorizeStaff?: RequestHandler;
    runWorker?: typeof runWorker;
    deviceStorage?: DeviceStorage;
    deviceSchemaReady?: boolean;
    getAccountSettings?: (ownerId: string) => Promise<WorkspaceSettings>;
    databaseReady?: RequestHandler;
  } = {},
): Promise<Server> {
  const routeStorage = dependencies.storage ?? storage;
  const accountAuthenticate = dependencies.authenticate ?? requireAuth;
  const databaseReady: RequestHandler = dependencies.databaseReady ?? ((_req, _res, next) => next());
  const authenticate = [accountAuthenticate, databaseReady];
  const staffAuthenticate = [dependencies.staffAuthenticate ?? requireAuth, databaseReady];
  const authorizeStaff = dependencies.authorizeStaff ?? isStaff;
  const processSensorData = dependencies.runWorker ?? runWorker;
  const getAccountSettings = dependencies.getAccountSettings ?? ((ownerId: string) => accountStorage.getSettings(ownerId));
  const devices = dependencies.deviceStorage ?? new DatabaseDeviceStorage();
  const requireDeviceSetup: RequestHandler = (_req, res, next) => {
    if (dependencies.deviceSchemaReady === false) {
      return res.status(503).json({ message: "Device ingestion is not configured. Apply the account ownership schema with npm run db:push and restart the app." });
    }
    next();
  };
  registerUsbBenchRoutes(app, routeStorage, accountAuthenticate);

  app.get("/api/account", accountAuthenticate, (req, res) => {
    res.json({ id: req.dbUser!.id });
  });

  app.get("/api/units/:id/device-credential", ...authenticate, requireDeviceSetup, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const status = await devices.status(getRouteParam(req.params.id), getAuthenticatedUserId(req)!);
    if (!status) return res.status(404).json({ message: "Unit not found" });
    res.json(status);
  });

  app.post("/api/units/:id/device-credential", ...authenticate, requireDeviceSetup, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const token = createDeviceToken();
    const unitId = getRouteParam(req.params.id);
    if (!await devices.provision(unitId, getAuthenticatedUserId(req)!, hashDeviceToken(token))) {
      return res.status(404).json({ message: "Unit not found" });
    }
    res.status(201).json({ unitId, token, message: "Save this token now. It will not be shown again. Any previous token is invalid." });
  });

  app.delete("/api/units/:id/device-credential", ...authenticate, requireDeviceSetup, async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!await devices.revoke(getRouteParam(req.params.id), getAuthenticatedUserId(req)!)) {
      return res.status(404).json({ message: "Unit not found" });
    }
    res.json({ ok: true });
  });

  // Dedicated device boundary: never accept a browser cookie as device authority.
  app.post("/api/device/units/:id/readings", requireDeviceSetup, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const authorization = req.header("authorization") ?? "";
    if (!/^Bearer ots_[A-Za-z0-9_-]{43}$/.test(authorization)) {
      return res.status(401).json({ message: "Invalid device credentials" });
    }
    const parsed = deviceReadingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Expected a timestamp and one measured current channel (0–100 A)" });
    const age = Date.now() - Date.parse(parsed.data.ts);
    if (age > 5 * 60_000 || age < -60_000) {
      return res.status(400).json({ message: "Measurement timestamp is outside the allowed time window" });
    }
    const unitId = getRouteParam(req.params.id);
    if (!await devices.ingest(unitId, hashDeviceToken(authorization.slice(7)), parsed.data)) {
      return res.status(401).json({ message: "Invalid device credentials" });
    }
    res.json({ ok: true, unitId, ts: parsed.data.ts, count: 1 });
  });
  // --- Customers ---
  app.get("/api/customers", ...authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const customers = await routeStorage.getCustomers(ownerId);
    res.json(customers);
  });

  app.get("/api/customers/:id", ...authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const customer = await routeStorage.getCustomer(getRouteParam(req.params.id), ownerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.post("/api/customers", ...authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    const customer = await routeStorage.createCustomer(parsed.data, ownerId);
    res.status(201).json(customer);
  });

  app.delete("/api/customers/:id", ...authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const archived = await routeStorage.archiveCustomer(getRouteParam(req.params.id), ownerId, ownerId);
    if (!archived) return res.status(404).json({ message: "Customer not found" });
    res.json({
      ok: true,
      archived: true,
      historyRetained: true,
      message: "Customer removed from your account. Equipment and operational history are retained but are no longer accessible from this account.",
    });
  });

  // Restricted review workflow for records that have no verified account owner.
  app.get("/api/staff/unassigned", ...staffAuthenticate, authorizeStaff, async (_req, res) => {
    const [customers, accounts] = await Promise.all([
      storage.getUnassignedCustomers(),
      storage.getAccountChoices(),
    ]);
    res.json({ customers, accounts });
  });

  app.put("/api/staff/unassigned/:customerId/assignment", ...staffAuthenticate, authorizeStaff, async (req, res) => {
    const parsed = assignUnassignedCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "An explicit accountId is required" });
    }

    const result = await storage.assignUnassignedCustomer(
      getRouteParam(req.params.customerId),
      parsed.data.accountId,
    );
    if (result === "account_not_found") return res.status(404).json({ message: "Account not found" });
    if (result === "customer_not_found") return res.status(404).json({ message: "Unassigned customer not found" });
    if (result === "already_assigned") return res.status(409).json({ message: "Customer is no longer unassigned" });
    if (result === "unit_owner_conflict") {
      return res.status(409).json({ message: "Customer has units with an existing owner; resolve the ownership conflict before assignment" });
    }
    res.json({ ok: true, customerId: getRouteParam(req.params.customerId), accountId: parsed.data.accountId });
  });

  app.get("/api/staff/customer-archive-events", ...staffAuthenticate, authorizeStaff, async (_req, res) => {
    const archiveEvents = await routeStorage.getCustomerArchiveEvents();
    res.json(archiveEvents);
  });

  // --- Units ---
  app.get("/api/customers/:customerId/units", ...authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const customerId = getRouteParam(req.params.customerId);
    const customer = await routeStorage.getCustomer(customerId, ownerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const units = await routeStorage.getUnits(customerId, ownerId);
    res.json(units);
  });

  app.post("/api/customers/:customerId/units", ...authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const parsed = insertUnitSchema.safeParse({ ...req.body, customerId: getRouteParam(req.params.customerId) });
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    const timezone = parsed.data.timezone ?? (await getAccountSettings(ownerId)).defaultTimezone;
    const unit = await routeStorage.createUnit({ ...parsed.data, timezone }, ownerId);
    if (!unit) return res.status(404).json({ message: "Customer not found" });
    res.status(201).json(unit);
  });

  // --- Unit Detail (readings, status, diagnostics) ---
  app.get("/api/units/:id", ...authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const unitId = getRouteParam(req.params.id);
    const unit = await routeStorage.getUnit(unitId, ownerId);
    if (!unit) return res.status(404).json({ message: "Unit not found" });
    const status = await routeStorage.getUnitStatus(unitId, ownerId);
    const latestReadings = await routeStorage.getLatestReadingsForUnit(unitId, ownerId);
    const recentDiag = await routeStorage.getRecentDiagnostics(unitId, ownerId, 50);
    res.json({ unit, status, latestReadings, diagnostics: recentDiag });
  });

  // --- Ingest ---
  app.post("/api/ingest", ...authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const parsed = ingestPayloadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

    const { unitId, ts, readings: readingsData } = parsed.data;

    const unit = await routeStorage.getUnit(unitId, ownerId);
    if (!unit) return res.status(404).json({ message: "Unit not found" });
    if (unit.systemType === "bench_test") {
      return res.status(400).json({ message: "Use /api/bench/ingest for bench units. HVAC diagnostics are disabled for bench tests." });
    }

    const timestamp = ts ? new Date(ts) : new Date();
    await routeStorage.insertReadings(unitId, ownerId, timestamp, readingsData);

    await processSensorData(unitId, ownerId);

    res.json({ ok: true, unitId, ts: timestamp.toISOString(), count: Object.keys(readingsData).length });
  });

  // --- Fleet Stats ---
  app.get("/api/fleet/stats", ...authenticate, async (req, res) => {
    const ownerId = getAuthenticatedUserId(req)!;
    const stats = await routeStorage.getFleetStats(ownerId);
    res.json(stats);
  });

  return httpServer;
}
