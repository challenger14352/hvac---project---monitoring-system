import {
  deltaT,
  healthScore,
  lowChargeSuspicion,
  restrictionScore,
  shortCycleScore,
} from "@shared/scoring";

export type DemoSample = {
  time: string;
  returnF: number;
  supplyF: number;
  blowerAmps: number;
  condenserAmps: number;
  filterPressurePa: number;
  runtimeMinutes: number;
  startsPerHour: number;
};

export type DemoCustomer = {
  id: string;
  name: string;
  location: string;
  plan: string;
};

export type DemoUnit = {
  id: string;
  customerId: string;
  name: string;
  site: string;
  type: string;
  systemType: string;
  history: DemoSample[];
};

export type EvaluatedDemoSample = DemoSample & {
  deltaT: number;
  restriction: number;
  shortCycle: number;
  lowCharge: number;
  health: number;
};

export type DemoUnitDetail = {
  unit: { id: string; customerId: string; name: string; systemType: string; timezone: string };
  status: { unitId: string; updatedAt: string; healthScore: number; faults: Record<string, any> } | null;
  latestReadings: { unitId: string; ts: string; key: string; value: number }[];
  diagnostics: { unitId: string; ts: string; metric: string; value: number; meta: Record<string, any> }[];
};

export const demoCustomers: DemoCustomer[] = [
  { id: "demo-north-valley", name: "North Valley College", location: "Boston, MA", plan: "premium" },
  { id: "demo-harbor-medical", name: "Harbor Medical Center", location: "Providence, RI", plan: "enterprise" },
  { id: "demo-riverside-library", name: "Riverside Public Library", location: "Worcester, MA", plan: "basic" },
];

