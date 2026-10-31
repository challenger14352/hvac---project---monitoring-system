import { isUsbOverrun } from "./usb-connection";

export interface UsbReadablePort {
  readonly readable: ReadableStream<Uint8Array> | null;
}

interface StreamCallbacks {
  active(): boolean;
  reader(value: ReadableStreamDefaultReader<Uint8Array> | null): void;
  line(value: string): boolean; // True only for a validated measurement.
  overrun(): void;
}

// Web Serial replaces its readable stream after a nonfatal receive error.
// Release the failed reader and acquire the replacement instead of closing USB.
export async function readUsbStream(port: UsbReadablePort, callbacks: StreamCallbacks) {
  let consecutiveOverruns = 0;
  let discardToNewline = false;
  while (callbacks.active()) {
    const stream = port.readable;
    if (!stream) throw new Error("USB device is no longer readable. Check the cable and reconnect.");
    const reader = stream.getReader();
    callbacks.reader(reader);
    const decoder = new TextDecoder();
    let pending = "";
    try {
      while (callbacks.active()) {
        const { value, done } = await reader.read();
        if (!callbacks.active()) return;
        if (done) throw new Error("USB stream ended. Check the cable and reconnect.");
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          if (discardToNewline) {
            // Bytes on either side of a receive error cannot form a valid row.
            discardToNewline = false;
            continue;
          }
          if (line.length > 16384) throw new Error("Serial line exceeded the buffer limit. Check the sketch and baud rate.");
          if (callbacks.line(line)) consecutiveOverruns = 0;
        }
        if (pending.length > 16384) throw new Error("Serial line exceeded the buffer limit. Check the sketch and baud rate.");
      }
    } catch (cause) {
      if (!callbacks.active()) return;
      if (!isUsbOverrun(cause)) throw cause;
      callbacks.overrun();
      consecutiveOverruns++;
      if (consecutiveOverruns >= 3) {
        throw new Error("USB receive buffer overrun persisted after 3 attempts without a valid measurement. Check the USB driver/cable and confirm the sketch uses 115200 baud, then reconnect.");
      }
      discardToNewline = true;
    } finally {
      reader.releaseLock();
      callbacks.reader(null);
    }
  }
}
