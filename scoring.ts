function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function deltaT(tempReturnF: number, tempSupplyF: number): number {
  return tempReturnF - tempSupplyF;
}

export function restrictionScore(
  dt: number,
  ampBlower?: number | null,
  dpFilterPa?: number | null,
): { score: number; meta: Record<string, any> } {
  const meta: Record<string, any> = {};
  let score = 0;

  if (dpFilterPa != null) {
    meta.dp_filter_pa = dpFilterPa;
    score += clamp((dpFilterPa - 60) / 2.0, 0, 100);
  }

  if (ampBlower != null) {
    meta.amp_blower = ampBlower;
    score += clamp((ampBlower - 2.0) * 15.0, 0, 50);
  }

  score += clamp((12.0 - dt) * 4.0, 0, 25);
  score = clamp(score, 0, 100);
  return { score, meta };
}

export function shortCycleScore(callYSeries: number[], windowMinutes = 60): { score: number; meta: Record<string, any> } {
  let starts = 0;
  let last = 0;
  for (const value of callYSeries) {
    if (value === 1 && last === 0) starts++;
    last = value;
  }

  const meta = { starts_per_hour: starts, window_minutes: windowMinutes };
  const score = clamp((starts - 3) * 20.0, 0, 100);
  return { score, meta };
}

export function lowChargeSuspicion(
  dt: number,
  ampCondenser: number | null | undefined,
  runtimeMinLastHour: number,
): { score: number; meta: Record<string, any> } {
  const meta: Record<string, any> = { dt, runtime_min_last_hour: runtimeMinLastHour };
  let score = 0;

  if (runtimeMinLastHour > 30) {
    score += clamp((14.0 - dt) * 12.0, 0, 70);
  }

  if (ampCondenser != null) {
    meta.amp_condenser = ampCondenser;
    score += clamp((3.0 - ampCondenser) * 15.0, 0, 30);
  }

  score = clamp(score, 0, 100);
  return { score, meta };
}

export function healthScore(restriction: number, shortCycle: number, lowCharge: number): number {
  const faults = 0.45 * restriction + 0.30 * shortCycle + 0.25 * lowCharge;
  return clamp(100.0 - faults, 0, 100);
}