export const demoUnits: DemoUnit[] = [
  {
    id: "RTU-001",
    customerId: "demo-north-valley",
    name: "RTU-001 · North Hall",
    site: "North Hall",
    type: "Rooftop unit · 12.5 ton",
    systemType: "rooftop_unit",
    history: [
      { time: "08:00", returnF: 75.2, supplyF: 55.6, blowerAmps: 2.4, condenserAmps: 3.7, filterPressurePa: 45, runtimeMinutes: 40, startsPerHour: 2 },
      { time: "08:30", returnF: 75.1, supplyF: 56.0, blowerAmps: 2.45, condenserAmps: 3.6, filterPressurePa: 46, runtimeMinutes: 40, startsPerHour: 2 },
      { time: "09:00", returnF: 75.0, supplyF: 56.1, blowerAmps: 2.5, condenserAmps: 3.6, filterPressurePa: 47, runtimeMinutes: 41, startsPerHour: 2 },
      { time: "09:30", returnF: 75.1, supplyF: 56.3, blowerAmps: 2.55, condenserAmps: 3.5, filterPressurePa: 48, runtimeMinutes: 41, startsPerHour: 2 },
      { time: "10:00", returnF: 75.0, supplyF: 56.5, blowerAmps: 2.6, condenserAmps: 3.5, filterPressurePa: 49, runtimeMinutes: 42, startsPerHour: 2 },
      { time: "10:30", returnF: 75.0, supplyF: 56.8, blowerAmps: 2.6, condenserAmps: 3.4, filterPressurePa: 49, runtimeMinutes: 42, startsPerHour: 2 },
    ],
  },
  {
    id: "AHU-004",
    customerId: "demo-north-valley",
    name: "AHU-004 · Science Center",
    site: "Science Center",
    type: "Air handler · 7.5 ton",
    systemType: "air_handler",
    history: [
      { time: "08:00", returnF: 75, supplyF: 58, blowerAmps: 2.8, condenserAmps: 3.5, filterPressurePa: 45, runtimeMinutes: 24, startsPerHour: 2 },
      { time: "08:30", returnF: 75, supplyF: 59, blowerAmps: 3.0, condenserAmps: 3.4, filterPressurePa: 50, runtimeMinutes: 26, startsPerHour: 2 },
      { time: "09:00", returnF: 75, supplyF: 60, blowerAmps: 3.2, condenserAmps: 3.3, filterPressurePa: 55, runtimeMinutes: 28, startsPerHour: 3 },
      { time: "09:30", returnF: 75, supplyF: 61, blowerAmps: 3.4, condenserAmps: 3.2, filterPressurePa: 60, runtimeMinutes: 30, startsPerHour: 4 },
      { time: "10:00", returnF: 75, supplyF: 61.7, blowerAmps: 3.7, condenserAmps: 3.1, filterPressurePa: 70, runtimeMinutes: 42, startsPerHour: 5 },
      { time: "10:30", returnF: 75, supplyF: 62.7, blowerAmps: 4.0, condenserAmps: 3.0, filterPressurePa: 80, runtimeMinutes: 54, startsPerHour: 5 },
    ],
  },
  {
    id: "RTU-008",
    customerId: "demo-north-valley",
    name: "RTU-008 · Student Commons",
    site: "Student Commons",
    type: "Rooftop unit · 10 ton",
    systemType: "rooftop_unit",
    history: [],
  },
  {
    id: "RTU-019",
    customerId: "demo-harbor-medical",
    name: "RTU-019 · East Wing",
    site: "East Wing",
    type: "Rooftop unit · 8 ton",
    systemType: "rooftop_unit",
    history: [
      { time: "08:00", returnF: 74, supplyF: 57, blowerAmps: 2.5, condenserAmps: 2.8, filterPressurePa: 46, runtimeMinutes: 18, startsPerHour: 2 },
      { time: "08:30", returnF: 74, supplyF: 57.5, blowerAmps: 2.5, condenserAmps: 2.7, filterPressurePa: 47, runtimeMinutes: 20, startsPerHour: 3 },
      { time: "09:00", returnF: 74, supplyF: 58, blowerAmps: 2.55, condenserAmps: 2.7, filterPressurePa: 48, runtimeMinutes: 22, startsPerHour: 4 },
      { time: "09:30", returnF: 74, supplyF: 58.5, blowerAmps: 2.6, condenserAmps: 2.6, filterPressurePa: 48, runtimeMinutes: 24, startsPerHour: 4 },
      { time: "10:00", returnF: 74, supplyF: 59, blowerAmps: 2.6, condenserAmps: 2.6, filterPressurePa: 49, runtimeMinutes: 26, startsPerHour: 5 },
      { time: "10:30", returnF: 74, supplyF: 59, blowerAmps: 2.6, condenserAmps: 2.5, filterPressurePa: 50, runtimeMinutes: 28, startsPerHour: 5 },
    ],
  },
];

function makeCallSeries(runtimeMinutes: number, startsPerHour: number): number[] {
  const readings = Array.from({ length: 60 }, () => 0);
  const starts = Math.min(startsPerHour, 60 - runtimeMinutes + 1);
  if (starts <= 0) return readings;

  let cursor = 0;
  let remainingRuntime = runtimeMinutes;
  for (let start = 0; start < starts; start++) {
    const runLength = Math.ceil(remainingRuntime / (starts - start));
    for (let minute = cursor; minute < Math.min(cursor + runLength, readings.length); minute++) {
      readings[minute] = 1;
    }
    remainingRuntime -= runLength;
    cursor += runLength + 1;
  }
  return readings;
}

export function evaluateDemoSample(sample: DemoSample): EvaluatedDemoSample {
  const dt = deltaT(sample.returnF, sample.supplyF);
  const restriction = restrictionScore(dt, sample.blowerAmps, sample.filterPressurePa).score;
  const shortCycle = shortCycleScore(makeCallSeries(sample.runtimeMinutes, sample.startsPerHour)).score;
  const lowCharge = lowChargeSuspicion(dt, sample.condenserAmps, sample.runtimeMinutes).score;
  return {
    ...sample,
    deltaT: dt,
    restriction,
    shortCycle,
    lowCharge,
    health: healthScore(restriction, shortCycle, lowCharge),
  };
}

