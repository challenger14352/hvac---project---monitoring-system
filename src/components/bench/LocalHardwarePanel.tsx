import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowUpRight, Download, Usb } from "lucide-react";
import { useBenchSerial } from "@/hooks/use-bench-serial";
import BenchFrameReadings from "@/components/bench/BenchFrameReadings";
import BenchHistoryCharts from "@/components/bench/BenchHistoryCharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LocalHardwarePanelProps = {
  unitName?: string;
  active?: boolean;
};

export default function LocalHardwarePanel({ unitName, active = true }: LocalHardwarePanelProps) {
  const {
    supported, connection, sample, history, error, rejectedLines, dataLossCount,
    connect, disconnect, exportCsv,
  } = useBenchSerial(undefined, false);
  const [now, setNow] = useState(Date.now());
  const connected = connection === "connected";
  const stale = !!sample && (!connected || now - new Date(sample.receivedAt).getTime() > 10_000);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const openCurrentPageInTab = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  };

  return <section aria-label="Local hardware readings" className="space-y-5">
    <Card className="overflow-hidden border-border/80 bg-card/70 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Live hardware
            </CardTitle>
            <CardDescription className="mt-1">Real ESP32 readings, received locally over USB.</CardDescription>
          </div>
          <Button
            data-testid="demo-hardware-export"
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={history.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 font-medium text-primary">Real ESP32 readings</span>
          <span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-muted-foreground">Not used for sample health score</span>
          {unitName && <span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-muted-foreground">Demo context · {unitName}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div data-testid="demo-hardware-reading" aria-live="polite">
          <BenchFrameReadings record={sample} stale={stale} />
        </div>
        {sample && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>Last receive: {new Date(sample.receivedAt).toLocaleString()}</span>
          <span className="font-mono">Uptime {sample.frame.uptime_ms} ms · {sample.frame.window_ms} ms window · {sample.frame.samples} samples</span>
        </div>}
      </CardContent>
    </Card>

    <Card className="border-primary/25 bg-primary/[0.035]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Usb className="h-4 w-4 text-primary" /> Your local USB session</CardTitle>
        <CardDescription>Connect your own ESP32 to view physical readings on this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          {connection === "disconnected" ? (
            <Button
              data-testid="demo-hardware-connect"
              className="w-full gap-2 sm:w-auto"
              onClick={connect}
              disabled={!supported}
            >
              <Usb className="h-4 w-4" /> Start USB capture
            </Button>
          ) : (
            <Button
              data-testid="demo-hardware-stop"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void disconnect()}
              disabled={connection === "connecting"}
            >
              Stop USB capture
            </Button>
          )}
          <div className="flex min-h-10 items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 text-xs text-muted-foreground" role="status">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-600" : connection === "connecting" ? "bg-amber-600" : "bg-muted-foreground/50"}`} />
            {connected ? "USB connected" : connection === "connecting" ? "Waiting for device selection" : "USB disconnected"}
          </div>
        </div>

        {connection === "connecting" && <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-label="Connecting">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>}
        {error && <div role="alert" className="flex gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </div>}
        {dataLossCount > 0 && <div
          role="alert"
          data-testid="demo-hardware-loss"
          className="rounded-md border border-amber-700/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200"
        >
          <p className="font-semibold">USB data loss detected ({dataLossCount}).</p>
          <p className="mt-1">The receive stream is recovering. Damaged data was discarded; earlier history is retained for CSV export and chart traces break at the gap. This warning remains visible for this session.</p>
          <p className="mt-1">If recovery repeats, check the USB cable, driver, and 115200-baud setting.</p>
        </div>}

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-border/70 bg-background/60 p-3">
            <div className="text-xs text-muted-foreground">Validated frames in local buffer</div>
            <div className="mt-1 font-mono text-xl">{history.length}<span className="ml-1 text-xs text-muted-foreground">/ 300</span></div>
          </div>
          <div className="rounded-md border border-border/70 bg-background/60 p-3">
            <div className="text-xs text-muted-foreground">Rejected serial lines</div>
            <div className="mt-1 font-mono text-xl">{rejectedLines}</div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground">
          <p>Web Serial works in supported desktop Chrome or Edge over HTTPS in a secure top-level tab. Embedded previews and unsupported browsers may not allow USB.</p>
          <div className="flex flex-wrap items-center gap-x-1">
            <span>For the USB chooser, open this same page in its own top-level tab.</span>
            <button type="button" onClick={openCurrentPageInTab} className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline">
              Open this page in a new tab <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <p>The browser asks you to choose a device only after you start capture. Use 115200 baud and close Arduino Serial Monitor first.</p>
          <p>Readings stay in your browser and are not broadcast or shared publicly. This sample unit is demonstration context, not the owner of these real readings.</p>
        </div>
      </CardContent>
    </Card>

    {active && <Card className="border-border/80 bg-card/70 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <BenchHistoryCharts history={history} connection={connection} stale={stale} hasCurrentFrame={sample !== null} />
      </CardContent>
    </Card>}
  </section>;
}
