import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Cable,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  ExternalLink,
  Gauge,
  ShieldAlert,
  Usb,
  WifiOff,
} from "lucide-react";
import { useUsbSerial } from "@/hooks/use-usb-serial";
import { useBenchRecorder } from "@/hooks/use-bench-recorder";
import BenchSessionPanel from "@/components/BenchSessionPanel";
import UsbProtocolMismatch from "@/components/UsbProtocolMismatch";
import { Button } from "@/components/ui/button";
import sketchSource from "../../../firmware/sct013_usb/sct013_usb.ino?raw";
import headerSource from "../../../firmware/sct013_usb/RmsAccumulator.h?raw";
import guideSource from "../../../firmware/README.md?raw";

import uploadSource from "../../../firmware/sct013_usb/DeviceUpload.h?raw";
import configSource from "../../../firmware/sct013_usb/DeviceConfig.example.h?raw";

type DownloadKind = "sketch" | "header" | "upload" | "config" | "guide";

const downloadContent: Record<DownloadKind, { name: string; content: string; type: string }> = {
  sketch: {
    name: "sct013_usb.ino",
    content: sketchSource,
    type: "text/plain;charset=utf-8",
  },
  header: {
    name: "RmsAccumulator.h",
    content: headerSource,
    type: "text/plain;charset=utf-8",
  },
  upload: {
    name: "DeviceUpload.h",
    content: uploadSource,
    type: "text/plain;charset=utf-8",
  },
  config: {
    name: "DeviceConfig.example.h",
    content: configSource,
    type: "text/plain;charset=utf-8",
  },
  guide: {
    name: "SCT013-wiring-guide.md",
    content: guideSource,
    type: "text/markdown;charset=utf-8",
  },
};

