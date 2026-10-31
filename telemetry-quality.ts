export const TELEMETRY_MAX_AGE_MS = 10 * 60 * 1000;
export const REQUIRED_HEALTH_KEYS = ["temp_return_f", "temp_supply_f", "amp_blower", "amp_condenser", "dp_filter_pa", "call_y"] as const;

export function isFreshTelemetry(timestamp: string | Date, now = Date.now()) {
  const age = now - new Date(timestamp).getTime();
  return Number.isFinite(age) && age >= -60_000 && age <= TELEMETRY_MAX_AGE_MS;
}

// One representative observation per minute prevents faster send rates from
// incorrectly turning, for example, 120 half-minute samples into 120 minutes.
export function coolingCallMinutes(rows: { ts: Date | string; value: number }[], now: number): number[] | null {
  const bins: { ts: number; value: number }[] = Array.from({ length: 60 }, () => ({ ts: -Infinity, value: -1 }));
  const start = now - 60 * 60_000;
  for (const row of rows) {
    const ts = new Date(row.ts).getTime();
    if (!Number.isFinite(ts) || row.value !== 0 && row.value !== 1) return null;
    if (ts < start || ts > now) continue;
    const index = Math.min(59, Math.floor((ts - start) / 60_000));
    if (ts >= bins[index].ts) bins[index] = { ts, value: row.value };
  }
  return bins.some(bin => bin.value === -1) ? null : bins.map(bin => bin.value);
}
