import { z } from "zod";

export const MAX_BENCH_SAMPLES = 500;
const instant = z.string().datetime({ offset: true }).transform(value => new Date(value).toISOString());
export const benchSampleSchema = z.object({
  currentAmps: z.number().finite().min(0).max(100),
  biasVolts: z.number().finite().min(1.3).max(2),
  sampleCount: z.number().int().min(200).max(10000000),
  receivedAt: instant,
  calibrationStatus: z.literal("UNCALIBRATED_BENCH"),
  uptimeMs: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  adcRmsVolts: z.number().finite().nonnegative(),
  ctRmsVolts: z.number().finite().nonnegative(),
  meanOffsetVolts: z.number().finite().min(-0.05).max(0.05),
}).strict();
export const createBenchSessionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).default(""),
  startedAt: instant,
  endedAt: instant,
  samples: z.array(benchSampleSchema).min(1).max(MAX_BENCH_SAMPLES),
}).strict().superRefine((data, context) => {
  const start = Date.parse(data.startedAt);
  const end = Date.parse(data.endedAt);
  if (start > end || end - start > 86400000 || end > Date.now() + 60000) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid recording window", path: ["endedAt"] });
  }
  let previous = start;
  data.samples.forEach((sample, index) => {
    const time = Date.parse(sample.receivedAt);
    if (time < previous || time > end) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Measurements must be ordered within the recording window", path: ["samples", index, "receivedAt"] });
    }
    previous = time;
  });
});
export type BenchSample = z.infer<typeof benchSampleSchema>;
export type NewBenchSession = z.infer<typeof createBenchSessionSchema>;

// USB bench data is deliberately separate from the HVAC diagnostic input keys.
const finite = z.number().finite();
export const benchFrameSchema = z.object({
  protocol: z.literal("ots-bench-v1"),
  seq: finite.int().min(0).max(4294967295),
  uptime_ms: finite.int().min(0).max(4294967295),
  temperatures: z.array(z.object({
    // Arduino's HEX printer emits uppercase letters. Canonicalize once so the
    // browser and server use stable storage keys regardless of firmware casing.
    id: z.string().regex(/^28[0-9a-f]{14}$/i).transform(id => id.toLowerCase()),
    c: finite.min(-55).max(125).nullable(),
  }).strict()).max(5),
  current_status: z.enum(["disabled", "ok", "adc_missing", "input_out_of_range", "sampling_error"]),
  current_a: finite.min(0).max(100).nullable(),
  ct_vrms: finite.min(0).max(2).nullable(),
  bias_v: finite.min(0).max(3.6).nullable(),
  samples: finite.int().min(0).max(10000),
  window_ms: finite.int().min(0).max(10000),
  line_multiplier: z.union([z.literal(1), z.literal(10)]),
  calibration_factor: finite.min(0.1).max(10),
}).strict().superRefine((frame, ctx) => {
  if (new Set(frame.temperatures.map(t => t.id)).size !== frame.temperatures.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate temperature address" });
  }
  if (frame.current_status === "ok") {
    if (frame.current_a === null || frame.ct_vrms === null || frame.bias_v === null ||
        frame.samples < 400 || frame.window_ms < 1900) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Current measurement lacks a valid sampling window" });
    }
  } else if (frame.current_a !== null || frame.ct_vrms !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid or disabled current must be null, not zero" });
  }
});

export type BenchFrame = z.infer<typeof benchFrameSchema>;
export type BenchRecord = {
  receivedAt: string;
  frame: BenchFrame;
  /** Browser-observed receive loss, not a firmware measurement or saved sensor field. */
  usbDataLossBefore?: boolean;
};
export const benchIngestSchema = z.object({
  unitId: z.string().min(1).max(128),
  frame: benchFrameSchema,
}).strict();

export function benchReadings(frame: BenchFrame): Record<string, number> {
  const data: Record<string, number> = {
    bench_seq: frame.seq,
    bench_uptime_ms: frame.uptime_ms,
    bench_current_valid: frame.current_status === "ok" ? 1 : 0,
    bench_line_multiplier: frame.line_multiplier,
    bench_calibration_factor: frame.calibration_factor,
    bench_samples: frame.samples,
    bench_window_ms: frame.window_ms,
  };
  for (const temp of frame.temperatures) {
    if (temp.c !== null) data[`bench_temp_c_${temp.id}`] = temp.c;
    // Validity prevents a disconnected sensor's older stored value looking current.
    data[`bench_temp_valid_${temp.id}`] = temp.c === null ? 0 : 1;
  }
  if (frame.current_status === "ok") {
    data.bench_current_a_estimate = frame.current_a!;
    data.bench_ct_vrms = frame.ct_vrms!;
  }
  if (frame.bias_v !== null) data.bench_bias_v = frame.bias_v;
  return data;
}

export function parseBenchLine(line: string): BenchFrame | null {
  if (line.length > 4096) return null;
  try {
    const parsed = benchFrameSchema.safeParse(JSON.parse(line));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Buffer arbitrary USB chunks; discard an entire oversized line, not its tail.
export class BenchLineDecoder {
  private buffer = "";
  private dropping = false;
  push(chunk: string): string[] {
    const lines: string[] = [];
    for (const char of chunk) {
      if (char === "\n") {
        if (!this.dropping) lines.push(this.buffer.trim());
        this.buffer = "";
        this.dropping = false;
      } else if (!this.dropping) {
        this.buffer += char;
        if (this.buffer.length > 4096) {
          this.buffer = "";
          this.dropping = true;
        }
      }
    }
    return lines;
  }
}
