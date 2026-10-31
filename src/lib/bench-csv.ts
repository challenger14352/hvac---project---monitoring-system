import type { BenchRecord } from "@shared/bench";
import { celsiusToFahrenheit } from "@shared/temperature";

/** Fahrenheit is derived from the original Celsius reading, never a second measurement. */
export function buildBenchCsv(history: readonly BenchRecord[]) {
  const rows = [["received_at", "sequence", "uptime_ms", "sensor_id", "temperature_c",
    "temperature_f", "current_a_estimate", "current_status", "ct_vrms", "bias_v",
    "samples", "window_ms", "line_multiplier", "calibration_factor", "usb_data_loss_before"]];
  for (const record of history) {
    const { receivedAt, frame } = record;
    const temps = frame.temperatures.length ? frame.temperatures : [{ id: "", c: null }];
    for (const temp of temps) rows.push([receivedAt, String(frame.seq), String(frame.uptime_ms),
      temp.id, temp.c === null ? "" : String(temp.c),
      temp.c === null ? "" : String(celsiusToFahrenheit(temp.c)),
      frame.current_a === null ? "" : String(frame.current_a), frame.current_status,
      frame.ct_vrms === null ? "" : String(frame.ct_vrms),
      frame.bias_v === null ? "" : String(frame.bias_v), String(frame.samples),
      String(frame.window_ms), String(frame.line_multiplier), String(frame.calibration_factor),
      record.usbDataLossBefore ? "true" : "false"]);
  }
  return rows.map(row => row.join(",")).join("\r\n");
}
