import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, ArrowUpRight, Cable, Check, CircleHelp, Download, LockKeyhole, Plus, Usb, Waves } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useBenchSerial } from "@/hooks/use-bench-serial";
import BenchFrameReadings from "@/components/bench/BenchFrameReadings";
import UsbProtocolMismatch from "@/components/UsbProtocolMismatch";
import BenchHistoryCharts from "@/components/bench/BenchHistoryCharts";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BenchRecord } from "@shared/bench";
import { formatTemperatureCelsius } from "@shared/temperature";

type Customer = { id: string; name: string };
type Unit = { id: string; name: string; systemType?: string | null };
type SnapshotReading = { key: string; value: number; ts: string };
type BenchSnapshot = { unit: { id: string; name: string }; readings: SnapshotReading[] };

function readStoredSelection(key: string) {
  try { return typeof window === "undefined" ? "" : window.localStorage.getItem(key) ?? ""; }
  catch { return ""; }
}

function latestSnapshot(readings: SnapshotReading[]) {
  const sequence = readings
    .filter((reading) => reading.key === "bench_seq" && Number.isFinite(Date.parse(reading.ts)))
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))[0];
  if (!sequence) return null;
  const timestamp = Date.parse(sequence.ts);
  const snapshot = new Map(readings.filter((reading) => Date.parse(reading.ts) === timestamp).map((reading) => [reading.key, reading.value]));
  const probes = Array.from(snapshot.entries())
    .filter(([key, valid]) => key.startsWith("bench_temp_valid_") && valid === 1)
    .map(([validKey]) => {
      const address = validKey.slice("bench_temp_valid_".length);
      const temperature = snapshot.get(`bench_temp_c_${address}`);
      return temperature === undefined ? null : { address, temperature };
    })
    .filter((probe): probe is { address: string; temperature: number } => probe !== null);
  return {
    sequence: sequence.value,
    timestamp: sequence.ts,
    probes,
    current: snapshot.get("bench_current_valid") === 1 ? snapshot.get("bench_current_a_estimate") ?? null : null,
  };
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function BenchTest() {
  const { isLoaded, isSignedIn } = useAuth();
  const accountQuery = useQuery<{ id: string }>({
    queryKey: ["/api/account"], enabled: isLoaded && !!isSignedIn,
  });
  const authLoading = !isLoaded || (!!isSignedIn && accountQuery.isPending);
  const isAuthenticated = !!isSignedIn && !!accountQuery.data && !accountQuery.error;
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState(() => readStoredSelection("ots-bench-customer"));
  const [unitId, setUnitId] = useState(() => readStoredSelection("ots-bench-unit"));
  const [now, setNow] = useState(Date.now());
  const { supported, connection, sample, history, error, protocolMismatch, uploadError, uploadEnabled, setUploadEnabled,
    lastSavedAt, savedCount, rejectedLines, skippedUploads, saving, dataLossCount, connect, disconnect, exportCsv } =
    useBenchSerial(unitId || undefined, isAuthenticated);
  const connected = connection !== "disconnected";
  const customerQuery = useQuery<Customer[]>({ queryKey: ["/api/customers"], enabled: isAuthenticated });
  const unitsUrl = customerId ? `/api/customers/${encodeURIComponent(customerId)}/units` : "";
  const unitQuery = useQuery<Unit[]>({ queryKey: [unitsUrl], enabled: isAuthenticated && !!customerId });
  const units = (unitQuery.data ?? []).filter((unit) => unit.systemType === "bench_test");
  const snapshotUrl = unitId ? `/api/bench/units/${encodeURIComponent(unitId)}` : "";
  const snapshotQuery = useQuery<BenchSnapshot>({ queryKey: [snapshotUrl], enabled: isAuthenticated && !!unitId });
  const createBenchUnit = useMutation({
    mutationFn: async (selectedCustomerId: string): Promise<Unit> => {
      const response = await apiRequest("POST", `/api/customers/${encodeURIComponent(selectedCustomerId)}/units`, {
        name: "Box fan bench",
        systemType: "bench_test",
      });
      const payload = await response.json();
      return payload.unit ?? payload;
    },
    onSuccess: async (createdUnit: Unit) => {
      queryClient.setQueryData<Unit[]>([unitsUrl], (previous) => [...(previous ?? []), createdUnit]);
      setUnitId(createdUnit.id);
      await queryClient.invalidateQueries({ queryKey: [unitsUrl] });
    },
  });
  const customers = customerQuery.data ?? [];
  const stale = !!sample && (connection !== "connected" || now - new Date(sample.receivedAt).getTime() > 10_000);
  const pending = saving;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (customerId && !customerQuery.isLoading && customerQuery.data && !customers.some((customer) => customer.id === customerId)) {
      setCustomerId("");
      setUnitId("");
    }
  }, [customerId, customers, customerQuery.isLoading, customerQuery.data]);
  useEffect(() => {
    if (unitId && !unitQuery.isLoading && unitQuery.data && !units.some((unit) => unit.id === unitId)) setUnitId("");
  }, [unitId, units, unitQuery.isLoading, unitQuery.data]);
  useEffect(() => {
    try {
      window.localStorage.setItem("ots-bench-customer", customerId);
      window.localStorage.setItem("ots-bench-unit", unitId);
    } catch { /* Local USB display still works when storage is restricted. */ }
  }, [customerId, unitId]);
  useEffect(() => {
    if (lastSavedAt && unitId) void queryClient.invalidateQueries({ queryKey: [snapshotUrl] });
  }, [lastSavedAt, unitId, snapshotUrl, queryClient]);

  const serialLabel = connection === "connected" ? "USB connected" : connection === "connecting" ? "Choosing device" : "USB disconnected";

  return <main className="min-h-[100dvh] bg-background text-foreground">
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-7 sm:py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary"><Waves className="h-5 w-5" /></span>
          <span><span className="block text-lg font-semibold tracking-tight">On The Spot</span><span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Maker workspace</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`gap-2 px-3 py-1.5 ${connection === "connected" ? "border-emerald-700/30 text-emerald-800" : "text-muted-foreground"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${connection === "connected" ? "bg-emerald-600" : "bg-muted-foreground/50"}`} />{serialLabel}
          </Badge>
          {!authLoading && !isSignedIn && <a href="/sign-in" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Sign in to save</a>}
          {accountQuery.error && <span role="alert" className="text-sm text-destructive">Account access unavailable. Local readings remain available.</span>}
        </div>
      </header>

      <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><span className="h-px w-7 bg-primary" /> Bench test / local USB</div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">A bench instrument.<br /><span className="text-muted-foreground">Nothing more, nothing less.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Read your own DS18B20 probes and current-clamp firmware locally over USB. This fan-and-filter workspace is separate from HVAC monitoring and makes no diagnostic claims.</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Usb className="h-4 w-4 text-primary" /> Browser serial readiness</div>
          <p className="text-xs leading-5 text-muted-foreground">{supported ? "Web Serial is available in this browser." : "Web Serial is unavailable here. Use desktop Chrome or Edge on Windows."} Open this page in a top-level HTTPS tab; embedded previews may not allow USB.</p>
          {!supported && <a href="/bench" target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">Open bench in a new tab <ArrowUpRight className="h-3 w-3" /></a>}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="space-y-5">
          <Card className="overflow-hidden border-border/80 bg-card/70 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Instrument readout</CardTitle><CardDescription className="mt-1">Values are received locally from the connected device.</CardDescription></div>
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={history.length === 0} className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <BenchFrameReadings record={sample} stale={stale} />
              {sample && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <span>Last receive: {new Date(sample.receivedAt).toLocaleString()}</span>
                <span className="font-mono">Uptime {sample.frame.uptime_ms} ms · {sample.frame.window_ms} ms window · {sample.frame.samples} samples</span>
              </div>}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/70 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <BenchHistoryCharts history={history} connection={connection} stale={stale} hasCurrentFrame={sample !== null} />
            </CardContent>
          </Card>

          {isAuthenticated && unitId && <Card className="border-border/80 bg-muted/20">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Latest saved snapshot</CardTitle><CardDescription>Stored server data · not live · values are shown only when valid and from the same newest frame timestamp.</CardDescription></CardHeader>
            <CardContent>
              {snapshotQuery.isLoading ? <div className="space-y-2"><div className="h-8 animate-pulse rounded bg-muted/60" /><div className="h-16 animate-pulse rounded bg-muted/60" /></div>
                : snapshotQuery.error ? <div role="alert" className="text-sm text-destructive">Could not load the stored bench snapshot.</div>
                : (() => {
                  const stored = latestSnapshot(snapshotQuery.data?.readings ?? []);
                  if (!stored) return <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No saved frame is available for this unit.</p>;
                  return <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 text-xs">
                      <span className="font-medium">Server-stored · sequence {stored.sequence}</span>
                      <span className="font-mono text-muted-foreground">{new Date(stored.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {stored.probes.map((probe) => <div key={probe.address} className="rounded-md border border-border/60 bg-background/60 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">DS18B20 · {probe.address}</div>
                        <div className="mt-1 font-mono text-lg sm:text-xl">{formatTemperatureCelsius(probe.temperature)}</div>
                      </div>)}
                      <div className="rounded-md border border-border/60 bg-background/60 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current clamp · nominal estimate</div>
                        <div className="mt-1 font-mono text-xl">{stored.current === null ? "— invalid or unavailable" : `${stored.current.toFixed(3)} A`}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">Not calibrated · stored value, not live</div>
                      </div>
                    </div>
                    {stored.probes.length === 0 && <p className="text-xs text-muted-foreground">No valid temperature probe values in this snapshot.</p>}
                  </div>;
                })()}
            </CardContent>
          </Card>}

          <Card className="border-border/80 bg-card/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Local stream status</CardTitle><CardDescription>Only validated frames appear in the readout.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-background/60 p-3"><div className="text-xs text-muted-foreground">Valid frames in local buffer</div><div className="mt-1 font-mono text-xl">{history.length}<span className="ml-1 text-xs text-muted-foreground">/ 300</span></div></div>
              <div className="rounded-md bg-background/60 p-3"><div className="text-xs text-muted-foreground">Rejected serial lines</div><div className="mt-1 font-mono text-xl">{rejectedLines}</div></div>
              <div className="rounded-md bg-background/60 p-3"><div className="text-xs text-muted-foreground">Skipped save attempts</div><div className="mt-1 font-mono text-xl">{skippedUploads}</div></div>
            </CardContent>
          </Card>
          <details className="rounded-lg border border-border/70 bg-card/40">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Raw frame diagnostics</summary>
            <div className="border-t border-border/60 p-4">
              {sample ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">{JSON.stringify(sample.frame, null, 2)}</pre> : <p className="text-sm text-muted-foreground">No frame received.</p>}
            </div>
          </details>
        </section>

        <aside className="space-y-5">
          <Card className="border-primary/25 bg-primary/[0.035]">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Cable className="h-4 w-4 text-primary" /> USB session</CardTitle><CardDescription>Consent to the browser’s serial chooser for your device.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {connection === "disconnected" ? <Button className="w-full gap-2" onClick={connect} disabled={!supported}><Usb className="h-4 w-4" /> Connect serial device</Button> : <Button variant="outline" className="w-full" onClick={() => void disconnect()} disabled={connection === "connecting"}>Disconnect device</Button>}
              {connection === "connecting" && <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/3 animate-pulse rounded-full bg-primary" /></div>}
              {protocolMismatch && <UsbProtocolMismatch target="connect" busy={connected} />}
              {error && <div role="alert" className="flex gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
              {dataLossCount > 0 && <div role="status" data-testid="bench-usb-data-loss" className="rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-200">
                USB data loss detected ({dataLossCount}). Recovering the receive stream automatically.
                {" "}Earlier history is kept for CSV export; damaged data is discarded and chart lines break at the gap.
                {" "}Server saving was turned off. After valid readings resume, enable saving again if needed.
                {" "}If recovery repeatedly fails, check the USB cable/driver and 115200-baud setting.
              </div>}
              <div className="space-y-2 border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground">
                <p>Use Chrome or Edge on Windows over HTTPS in a foreground tab. The chooser appears only after you press Connect.</p>
                <p>Serial speed: <span className="font-mono text-foreground">115200 baud</span>. Close Arduino Serial Monitor first.</p>
                <p>The browser will ask you to choose and grant access to the USB serial device.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/60">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><LockKeyhole className="h-4 w-4 text-primary" /> Optional server save</CardTitle><CardDescription>USB reading works without sign-in. Saving requires authentication and an account-owned unit.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {isAuthenticated ? <>
                {customerQuery.isLoading ? <div className="h-10 animate-pulse rounded-md bg-muted/60" /> : customerQuery.error ? <div role="alert" className="text-xs text-destructive">Could not load accounts. Refresh and try again.</div> : <>
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="bench-customer">Account</label>
                  <select id="bench-customer" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50" value={customerId} disabled={connected} onChange={(e) => { setCustomerId(e.target.value); setUnitId(""); }}>
                    <option value="">Choose an account</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                  </select>
                  <label className="block text-xs font-medium text-muted-foreground" htmlFor="bench-unit">Test unit</label>
                  <select id="bench-unit" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50" value={unitId} disabled={connected || !customerId || unitQuery.isLoading} onChange={(e) => setUnitId(e.target.value)}>
                    <option value="">{unitQuery.isLoading ? "Loading units…" : "Choose a unit"}</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                  </select>
                  {unitQuery.error && <p role="alert" className="text-xs text-destructive">Could not load units for this account.</p>}
                  {!customerQuery.isLoading && !customerQuery.error && customerQuery.data && customers.length === 0 && <div className="rounded-md border border-dashed border-border p-3 text-xs leading-5 text-muted-foreground">Create a test customer in the app first, then return here to create a bench unit. <Link href="/" className="font-medium text-primary hover:underline">Go to customer dashboard</Link></div>}
                  {customerId && !unitQuery.isLoading && !unitQuery.error && units.length === 0 && <div className="rounded-md border border-dashed border-border p-3">
                    <p className="text-xs leading-5 text-muted-foreground">No bench test unit exists for this account. Create one only when you choose to.</p>
                    <Button type="button" size="sm" variant="outline" className="mt-2 gap-2" disabled={createBenchUnit.isPending || connected} onClick={() => createBenchUnit.mutate(customerId)}><Plus className="h-3.5 w-3.5" />{createBenchUnit.isPending ? "Creating…" : "Create Box fan bench unit"}</Button>
                    {createBenchUnit.error && <p role="alert" className="mt-2 text-xs text-destructive">{createBenchUnit.error.message}</p>}
                  </div>}
                  <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${!unitId || !sample || stale ? "opacity-50" : "border-primary/30 bg-primary/5"}`}>
                    <input type="checkbox" className="mt-0.5 accent-primary" checked={uploadEnabled} disabled={!unitId || !sample || stale} onChange={(e) => setUploadEnabled(e.target.checked)} />
                    <span><span className="block text-sm font-medium">Allow live frames to save</span><span className="mt-0.5 block text-xs leading-4 text-muted-foreground">Only new frames after enabling are sent. No backlog is replayed.</span></span>
                  </label>
                  {unitId && !connected && <Link href={`/unit/${encodeURIComponent(unitId)}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open selected unit <ArrowUpRight className="h-3 w-3" /></Link>}
                </>}
              </> : <div className="rounded-md border border-border/70 bg-background/60 p-3">
                <p className="text-xs leading-5 text-muted-foreground">Sign in to choose one of your existing units and save frames. No customer or unit is created automatically.</p>
                {!isSignedIn && <a href="/sign-in" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Sign in to save <ArrowUpRight className="h-3.5 w-3.5" /></a>}
              </div>}
              <div className="border-t border-border/60 pt-3">
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Save state</span><span className="flex items-center gap-1 font-medium">{uploadError ? "Latest save not confirmed" : saving ? "Saving new frame…" : savedCount > 0 ? <><Check className="h-3 w-3 text-emerald-700" /> Server confirmed</> : uploadEnabled ? "Waiting for confirmation" : "Not saving"}</span></div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded bg-background/70 p-2"><div className="text-[10px] text-muted-foreground">Latest frame pending</div><div className="font-mono text-sm">{pending ? "1 · unconfirmed" : "—"}</div></div>
                  <div className="rounded bg-background/70 p-2"><div className="text-[10px] text-muted-foreground">Confirmed saves</div><div className="font-mono text-sm">{savedCount}</div></div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Last server-confirmed save: <span className="font-mono text-foreground">{formatTime(lastSavedAt)}</span></p>
                {uploadError && <p role="alert" className="mt-2 text-xs leading-5 text-destructive">{uploadError}</p>}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="rounded-lg border border-amber-800/15 bg-amber-500/[0.045] p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><CircleHelp className="h-4 w-4 text-amber-800" /> Bench safety and limits</h2>
          <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
            <li>Do not open or cut the fan cord.</li>
            <li>Use only the listed enclosed clamp line splitter, following its manufacturer instructions.</li>
            <li>Clamp multiplier x1 or x10 must match firmware configuration.</li>
            <li>Keep temperature probes away from blades and moving parts.</li>
            <li>Fan and filter readings are not HVAC diagnostics; no pressure or airflow is measured.</li>
            <li>Current values are nominal estimates, not calibrated measurements. Firmware initially disables current pending wiring checks.</li>
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-2 rounded-lg border border-border/70 bg-card/40 p-4">
          <a href="/api/bench/files/firmware" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Download firmware</a>
          <a href="/api/bench/files/guide" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Read setup guide</a>
        </div>
      </section>
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
        <span>Local bench data is not a diagnostic result.</span><Link href="/" className="hover:text-primary">Return to On The Spot</Link>
      </footer>
    </div>
  </main>;
}
