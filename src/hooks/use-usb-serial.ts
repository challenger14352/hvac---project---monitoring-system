import { useCallback, useEffect, useRef, useState } from "react";
import { parseUsbLine, type UsbSample } from "@/lib/usb-readings";
import { USB_OPEN_OPTIONS, usbConnectionError } from "@/lib/usb-connection";
import { readUsbStream } from "@/lib/usb-stream";
import { parseBenchLine } from "@shared/bench";

export type { UsbSample } from "@/lib/usb-readings";

interface UsbPort {
  readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number; bufferSize: number }): Promise<void>;
  close(): Promise<void>;
}

interface UsbSerial {
  requestPort(): Promise<UsbPort>;
}

function serialApi(): UsbSerial | undefined {
  return typeof navigator === "undefined"
    ? undefined
    : (navigator as Navigator & { serial?: UsbSerial }).serial;
}

export function useUsbSerial(onSample?: (sample: UsbSample) => void, onDataLoss?: () => void) {
  const onSampleRef = useRef(onSample);
  onSampleRef.current = onSample;
  const onDataLossRef = useRef(onDataLoss);
  onDataLossRef.current = onDataLoss;
  const supported = !!serialApi() && window.isSecureContext;
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protocolMismatch, setProtocolMismatch] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [latest, setLatest] = useState<UsbSample | null>(null);
  const [dataLossCount, setDataLossCount] = useState(0);
  const generation = useRef(0);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const sessionRef = useRef<Promise<void> | null>(null);
  const lastSampleAt = useRef(0);

  const connect = useCallback(async () => {
    const serial = serialApi();
    if (!serial || !window.isSecureContext) {
      setError("USB connection requires desktop Chrome or Edge over HTTPS.");
      return;
    }
    if (sessionRef.current) return;
    const id = ++generation.current;
    setConnecting(true);
    setError(null);
    setProtocolMismatch(false);
    setLatest(null);
    setDataLossCount(0);
    setStatus("Choose your ESP32 USB port");
    lastSampleAt.current = 0;

    const session = (async () => {
      let port: UsbPort | undefined;
      let opened = false;
      let mismatched = false;
      try {
        port = await serial.requestPort();
        if (generation.current !== id) return;
        await port.open(USB_OPEN_OPTIONS);
        opened = true;
        if (generation.current !== id) return;
        if (!port.readable) throw new Error("The selected port has no readable USB stream.");
        setConnected(true);
        setConnecting(false);
        setStatus("Connected — waiting for bench readings");
        lastSampleAt.current = Date.now();
        await readUsbStream(port, {
          active: () => generation.current === id,
          reader: reader => { readerRef.current = reader; },
          overrun: () => {
            setLatest(null);
            setDataLossCount(count => count + 1);
            setError(null);
            setStatus("Recovering USB stream — waiting for a complete reading");
            lastSampleAt.current = Date.now();
            onDataLossRef.current?.();
          },
          line: line => {
            if (mismatched) return false;
            if (parseBenchLine(line)) {
              mismatched = true;
              setProtocolMismatch(true);
              setLatest(null);
              setError(null);
              setStatus("Wrong USB protocol — disconnect before switching pages");
              lastSampleAt.current = 0;
              onDataLossRef.current?.();
              return false;
            }
            const message = parseUsbLine(line);
            if (message.kind === "sample") {
              onSampleRef.current?.(message.sample);
              setLatest(message.sample);
              setError(null);
              setStatus("Receiving uncalibrated bench readings");
              lastSampleAt.current = Date.now();
              return true;
            } else if (message.kind === "error" || message.kind === "notice") {
              setLatest(null);
              lastSampleAt.current = Date.now();
              setStatus(message.kind === "error" ? "Sensor error — reading invalid" : "Waiting for a measurement");
              setError(message.kind === "error" ? message.message : null);
            }
            return false;
          },
        });
      } catch (cause) {
        if (generation.current === id) {
          setError(usbConnectionError(cause));
          setStatus("Disconnected");
        }
      } finally {
        if (opened && port) {
          try { await port.close(); } catch {
            // A physically disconnected port may already be closed.
          }
        }
        if (generation.current === id) {
          setConnected(false);
          setConnecting(false);
          setLatest(null);
        }
      }
    })();
    sessionRef.current = session;
    await session;
    if (sessionRef.current === session) sessionRef.current = null;
  }, []);

  const disconnect = useCallback(async () => {
    ++generation.current;
    setConnecting(true);
    setLatest(null);
    setStatus("Disconnecting");
    try {
      await readerRef.current?.cancel();
      await sessionRef.current;
    } catch {
      // The read loop reports failures; a canceled/disconnected stream is closed there.
    } finally {
      setConnected(false);
      setConnecting(false);
      setError(null);
      setStatus("Disconnected");
    }
  }, []);

  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(() => {
      if (lastSampleAt.current && Date.now() - lastSampleAt.current > 10000) {
        setLatest(null);
        setError("No fresh measurement for 10 seconds. Check the ESP32 and wiring.");
        setStatus("No fresh readings");
        lastSampleAt.current = 0;
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [connected]);

  useEffect(() => () => {
    ++generation.current;
    void readerRef.current?.cancel().catch(() => {});
  }, []);

  return { supported, connected, connecting, error, protocolMismatch, status, latest, dataLossCount, connect, disconnect };
}
