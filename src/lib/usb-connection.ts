// Allow room for USB/driver bursts without changing the firmware's baud rate.
export const USB_OPEN_OPTIONS = { baudRate: 115200, bufferSize: 65536 };

export function isUsbOverrun(cause: unknown): boolean {
  return cause instanceof Error &&
    (cause.name === "BufferOverrunError" || /buffer overrun/i.test(cause.message));
}

export function usbConnectionError(cause: unknown): string {
  const name = cause instanceof Error ? cause.name : "";
  const message = cause instanceof Error ? cause.message : "USB connection failed.";
  if (isUsbOverrun(cause)) {
    if (message.includes("persisted after 3 attempts")) return message;
    return "USB receive buffer overrun — incoming serial data was lost. Unplug and reconnect the ESP32, then reconnect here. Use the supplied 115200-baud sketch. If it repeats, try another USB data cable or a direct computer USB port. This does not mean Serial Monitor is open.";
  }
  if (name === "NotFoundError") {
    return "No port selected. Choose the ESP32 port when you are ready.";
  }
  if (name === "SecurityError" || name === "NotAllowedError") {
    return "USB permission was blocked. Open this page in its own desktop Chrome or Edge tab and allow access to the ESP32 port.";
  }
  return `${message} Check the USB cable and selected ESP32 port. If another app or browser tab is using the port, disconnect it before retrying.`;
}
