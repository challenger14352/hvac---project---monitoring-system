export interface UsbSample {
  currentAmps: number;
  biasVolts: number;
  sampleCount: number;
  receivedAt: string;
  calibrationStatus: string;
  uptimeMs: number;
  adcRmsVolts: number;
  ctRmsVolts: number;
  meanOffsetVolts: number;
}

export type UsbMessage =
  | { kind: "sample"; sample: UsbSample }
  | { kind: "notice"; message: string }
  | { kind: "error"; message: string }
  | { kind: "empty" };

export function parseUsbLine(line: string, receivedAt = new Date().toISOString()): UsbMessage {
  const text = line.trim();
  if (!text) return { kind: "empty" };
  if (text.length > 2048) return { kind: "error", message: "Serial message is too long." };
  if (text.startsWith("# ERROR:")) {
    return { kind: "error", message: text.slice(8).trim() || "Sensor reported an error." };
  }
  if (text.startsWith("#") || text.startsWith("uptime_ms,")) {
    return { kind: "notice", message: text };
  }
  const fields = text.split(",").map((field) => field.trim());
  if (fields.length !== 8 || fields.slice(0, 7).some((field) => !field)) {
    return { kind: "error", message: "Unrecognized serial data. Upload the SCT013 USB bench sketch and use 115200 baud." };
  }
  const [uptime, count, bias, adc, ct, amps, offset] = fields.slice(0, 7).map(Number);
  if (![uptime, count, bias, adc, ct, amps, offset].every(Number.isFinite) ||
      !Number.isInteger(uptime) || uptime < 0 ||
      !Number.isInteger(count) || count < 200 ||
      bias < 1.3 || bias > 2 || adc < 0 || ct < 0 || amps < 0 || amps > 100 ||
      Math.abs(offset) > 0.05 || fields[7] !== "UNCALIBRATED_BENCH") {
    return { kind: "error", message: "Invalid or out-of-range bench reading. Check the firmware, wiring, and sensor rating." };
  }
  return {
    kind: "sample",
    sample: {
      currentAmps: amps,
      biasVolts: bias,
      sampleCount: count,
      receivedAt,
      calibrationStatus: fields[7],
      uptimeMs: uptime,
      adcRmsVolts: adc,
      ctRmsVolts: ct,
      meanOffsetVolts: offset,
    },
  };
}
