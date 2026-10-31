import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, Download, HardDrive, LockKeyhole, Radio, RotateCcw, Save, ShieldCheck } from "lucide-react";
import type { BenchRecorder } from "@/hooks/use-bench-recorder";
import type { UsbSample } from "@/hooks/use-usb-serial";
import { downloadBenchCsv } from "@/lib/bench-export";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Customer = { id: string | number; name: string };
type Unit = { id: string | number; name?: string; label?: string; serialNumber?: string };
type BenchSummary = {
  id: string; unitId: string | number; name: string; notes: string; startedAt: string; endedAt: string;
  createdAt: string; sampleCount: number; minAmps: number; maxAmps: number; meanAmps: number;
  calibrationStatus: string; sensor: string; source: string;
};
type BenchDetail = BenchSummary & { samples: UsbSample[] };
const errorText = (error: unknown) => error instanceof Error ? error.message : "Request failed. Try again.";
const queryKeyForLogs = (unitId: string) => ["/api/units", unitId, "bench-sessions"];
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";

export default function BenchSessionPanel({ recorder, connected }: { recorder: BenchRecorder; connected: boolean }) {
  const queryClient = useQueryClient();
  const [accountMode, setAccountMode] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [detailId, setDetailId] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const count = recorder.samples.length;
  const { isLoaded, isSignedIn } = useAuth();
  const accountQuery = useQuery<{ id: string }>({
    queryKey: ["/api/account"],
    enabled: accountMode && isLoaded && !!isSignedIn,
  });
  const authenticated = isLoaded && !!isSignedIn && !!accountQuery.data && !accountQuery.error;
  const customersQuery = useQuery<Customer[]>({
    queryKey: ["/api/customers"], enabled: accountMode && authenticated,
  });
  const unitsQuery = useQuery<Unit[]>({
    queryKey: ["/api/customers", customerId, "units"],
    enabled: accountMode && authenticated && !!customerId,
  });
  const logsQuery = useQuery<BenchSummary[]>({
    queryKey: queryKeyForLogs(unitId),
    enabled: accountMode && authenticated && !!unitId,
  });
  const detailQuery = useQuery<BenchDetail>({
    queryKey: ["/api/bench-sessions", detailId],
    enabled: accountMode && authenticated && !!detailId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!recorder.sessionId || !unitId) throw new Error("Choose a unit and record a session before saving.");
      const response = await apiRequest("POST", `/api/units/${encodeURIComponent(unitId)}/bench-sessions`, {
        id: recorder.sessionId, name: name.trim(), notes: notes.trim(),
        startedAt: recorder.startedAt, endedAt: recorder.endedAt, samples: recorder.samples,
      });
      if (response.status !== 200 && response.status !== 201) throw new Error(`Save failed (${response.status}).`);
      return response.json() as Promise<BenchSummary>;
    },
    onSuccess: () => {
      setSaveError("");
      setSaveSuccess(true);
      void queryClient.invalidateQueries({ queryKey: queryKeyForLogs(unitId) });
    },
    onError: (error) => { setSaveSuccess(false); setSaveError(errorText(error)); },
  });

  const start = () => { setSaveSuccess(false); setSaveError(""); recorder.start(); };
  const clear = () => {
    if (count) setConfirmClear(true);
  };
  const confirmClearRecording = () => {
    if (count && !recorder.recording) {
      recorder.clear();
      setSaveSuccess(false);
      setSaveError("");
    }
    setConfirmClear(false);
  };

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-primary/25 bg-card/70" aria-label="Bench session recorder">
      <div className="flex flex-col gap-4 border-b border-border bg-primary/[0.045] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary"><Radio className="h-5 w-5" /></div>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Local capture · 01 / 500</p>
            <h2 className="mt-1 text-lg font-semibold">Bench session recorder</h2>
            <p className="mt-1 text-sm text-muted-foreground">Unsaved samples stay in this tab’s memory. Save or export before refreshing or leaving.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!recorder.recording ? (
            <Button type="button" onClick={start} disabled={!connected || count > 0 || recorder.limitReached || saveMutation.isPending} className="min-h-10 gap-2" data-testid="bench-start">
              <Radio className="h-4 w-4" /> Start recording
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={recorder.stop} className="min-h-10 gap-2 border-primary/40" data-testid="bench-stop">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Stop recording
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => downloadBenchCsv(recorder.samples)} disabled={!count} className="min-h-10 gap-2" data-testid="bench-export">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button type="button" variant="ghost" onClick={clear} disabled={!count || recorder.recording || saveMutation.isPending} className="min-h-10 gap-2 text-muted-foreground" data-testid="bench-clear">
            <Archive className="h-4 w-4" /> Clear
          </Button>
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-6">
        <div className="rounded-lg border border-border bg-background/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Captured samples</p>
          <p className="mt-2 font-mono text-3xl font-semibold text-primary" data-testid="bench-sample-count">{count}<span className="text-base text-muted-foreground"> / 500</span></p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {recorder.recording ? `Recording since ${dateLabel(recorder.startedAt)}` : count ? `Window: ${dateLabel(recorder.startedAt)} – ${dateLabel(recorder.endedAt)}` : connected ? "Ready when the live USB stream is connected." : "Connect USB to start a local recording."}
          </p>
          {recorder.limitReached && <p role="status" className="mt-2 text-xs text-primary">The 500-sample limit is reached. Stop and export or clear to continue.</p>}
          <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Uncalibrated bench data · not an HVAC diagnosis or verified measurement.</p>
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm leading-6 text-muted-foreground">Nothing is uploaded automatically. Export a CSV at any time; clearing requires a separate confirmation.</p>
          </div>
          {count === 0 && <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">No samples captured yet. Start a recording to collect the serial stream.</p>}
        </div>
      </div>
      {confirmClear && <div className="mx-5 mb-5 flex flex-col gap-3 rounded-lg border border-amber-300/25 bg-amber-300/[0.05] p-4 sm:mx-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Clear this recording?</strong> This permanently removes its local samples. Export first if you need a copy.</p>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirmClear(false)} className="min-h-9">Keep recording</Button>
          <Button type="button" variant="outline" onClick={confirmClearRecording} className="min-h-9 border-destructive/40 text-destructive hover:bg-destructive/10" data-testid="bench-clear-confirm">Clear samples</Button>
        </div>
      </div>}

      <div className="border-t border-border px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div><h3 className="text-sm font-semibold">Account session archive</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Private account access is only checked after you choose to load account logs.</p></div>
          </div>
          {!accountMode && <Button type="button" variant="outline" onClick={() => setAccountMode(true)} className="min-h-10 gap-2 self-start" data-testid="bench-account-toggle"><HardDrive className="h-4 w-4" /> Load account logs</Button>}
        </div>

        {accountMode && (
          <div className="mt-5 space-y-5 border-t border-border pt-5">
            {(!isLoaded || accountQuery.isLoading) && <div className="h-16 animate-pulse rounded-lg bg-muted/50" aria-label="Checking account" />}
            {accountQuery.error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm"><span>{errorText(accountQuery.error)}</span><Button type="button" variant="outline" size="sm" onClick={() => void accountQuery.refetch()}>Retry</Button></div>}
            {isLoaded && !accountQuery.isLoading && !accountQuery.error && !authenticated && (
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.045] p-4">
                <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-300" />Sign in to view or save account logs. Export any local recording before leaving; it is not included in the login flow.</p>
                <a href="/sign-in" className="mt-3 inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Continue to sign in</a>
              </div>
            )}
            {authenticated && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2"><Label htmlFor="bench-customer">Customer</Label>
                    <select id="bench-customer" data-testid="bench-customer" disabled={saveMutation.isPending} value={customerId} onChange={(e) => { setCustomerId(e.target.value); setUnitId(""); setDetailId(""); setSaveSuccess(false); setSaveError(""); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                      <option value="">Select a customer</option>{(customersQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-2"><Label htmlFor="bench-unit">Unit</Label>
                    <select id="bench-unit" data-testid="bench-unit" value={unitId} onChange={(e) => { setUnitId(e.target.value); setDetailId(""); setSaveSuccess(false); setSaveError(""); }} disabled={!customerId || unitsQuery.isLoading || saveMutation.isPending} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground disabled:opacity-50">
                      <option value="">{unitsQuery.isLoading ? "Loading units…" : "Select a unit"}</option>{(unitsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name || item.label || item.serialNumber || `Unit ${item.id}`}</option>)}
                    </select>
                  </div>
                </div>
                {customersQuery.isLoading && <p className="text-sm text-muted-foreground">Loading authorized customers…</p>}
                {customersQuery.error && <RetryMessage message={errorText(customersQuery.error)} onRetry={() => void customersQuery.refetch()} />}
                {customerId && unitsQuery.error && <RetryMessage message={errorText(unitsQuery.error)} onRetry={() => void unitsQuery.refetch()} />}
                {!customersQuery.isLoading && !customersQuery.error && !customersQuery.data?.length && <p className="text-sm text-muted-foreground" data-testid="bench-no-customers">No customer records are available in this account. Export your recording before leaving, then <a href="/" className="text-primary underline">create a customer and equipment in the dashboard</a>.</p>}
                {customerId && !unitsQuery.isLoading && !unitsQuery.error && !(unitsQuery.data?.length) && <p className="text-sm text-muted-foreground">No units are available for this customer.</p>}

                <form onSubmit={(event) => { event.preventDefault(); setSaveError(""); setSaveSuccess(false); saveMutation.mutate(); }} className="grid gap-4 rounded-lg border border-border bg-background/40 p-4">
                  <div><h4 className="text-sm font-semibold">Save this stopped recording</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Only this captured session is saved. Readings are not ingested or sent to a worker.</p></div>
                  <div className="grid gap-2"><Label htmlFor="bench-name">Session name <span className="text-muted-foreground">· required, up to 120 characters</span></Label><Input id="bench-name" data-testid="bench-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Intake fan baseline" /></div>
                  <div className="grid gap-2"><Label htmlFor="bench-notes">Notes <span className="text-muted-foreground">· optional, up to 2,000 characters</span></Label><Textarea id="bench-notes" data-testid="bench-notes" maxLength={2000} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /><p className="text-right text-xs text-muted-foreground">{notes.length}/2,000</p></div>
                  {(saveError || saveMutation.error) && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{saveError || errorText(saveMutation.error)}</p>}
                  {saveSuccess && <p role="status" data-testid="bench-save-success" className="rounded-md border border-primary/25 bg-primary/10 p-3 text-sm text-primary">Session saved to this unit’s account log.</p>}
                  <Button type="submit" disabled={!unitId || !name.trim() || !count || recorder.recording || !recorder.endedAt || !recorder.sessionId || saveMutation.isPending || saveSuccess} className="min-h-10 gap-2 justify-self-start" data-testid="bench-save"><Save className="h-4 w-4" />{saveMutation.isPending ? "Saving…" : saveSuccess ? "Session saved" : "Save session"}</Button>
                </form>

                {unitId && <section className="space-y-3" aria-label="Saved bench sessions">
                  <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold">Saved sessions for this unit</h4><Button type="button" variant="ghost" size="sm" onClick={() => void logsQuery.refetch()} disabled={logsQuery.isFetching} className="gap-2"><RotateCcw className="h-3.5 w-3.5" />Refresh</Button></div>
                  {logsQuery.isLoading ? <div className="space-y-2"><div className="h-16 animate-pulse rounded-lg bg-muted/50" /><div className="h-16 animate-pulse rounded-lg bg-muted/50" /></div>
                    : logsQuery.error ? <RetryMessage message={errorText(logsQuery.error)} onRetry={() => void logsQuery.refetch()} />
                    : !logsQuery.data?.length ? <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No saved sessions for this unit yet.</p>
                    : <div className="space-y-2">{logsQuery.data.map((log) => <div key={log.id} className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`bench-log-${log.id}`}>
                      <div className="min-w-0"><p className="truncate text-sm font-semibold">{log.name}</p><p className="mt-1 text-xs text-muted-foreground">{dateLabel(log.startedAt)} · {log.sampleCount} samples · {log.minAmps.toFixed(3)}–{log.maxAmps.toFixed(3)} A</p></div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setDetailId(log.id)} className="min-h-9 shrink-0">Open session</Button>
                    </div>)}</div>}
                </section>}
                {detailId && <section className="rounded-lg border border-primary/20 bg-primary/[0.035] p-4" data-testid="bench-log-detail">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Saved session detail</p><h4 className="mt-1 font-semibold">{detailQuery.data?.name || "Loading session…"}</h4></div>
                    {!!detailQuery.data?.samples?.length && <Button type="button" variant="outline" size="sm" onClick={() => downloadBenchCsv(detailQuery.data!.samples)} className="gap-2" data-testid="bench-saved-export"><Download className="h-4 w-4" />Export CSV</Button>}</div>
                  {detailQuery.isLoading && <div className="mt-4 h-20 animate-pulse rounded-lg bg-muted/50" />}
                  {detailQuery.error && <RetryMessage message={errorText(detailQuery.error)} onRetry={() => void detailQuery.refetch()} />}
                  {detailQuery.data && <><p className="mt-3 text-xs text-muted-foreground">{dateLabel(detailQuery.data.startedAt)} – {dateLabel(detailQuery.data.endedAt)} · {detailQuery.data.sampleCount} samples · uncalibrated</p>{detailQuery.data.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{detailQuery.data.notes}</p>}
                    <div className="mt-4 max-h-72 overflow-auto rounded-md border border-border"><table className="w-full min-w-[440px] text-left text-xs"><thead className="sticky top-0 bg-muted text-muted-foreground"><tr><th className="px-3 py-2">Time</th><th className="px-3 py-2">Current (A)</th><th className="px-3 py-2">Bias (V)</th><th className="px-3 py-2">Window samples</th></tr></thead><tbody>{detailQuery.data.samples.map((sample, index) => <tr key={`${sample.receivedAt}-${index}`} className="border-t border-border/70"><td className="px-3 py-2 font-mono">{dateLabel(sample.receivedAt)}</td><td className="px-3 py-2 font-mono">{sample.currentAmps.toFixed(3)}</td><td className="px-3 py-2 font-mono">{sample.biasVolts.toFixed(3)}</td><td className="px-3 py-2 font-mono">{sample.sampleCount}</td></tr>)}</tbody></table></div>
                  </>}
                </section>}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function RetryMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm"><span>{message}</span><Button type="button" variant="outline" size="sm" onClick={onRetry}>Retry</Button></div>;
}
