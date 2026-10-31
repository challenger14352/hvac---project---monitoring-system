import { useCallback, useRef, useState } from "react";
import type { UsbSample } from "@/lib/usb-readings";
import { MAX_BENCH_SAMPLES } from "@shared/bench";
export { MAX_BENCH_SAMPLES };

export function useBenchRecorder() {
  const active = useRef(false);
  const buffer = useRef<UsbSample[]>([]);
  const [samples, setSamples] = useState<UsbSample[]>([]);
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const stop = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    setRecording(false);
    setEndedAt(new Date().toISOString());
  }, []);
  const onSample = useCallback((sample: UsbSample) => {
    if (!active.current || buffer.current.length >= MAX_BENCH_SAMPLES) return;
    buffer.current.push({ ...sample });
    setSamples([...buffer.current]);
    if (buffer.current.length === MAX_BENCH_SAMPLES) {
      setLimitReached(true);
      stop();
    }
  }, [stop]);
  const start = useCallback(() => {
    // Starting cannot silently overwrite an earlier recording.
    if (active.current || buffer.current.length) return;
    setSessionId(crypto.randomUUID());
    setStartedAt(new Date().toISOString());
    setEndedAt(null);
    setLimitReached(false);
    active.current = true;
    setRecording(true);
  }, []);
  const clear = useCallback(() => {
    active.current = false;
    buffer.current = [];
    setSamples([]);
    setRecording(false);
    setStartedAt(null);
    setEndedAt(null);
    setSessionId(null);
    setLimitReached(false);
  }, []);
  return { samples, recording, startedAt, endedAt, sessionId, limitReached, onSample, start, stop, clear };
}
export type BenchRecorder = ReturnType<typeof useBenchRecorder>;
