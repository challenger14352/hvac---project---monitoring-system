import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Clock3, Thermometer } from "lucide-react";
import { buildBenchHistory } from "@/lib/bench-history";
import type { BenchRecord } from "@shared/bench";
import { celsiusToFahrenheit, formatTemperatureCelsius } from "@shared/temperature";

type Props = {
  history: readonly BenchRecord[];
  connection: "disconnected" | "connecting" | "connected";
  stale: boolean;
  hasCurrentFrame: boolean;
};

const probeColors = ["#61A9BD", "#CED14E", "#44986D", "#DD83C9", "#1F74AD"];
const currentColor = "#61A9BD";
const axisColor = "#817f76";
const gridColor = "#d9d7cd";

function formatArrival(value: number, includeDate = false) {
  if (!Number.isFinite(value)) return "Arrival time unavailable";
  const date = new Date(value);
  return date.toLocaleString([], includeDate
    ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }
    : { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ChartTooltip({ active, payload, label, probeIds, kind }: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number | null; color?: string; name?: string }>;
  label?: number;
  probeIds?: string[];
  kind: "temperature" | "current";
}) {
  if (!active || !payload?.length || typeof label !== "number" || !Number.isFinite(label)) return null;
  const readings = payload.filter((item) => item.value !== null && item.value !== undefined && Number.isFinite(item.value));
  const ids = probeIds ?? [];
  return <div className="min-w-48 rounded-md border border-border bg-card px-3 py-2.5 shadow-lg">
    <p className="mb-2 border-b border-border/70 pb-2 text-xs font-medium text-muted-foreground">
      Browser arrival · {formatArrival(label, true)}
    </p>
    {readings.length === 0
      ? <p className="text-xs text-muted-foreground">No valid {kind === "temperature" ? "temperature" : "current"} reading at this frame.</p>
      : <ul className="space-y-1.5">
        {readings.map((item) => <li key={item.dataKey ?? item.name} className="flex items-center justify-between gap-5 text-xs">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? currentColor }} />
            {kind === "temperature" ? ids[Number(item.dataKey?.replace("probe-", ""))] ?? item.name ?? "Probe" : "Nominal current estimate"}
          </span>
          <span className="font-mono font-medium text-foreground">
            {kind === "temperature" ? formatTemperatureCelsius(Number(item.value)) : `${Number(item.value).toFixed(3)} A`}
          </span>
        </li>)}
      </ul>}
  </div>;
}

function ChartEmpty({ title, detail, icon }: { title: string; detail: string; icon: "temperature" | "current" }) {
  const Icon = icon === "temperature" ? Thermometer : Activity;
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed border-border/80 bg-background/50 px-5 text-center">
    <Icon aria-hidden="true" className="mb-3 h-6 w-6 text-muted-foreground/70" />
    <p className="text-sm font-medium">{title}</p>
    <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{detail}</p>
  </div>;
}

