import { useEffect, useRef, useState } from "react";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { parseBenchLine, type BenchRecord } from "@shared/bench";
import { buildBenchCsv } from "@/lib/bench-csv";
import { USB_OPEN_OPTIONS, usbConnectionError } from "@/lib/usb-connection";
import { readUsbStream } from "@/lib/usb-stream";
import { parseUsbLine } from "@/lib/usb-readings";

type UsbPort = {
  readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number; bufferSize: number }): Promise<void>;
  close(): Promise<void>;
};
type SerialBrowser = Navigator & { serial?: { requestPort(): Promise<UsbPort> } };

export function useBenchSerial(unitId: string | undefined, canUpload: boolean) {
  const [connection, setConnection] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [sample, setSample] = useState<BenchRecord | null>(null);
  const [history, setHistory] = useState<BenchRecord[]>([]);
  const [error, setError] = useState("");
  const [protocolMismatch, setProtocolMismatch] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadEnabled, setUploadEnabled] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [rejectedLines, setRejectedLines] = useState(0);
  const [skippedUploads, setSkippedUploads] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dataLossCount, setDataLossCount] = useState(0);
  const gapBeforeNextFrame = useRef(false);
  const port = useRef<UsbPort | null>(null);
  const reader = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const stop = useRef(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const finished = useRef<Promise<void> | null>(null);
  const options = useRef({ unitId, canUpload, uploadEnabled });
  options.current = { unitId, canUpload, uploadEnabled };
  const supported = typeof navigator !== "undefined" && !!(navigator as SerialBrowser).serial;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop.current = true;
      abort.current?.abort();
      void reader.current?.cancel().catch(() => {});
    };
  }, []);

  async function save(record: BenchRecord) {
    const selected = options.current;
    if (!selected.uploadEnabled || !selected.canUpload || !selected.unitId) return;
    if (busy.current) {
      if (mounted.current) setSkippedUploads(n => n + 1);
      return; // Never accumulate a replay queue or upload old frames after reconnect.
    }
    busy.current = true;
    if (mounted.current) setSaving(true);
    const controller = new AbortController();
    abort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await apiRequest("POST", "/api/bench/ingest",
        { unitId: selected.unitId, frame: record.frame }, { signal: controller.signal });
      const result = await response.json();
      if (mounted.current) {
        setLastSavedAt(result.ts);
        setSavedCount(n => n + 1);
        setUploadError("");
      }
    } catch (cause) {
      if (cause instanceof ApiError) {
        if ([401, 403, 404].includes(cause.status)) setUploadEnabled(false);
        cause = new Error(cause.status === 401 ? "Sign in again before saving." :
          cause.status === 403 ? "Account access is unavailable. Saving stopped." :
          cause.status === 404 ? "This unit is no longer available to your account. Saving stopped." :
          `Save failed (${cause.status}). This reading was not confirmed saved.`);
      }
      if (mounted.current) setUploadError(cause instanceof Error && cause.name !== "AbortError"
        ? cause.message : "Save interrupted or timed out. This reading was not confirmed saved.");
    } finally {
      window.clearTimeout(timeout);
      busy.current = false;
      if (mounted.current) setSaving(false);
      if (abort.current === controller) abort.current = null;
    }
  }

  async function readLoop(selectedPort: UsbPort) {
    let mismatched = false;
    try {
      await readUsbStream(selectedPort, {
        active: () => !stop.current && mounted.current,
        reader: value => { reader.current = value; },
        overrun: () => {
          gapBeforeNextFrame.current = true;
          // Change the ref before another frame can arrive. React state alone
          // could otherwise allow a post-gap upload before the next render.
          options.current = { ...options.current, uploadEnabled: false };
          abort.current?.abort();
          if (mounted.current) {
            setDataLossCount(n => n + 1);
            setSample(null);
            setUploadEnabled(false);
          }
        },
        line: line => {
          if (!line.trim() || stop.current) return false;
          if (mismatched) return false;
          if (parseUsbLine(line).kind === "sample") {
            mismatched = true;
            options.current = { ...options.current, uploadEnabled: false };
            abort.current?.abort();
            if (mounted.current) {
              setProtocolMismatch(true);
              setSample(null);
              setUploadEnabled(false);
              setRejectedLines(n => n + 1);
            }
            return false;
          }
          const frame = parseBenchLine(line);
          if (!frame) {
            if (mounted.current) setRejectedLines(n => n + 1);
            return false;
          }
          const record: BenchRecord = {
            receivedAt: new Date().toISOString(), frame,
            ...(gapBeforeNextFrame.current ? { usbDataLossBefore: true } : {}),
          };
          gapBeforeNextFrame.current = false;
          if (mounted.current) {
            setSample(record);
            setHistory(previous => [...previous.slice(-299), record]);
          }
          void save(record);
          return true;
        },
      });
    } catch (cause) {
      if (mounted.current && !stop.current) setError(
        `USB read stopped: ${usbConnectionError(cause)}`);
    } finally {
      reader.current = null;
      try { await selectedPort.close(); } catch { /* Device may already be unplugged. */ }
      port.current = null;
      abort.current?.abort();
      if (mounted.current) {
        setConnection("disconnected");
        setUploadEnabled(false);
      }
    }
  }

  async function connect() {
    if (port.current || connection !== "disconnected") return;
    setError("");
    setProtocolMismatch(false);
    setSample(null);
    setConnection("connecting");
    stop.current = false;
    let selected: UsbPort | null = null;
    try {
      if (!window.isSecureContext) throw new Error("USB serial requires HTTPS.");
      if (!supported) throw new Error("Use desktop Chrome or Edge on Windows.");
      selected = await (navigator as SerialBrowser).serial!.requestPort();
      if (!mounted.current || stop.current) return;
      await selected.open(USB_OPEN_OPTIONS);
      if (!mounted.current || stop.current) { await selected.close(); return; }
      port.current = selected;
      setConnection("connected");
      finished.current = readLoop(selected);
    } catch (cause) {
      if (mounted.current) {
        setConnection("disconnected");
        setError(usbConnectionError(cause));
      }
    }
  }

  async function disconnect() {
    stop.current = true;
    setUploadEnabled(false);
    abort.current?.abort();
    await reader.current?.cancel();
    await finished.current;
  }

  function exportCsv() {
    const csv = buildBenchCsv(history);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `fan-bench-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return { supported, connection, sample, history, error, protocolMismatch, uploadError, uploadEnabled,
    setUploadEnabled, lastSavedAt, savedCount, rejectedLines, skippedUploads,
    saving, dataLossCount, connect, disconnect, exportCsv };
}