function downloadFile(kind: DownloadKind) {
  const file = downloadContent[kind];
  const url = URL.createObjectURL(new Blob([file.content], { type: file.type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StepNumber({ children }: { children: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 font-mono text-xs font-bold text-primary">
      {children}
    </span>
  );
}

export default function Esp32Connect() {
  const recorder = useBenchRecorder();
  const hadConnection = useRef(false);
  const {
    supported,
    connected,
    connecting,
    error,
    protocolMismatch,
    status,
    latest,
    dataLossCount,
    connect,
    disconnect,
  } = useUsbSerial(recorder.onSample, recorder.stop);
  useEffect(() => {
    if (connected) hadConnection.current = true;
    else if (hadConnection.current) {
      recorder.stop();
      hadConnection.current = false;
    }
  }, [connected, recorder.stop]);
  const [actionError, setActionError] = useState<string | null>(null);
  const hasReading = !!latest && Number.isFinite(latest.currentAmps);

  const handleConnect = async () => {
    setActionError(null);
    try {
      await connect();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not connect to the device.");
    }
  };

  const handleDisconnect = async () => {
    setActionError(null);
    try {
      await disconnect();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not disconnect from the device.");
    }
  };

  const receivedAt = latest?.receivedAt ? new Date(latest.receivedAt) : null;
  const formattedTime =
    receivedAt && !Number.isNaN(receivedAt.getTime())
      ? receivedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : null;

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border/80 bg-background/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back to On The Spot home"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>On The Spot</span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Home
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sample demo <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <span className="text-primary">Hardware bench</span>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span>ESP32 · SCT013</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 normal-case tracking-normal text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-primary" : "bg-muted-foreground/60"}`} />
            {connected ? "USB session active" : "Local-only session"}
          </span>
        </div>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Activity className="h-4 w-4" aria-hidden="true" />
              Real hardware · serial stream
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Read your current sensor.
              <br />
              <span className="text-primary">Right here on the bench.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Connect an ESP32 running the SCT013 sketch and inspect the measurements it actually sends over USB.
              This is separate from the fictional sample data in the product demo.
            </p>
          </div>
          <aside className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold">Bench measurements only</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Uncalibrated bench readings stay local unless you explicitly save a stopped recording to a signed-in account.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <BenchSessionPanel recorder={recorder} connected={connected} />

        <section className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]" aria-label="USB sensor connection">
          <div className="rounded-xl border border-border bg-card/70">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                  <Usb className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold">USB serial monitor</h2>
                  <p className="text-xs text-muted-foreground">ESP32 · 115200 baud</p>
                </div>
              </div>
              <div
                data-testid="usb-status"
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <span className={`h-2 w-2 rounded-full ${connected ? "bg-primary" : connecting ? "animate-pulse bg-primary" : "bg-muted-foreground/50"}`} />
                {connecting ? "Requesting USB access…" : connected ? (status || "Connected — waiting for a reading") : (status || "Not connected")}
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="max-w-xl">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Use desktop Chrome or Edge over HTTPS. Choose the ESP32 serial port in the browser prompt. Close
                    Arduino Serial Monitor first; only one program can use the port at a time.
                  </p>
                  <a href="/connect" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    Open connection page in its own tab <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  {!supported && (
                    <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-amber-300" role="note">
                      <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      Web Serial is unavailable here. Open this page in desktop Chrome or Edge over HTTPS.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                  {!connected ? (
                    <Button
                      type="button"
                      onClick={handleConnect}
                      disabled={!supported || connecting}
                      className="min-h-11 gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary/90"
                      data-testid="connect-usb"
                    >
                      <Usb className="h-4 w-4" aria-hidden="true" />
                      {connecting ? "Connecting…" : "Connect USB"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={connecting}
                      variant="outline"
                      className="min-h-11 gap-2 border-border px-5 hover:border-destructive/40 hover:text-destructive"
                      data-testid="disconnect-usb"
                    >
                      <WifiOff className="h-4 w-4" aria-hidden="true" />
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
              {protocolMismatch && <UsbProtocolMismatch target="bench" busy={connected || connecting} />}
              {(error || actionError) && (
                <div role="alert" className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                  <span>{actionError || error}</span>
                </div>
              )}
              {dataLossCount > 0 && (
                <div role="status" data-testid="usb-data-loss" className="mt-5 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
                  USB data loss detected ({dataLossCount}). Any active recording was stopped and its captured rows were kept.
                  {" "}The monitor attempts to recover automatically; only complete validated readings will appear.
                  {" "}Save or export captured rows before clearing and starting another recording.
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current RMS</p>
                  <div data-testid="current-reading" aria-live="polite" className="mt-2 flex items-baseline gap-2">
                    {hasReading ? (
                      <>
                        <span className="font-mono text-3xl font-semibold tracking-tight text-foreground">
                          {latest.currentAmps.toFixed(3)}
                        </span>
                        <span className="font-mono text-sm text-muted-foreground">A</span>
                      </>
                    ) : (
                      <span className="font-mono text-2xl text-muted-foreground">—</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasReading ? "Measured from the connected sensor" : "No measurement received"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bias midpoint</p>
                  <p className="mt-2 font-mono text-2xl font-medium">
                    {latest && Number.isFinite(latest.biasVolts) ? `${latest.biasVolts.toFixed(3)} V` : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Expected near 1.65 V</p>
                </div>
                <div className="rounded-lg border border-border bg-background/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Samples in window</p>
                  <p className="mt-2 font-mono text-2xl font-medium">
                    {latest && Number.isFinite(latest.sampleCount) ? latest.sampleCount.toLocaleString() : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Received from firmware</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-medium text-foreground">Calibration:</span>
                  {latest?.calibrationStatus || "No firmware status received"}
                </span>
                <span>{formattedTime ? `Last received ${formattedTime}` : "Waiting for first serial line"}</span>
              </div>
            </div>
          </div>

          <aside className="flex flex-col rounded-xl border border-border bg-card/50 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Download className="h-4 w-4 text-primary" aria-hidden="true" />
              Firmware files
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Download the sketch and all three helper headers. Keep all four files together in the same <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">sct013_usb</code> folder. Wi-Fi uploads stay disabled unless you explicitly configure validated hardware.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadFile("sketch")}
                className="min-h-11 justify-between border-primary/30 bg-primary/[0.04] text-left hover:bg-primary/10"
                data-testid="download-sketch"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4 text-primary" aria-hidden="true" />sct013_usb.ino</span>
                <span className="font-mono text-xs text-muted-foreground">.ino</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadFile("header")}
                className="min-h-11 justify-between border-border text-left"
                data-testid="download-header"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />RmsAccumulator.h</span>
                <span className="font-mono text-xs text-muted-foreground">.h</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadFile("upload")}
                className="min-h-11 justify-between border-border text-left"
                data-testid="download-upload"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />DeviceUpload.h</span>
                <span className="font-mono text-xs text-muted-foreground">.h</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadFile("config")}
                className="min-h-11 justify-between border-border text-left"
                data-testid="download-config"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />DeviceConfig.example.h</span>
                <span className="font-mono text-xs text-muted-foreground">.h</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => downloadFile("guide")}
                className="min-h-11 justify-between text-left text-muted-foreground hover:text-foreground"
                data-testid="download-guide"
              >
                <span className="flex items-center gap-2"><Download className="h-4 w-4" aria-hidden="true" />Wiring &amp; safety guide</span>
                <span className="font-mono text-xs">.md</span>
              </Button>
            </div>
            <div className="mt-auto pt-5">
              <div className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                <Cable className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>The firmware sends serial CSV at 115200 baud. Errors discard that window; they do not substitute a current value.</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">Bring-up sequence</p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">From sketch to serial.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Validate the bench circuit before asking the device to measure. Take each check in order.
            </p>
            <div className="mt-6 rounded-lg border border-border bg-card/50 p-4">
              <p className="text-sm font-semibold">Arduino IDE setup</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Install the <strong className="font-medium text-foreground">esp32 by Espressif Systems</strong> board package.
                Select <strong className="font-medium text-foreground">ESP32 Dev Module</strong> unless your board manufacturer specifies otherwise.
              </p>
            </div>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2">
            {[
              ["01", "Wire with USB unplugged", "Use four 10 kΩ resistors and a polarized 10 µF capacitor. Follow the downloaded guide exactly."],
              ["02", "Check the bias first", "With the CT disconnected, verify about 1.65 V at the bias node and both ADC inputs before attaching the CT."],
              ["03", "Verify, then upload", "Open sct013_usb.ino with RmsAccumulator.h, DeviceUpload.h, and DeviceConfig.example.h beside it. Select the correct USB port, click Verify, then Upload."],
              ["04", "Read at 115200 baud", "Open Arduino Serial Monitor to confirm output, then close it before connecting this page to the port."],
            ].map(([number, title, description]) => (
              <li key={number} className="flex gap-3 rounded-xl border border-border bg-card/40 p-4">
                <StepNumber>{number}</StepNumber>
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 grid gap-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.045] p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Read the safety boundary before wiring</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                This setup is for the SCT013 voltage-output <strong className="text-foreground">100 A / 1 V</strong> model,
                which already has an internal burden. Use only the documented 1.65 V bias and 0.5 input attenuation. Start
                with isolated low-voltage AC; clamp one insulated conductor only. Do not test with a DC fan, open energized
                equipment, or treat this unprotected bench circuit as an HVAC installation. Never connect mains or control
                voltage to the ESP32 or ADC.
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-200/90">
                <Check className="h-4 w-4" aria-hidden="true" />
                If upload stalls at “Connecting”, follow the board’s BOOT-button procedure and check for a USB data cable.
              </p>
            </div>
          </div>
          <a
            href="/"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Back to platform
          </a>
        </section>

        <footer className="mt-10 flex flex-col gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" aria-hidden="true" />On The Spot · local hardware bench</span>
          <span>Local recordings by default · account saving is always explicit</span>
        </footer>
      </div>
    </main>
  );
}