export default function BenchHistoryCharts({ history, connection, stale, hasCurrentFrame }: Props) {
  const result = useMemo(() => buildBenchHistory(history), [history]);
  const hasTemperatures = result.temperatureCount > 0 && result.probeIds.length > 0;
  const hasCurrent = result.currentCount > 0;
  const status = connection === "connected" && !hasCurrentFrame
    ? result.frameCount === 0
      ? "Connected · waiting for the first hardware frame"
      : "Connected · waiting for new frames; showing historical data"
    : connection === "connected" && !stale
    ? "Live · receiving local USB frames"
    : connection === "connected" && stale
      ? "Stale · no recent frame; history remains visible"
    : connection === "connecting"
      ? "Connecting · historical frames remain visible"
      : result.frameCount > 0
        ? "Stopped · showing buffered history, not live"
        : "Disconnected · waiting for the first hardware frame";
  const gaps = result.points.filter((point) => point.gap);
  const arrivals = result.points.map((point) => point.receivedAtMs);
  const firstArrival = arrivals.length ? Math.min(...arrivals) : 0;
  const lastArrival = arrivals.length ? Math.max(...arrivals) : 0;
  const timePadding = arrivals.length ? Math.max(1_000, (lastArrival - firstArrival) * 0.025) : 1_000;
  const timeDomain: [number, number] = [firstArrival - timePadding, lastArrival + timePadding];

  return <section data-testid="bench-chart-status" aria-labelledby="bench-history-title" className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
      <div>
        <div className="flex items-center gap-2">
          <Clock3 aria-hidden="true" className="h-4 w-4 text-primary" />
          <h2 id="bench-history-title" className="text-sm font-semibold">Live history</h2>
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
          Browser arrival time, not a device clock. Rolling latest-300 validated-frame buffer · {result.frameCount} frames shown. Includes up to five most recently seen probe IDs.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2.5 py-1.5 text-xs">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${connection === "connected" && hasCurrentFrame && !stale ? "bg-emerald-600" : connection === "connecting" ? "bg-amber-600" : "bg-muted-foreground/60"}`} />
        <span>{status}</span>
      </div>
    </div>

    <div data-testid="bench-temperature-chart" className="rounded-md border border-border/70 bg-background/55 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Thermometer aria-hidden="true" className="h-4 w-4 text-primary" /> Probe temperature</h3>
          <p className="mt-1 text-xs text-muted-foreground">Actual DS18B20 readings · °F and °C</p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{result.temperatureCount} valid readings</span>
      </div>
      {hasTemperatures ? <>
        <div role="img" aria-label={`Time series of actual DS18B20 temperatures in degrees Fahrenheit and Celsius for ${result.probeIds.length} probe${result.probeIds.length === 1 ? "" : "s"}. The single trace per probe is measured in Celsius; Fahrenheit labels show equivalent values. Horizontal position is browser arrival time. Receipt gaps and device resets break the traces.`}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={result.points} margin={{ top: 8, right: 12, bottom: 6, left: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="2 5" vertical={false} />
              <XAxis
                type="number"
                dataKey="receivedAtMs"
                scale="time"
                domain={timeDomain}
                tickFormatter={(value: number) => formatArrival(value)}
                tick={{ fill: axisColor, fontSize: 10 }}
                axisLine={{ stroke: gridColor }}
                tickLine={false}
                minTickGap={28}
                name="Browser arrival time"
              />
              <YAxis
                type="number"
                domain={["auto", "auto"]}
                tick={{ fill: axisColor, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={92}
                tickFormatter={(value: number) => `${Number(value).toFixed(1)}°C / ${celsiusToFahrenheit(Number(value)).toFixed(1)}°F`}
                label={{ value: "Temperature · °C / °F", angle: -90, position: "insideLeft", fill: axisColor, fontSize: 10 }}
              />
              <Tooltip content={<ChartTooltip kind="temperature" probeIds={result.probeIds} />} />
              {result.probeIds.map((probeId, index) => <Line
                key={probeId}
                type="linear"
                dataKey={`temperatures.${probeId}`}
                name={probeId}
                stroke={probeColors[index % probeColors.length]}
                strokeWidth={2}
                dot={result.points.filter(point => point.temperatures[probeId] !== null).length < 10 ? { r: 3, strokeWidth: 1 } : false}
                activeDot={{ r: 5, strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2" aria-label="Probe legend">
          {result.probeIds.map((id, index) => <span key={id} className="inline-flex max-w-full items-center gap-2 text-[11px] text-muted-foreground">
            <span aria-hidden="true" className="h-0.5 w-4 shrink-0" style={{ backgroundColor: probeColors[index % probeColors.length] }} />
            <span className="truncate font-mono">{id}</span>
          </span>)}
          {gaps.length > 0 && <span className="text-[11px] text-muted-foreground">Receipt gaps and device resets break the traces.</span>}
        </div>
        <p className="sr-only">Each probe has an independent trace. Missing or invalid readings are left blank and lines do not connect across missing readings.</p>
      </> : <ChartEmpty
        icon="temperature"
        title={result.frameCount ? "No valid probe readings in this buffer" : connection === "connecting" ? "Waiting for a hardware frame" : "No temperature history yet"}
        detail={result.frameCount ? "A frame can arrive without a valid temperature. No values are interpolated." : "Connect your device and validated DS18B20 readings will appear here as they arrive."}
      />}
    </div>

    <div data-testid="bench-current-chart" className="rounded-md border border-border/70 bg-background/55 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Activity aria-hidden="true" className="h-4 w-4 text-primary" /> Current clamp estimate</h3>
          <p className="mt-1 text-xs text-muted-foreground">Valid firmware estimates only · A · not calibrated</p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{result.currentCount} valid estimates</span>
      </div>
      {hasCurrent ? <>
        <div role="img" aria-label={`Time series of ${result.currentCount} valid nominal current estimates in amperes. Horizontal position is browser arrival time. Missing and disabled current values are not plotted as zero.`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={result.points} margin={{ top: 8, right: 12, bottom: 6, left: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="2 5" vertical={false} />
              <XAxis
                type="number"
                dataKey="receivedAtMs"
                scale="time"
                domain={timeDomain}
                tickFormatter={(value: number) => formatArrival(value)}
                tick={{ fill: axisColor, fontSize: 10 }}
                axisLine={{ stroke: gridColor }}
                tickLine={false}
                minTickGap={28}
                name="Browser arrival time"
              />
              <YAxis
                type="number"
                domain={["auto", "auto"]}
                tick={{ fill: axisColor, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={44}
                label={{ value: "Current (A)", angle: -90, position: "insideLeft", fill: axisColor, fontSize: 10 }}
              />
              <Tooltip content={<ChartTooltip kind="current" />} />
              <Line
                type="linear"
                dataKey="currentA"
                name="Nominal current estimate"
                stroke={currentColor}
                strokeWidth={2}
                dot={result.currentCount < 10 ? { r: 3, strokeWidth: 1 } : false}
                activeDot={{ r: 5, strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {gaps.length > 0 && <p className="mt-2 text-[11px] text-muted-foreground">Receipt gaps and device resets break the trace.</p>}
        <p className="sr-only">Missing and disabled current readings are null, not zero; the trace is not connected across missing readings.</p>
      </> : <ChartEmpty
        icon="current"
        title={result.frameCount ? "No valid current estimates in this buffer" : "No current data"}
        detail={result.frameCount
          ? "Current is disabled or unavailable in these frames. This is normal for a temperature-only bench stage; no zero line is shown."
          : "When firmware provides a valid current estimate, it will appear here. Disabled current is not treated as zero."}
      />}
    </div>

    {result.frameCount === 0 && <p className="sr-only">No hardware frames have arrived. Charts will populate when the first validated frame is received.</p>}
  </section>;
}