export function sampleTimestamp(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2026, 9, 25, hours, minutes).toISOString();
}

export function getDemoUnitDetail(unitId: string): DemoUnitDetail | undefined {
  const sampleUnit = demoUnits.find((unit) => unit.id === unitId);
  if (!sampleUnit) return undefined;

  const unit = {
    id: sampleUnit.id,
    customerId: sampleUnit.customerId,
    name: sampleUnit.name,
    systemType: sampleUnit.systemType,
    timezone: "America/New_York",
  };

  if (sampleUnit.history.length === 0) {
    return { unit, status: null, latestReadings: [], diagnostics: [] };
  }

  const evaluated = sampleUnit.history.map(evaluateDemoSample);
  const latest = evaluated[evaluated.length - 1];
  const latestTimestamp = sampleTimestamp(latest.time);
  const latestReadings = [
    ["temp_return_f", latest.returnF],
    ["temp_supply_f", latest.supplyF],
    ["amp_blower", latest.blowerAmps],
    ["amp_condenser", latest.condenserAmps],
    ["dp_filter_pa", latest.filterPressurePa],
    ["call_y", 1],
  ].map(([key, value]) => ({
    unitId,
    ts: latestTimestamp,
    key: String(key),
    value: Number(value),
  }));

  const diagnostics = evaluated.flatMap((sample) => {
    const ts = sampleTimestamp(sample.time);
    return [
      { unitId, ts, metric: "delta_t_f", value: sample.deltaT, meta: { temp_return_f: sample.returnF, temp_supply_f: sample.supplyF } },
      { unitId, ts, metric: "restriction_score", value: sample.restriction, meta: { dp_filter_pa: sample.filterPressurePa, amp_blower: sample.blowerAmps } },
      { unitId, ts, metric: "short_cycle_score", value: sample.shortCycle, meta: { starts_per_hour: sample.startsPerHour, window_minutes: 60 } },
      { unitId, ts, metric: "low_charge_suspicion", value: sample.lowCharge, meta: { dt: sample.deltaT, runtime_min_last_hour: sample.runtimeMinutes, amp_condenser: sample.condenserAmps } },
      { unitId, ts, metric: "health_score", value: sample.health, meta: {} },
    ];
  });

  return {
    unit,
    status: {
      unitId,
      updatedAt: latestTimestamp,
      healthScore: latest.health,
      faults: {
        restriction: { score: latest.restriction, meta: { dp_filter_pa: latest.filterPressurePa, amp_blower: latest.blowerAmps } },
        short_cycling: { score: latest.shortCycle, meta: { starts_per_hour: latest.startsPerHour, window_minutes: 60 } },
        low_charge: { score: latest.lowCharge, meta: { dt: latest.deltaT, runtime_min_last_hour: latest.runtimeMinutes, amp_condenser: latest.condenserAmps } },
      },
    },
    latestReadings,
    diagnostics,
  };
}

export function getDemoCustomer(customerId: string): DemoCustomer | undefined {
  return demoCustomers.find((customer) => customer.id === customerId);
}

export function getDemoCustomerUnits(customerId: string): DemoUnit[] {
  return demoUnits.filter((unit) => unit.customerId === customerId);
}

export function getDemoUnitStatus(unit: DemoUnit): "Optimal" | "Needs attention" | "Offline" {
  if (unit.history.length === 0) return "Offline";
  return evaluateDemoSample(unit.history[unit.history.length - 1]).health >= 85 ? "Optimal" : "Needs attention";
}

export function getDemoUnitHealth(unit: DemoUnit): number | null {
  if (unit.history.length === 0) return null;
  return evaluateDemoSample(unit.history[unit.history.length - 1]).health;
}
