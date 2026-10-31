import { Activity, Radio, Thermometer } from "lucide-react";
import type { BenchRecord } from "@shared/bench";
import { formatTemperatureCelsius } from "@shared/temperature";

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function statusLabel(status: string) {
  return ({
    disabled: "Current channel disabled",
    ok: "Current sample received",
    adc_missing: "ADC not detected",
    input_out_of_range: "Input out of range",
    sampling_error: "Sampling error",
  } as Record<string, string>)[status] ?? status;
}

export default function BenchFrameReadings({ record, stale }: { record: BenchRecord | null; stale: boolean }) {
  if (!record) {
    return <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-background/40 px-6 text-center">
      <Radio className="mb-3 h-7 w-7 text-muted-foreground/60" />
      <p className="font-medium">Waiting for a hardware frame</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">No readings are shown until a connected device sends valid data.</p>
    </div>;
  }
  return <div className="space-y-5">
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${stale ? "border-amber-700/20 bg-amber-500/5" : "border-emerald-700/20 bg-emerald-600/5"}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${stale ? "bg-amber-600" : "bg-emerald-600"}`} />
        <span className="text-sm font-semibold">{stale ? "Stale · not live" : "Local frame received"}</span>
      </div>
      <span className="font-mono text-xs text-muted-foreground">Received {formatTime(record.receivedAt)}</span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {record.frame.temperatures.map((probe) => <div key={probe.id} className="rounded-lg border border-border/70 bg-background/60 p-4">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-2"><Thermometer className="h-3.5 w-3.5" /> DS18B20 probe</span>
          <span className="font-mono">{probe.id}</span>
        </div>
        <div className="font-mono text-xl tracking-tight sm:text-2xl">{formatTemperatureCelsius(probe.c)}</div>
      </div>)}
      {record.frame.temperatures.length === 0 && <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">Frame received · no temperature probes reported.</div>}
    </div>
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <div className="rounded-lg border border-border/70 bg-background/60 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Activity className="h-3.5 w-3.5" /> Current clamp · nominal estimate</div>
        <div className="font-mono text-3xl tracking-tight">{record.frame.current_status === "ok" && record.frame.current_a !== null ? `${record.frame.current_a.toFixed(3)} A` : "—"}</div>
        <p className="mt-2 text-xs text-muted-foreground">{statusLabel(record.frame.current_status)} · not calibrated</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:w-64 sm:grid-cols-1">
        <div className="rounded-lg border border-border/70 bg-background/60 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Line multiplier</div>
          <div className="mt-1 font-mono text-lg">×{record.frame.line_multiplier}</div>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/60 p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Frame sequence</div>
          <div className="mt-1 font-mono text-lg">{record.frame.seq}</div>
        </div>
      </div>
    </div>
  </div>;
}
