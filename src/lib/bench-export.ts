import type { UsbSample } from "./usb-readings";

export function benchCsv(samples: UsbSample[]) {
  const columns: (keyof UsbSample)[] = [
    "receivedAt", "uptimeMs", "currentAmps", "biasVolts", "sampleCount",
    "adcRmsVolts", "ctRmsVolts", "meanOffsetVolts", "calibrationStatus",
  ];
  return columns.join(",") + "\r\n" + samples.map(sample =>
    columns.map(key => `"${String(sample[key]).replaceAll('"', '""')}"`).join(","),
  ).join("\r\n") + "\r\n";
}

export function downloadBenchCsv(samples: UsbSample[]) {
  if (!samples.length) return;
  const url = URL.createObjectURL(new Blob([benchCsv(samples)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `esp32-bench-${new Date().toISOString().replaceAll(":", "-")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
