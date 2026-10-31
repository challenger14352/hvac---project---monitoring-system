import { storage } from "./storage";
import { deltaT, restrictionScore, shortCycleScore, lowChargeSuspicion, healthScore } from "@shared/scoring";
import { coolingCallMinutes } from "@shared/telemetry-quality";
import type { IStorage } from "./storage";

export async function runWorker(unitId: string, ownerId: string, dependencies: {
  storage?: Pick<IStorage, "getLatestReading" | "getReadingSeries" | "insertDiagnostics" | "upsertUnitStatus">;
  now?: Date;
} = {}) {
  const source = dependencies.storage ?? storage;
  const now = dependencies.now ?? new Date();
  const since10m = new Date(now.getTime() - 10 * 60 * 1000);
  const since1h = new Date(now.getTime() - 60 * 60 * 1000);

  const rReading = await source.getLatestReading(unitId, ownerId, "temp_return_f", since10m);
  const sReading = await source.getLatestReading(unitId, ownerId, "temp_supply_f", since10m);

  if (!rReading || !sReading) return;

  const tempReturnF = rReading.value;
  const tempSupplyF = sReading.value;
  const dt = deltaT(tempReturnF, tempSupplyF);

  const ampBlowerR = await source.getLatestReading(unitId, ownerId, "amp_blower", since10m);
  const ampCondenserR = await source.getLatestReading(unitId, ownerId, "amp_condenser", since10m);
  const dpFilterR = await source.getLatestReading(unitId, ownerId, "dp_filter_pa", since10m);

  const ampBlowerV = ampBlowerR?.value ?? null;
  const ampCondV = ampCondenserR?.value ?? null;
  const dpFilterV = dpFilterR?.value ?? null;

  const callYRows = await source.getReadingSeries(unitId, ownerId, "call_y", since1h);
  const callYSeries = coolingCallMinutes(callYRows, now.getTime());
  const temperatures = { unitId, ts: now, metric: "delta_t_f", value: dt, meta: { temp_return_f: tempReturnF, temp_supply_f: tempSupplyF } };
  if (!ampBlowerR || !ampCondenserR || !dpFilterR || !callYSeries ||
      ![tempReturnF, tempSupplyF, ampBlowerV, ampCondV, dpFilterV].every(Number.isFinite)) {
    // Thermal delta can be useful alone, but absent measurements are not
    // zero-severity faults and cannot establish a complete health score.
    if (Number.isFinite(dt)) await source.insertDiagnostics(ownerId, [temperatures]);
    return;
  }
  const runtimeMin = callYSeries.filter(value => value === 1).length;

  const restr = restrictionScore(dt, ampBlowerV, dpFilterV);
  const sc = shortCycleScore(callYSeries, 60);
  const lowc = lowChargeSuspicion(dt, ampCondV, runtimeMin);
  const hs = healthScore(restr.score, sc.score, lowc.score);

  const ts = now;
  await source.insertDiagnostics(ownerId, [
    temperatures,
    { unitId, ts, metric: "restriction_score", value: restr.score, meta: restr.meta },
    { unitId, ts, metric: "short_cycle_score", value: sc.score, meta: sc.meta },
    { unitId, ts, metric: "low_charge_suspicion", value: lowc.score, meta: lowc.meta },
    { unitId, ts, metric: "health_score", value: hs, meta: {} },
  ]);

  const faults = {
    data_quality: { complete: true, call_y_minutes: callYSeries.length },
    restriction: { score: restr.score, meta: restr.meta },
    short_cycling: { score: sc.score, meta: sc.meta },
    low_charge: { score: lowc.score, meta: lowc.meta },
  };

  await source.upsertUnitStatus(unitId, ownerId, hs, faults);
}
