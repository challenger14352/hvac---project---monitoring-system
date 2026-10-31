import { Link } from "wouter";

export default function UsbProtocolMismatch({ target, busy }: {
  target: "bench" | "connect";
  busy: boolean;
}) {
  const label = target === "bench" ? "temperature/current bench" : "SCT013 CSV monitor";
  return (
    <div role="alert" data-testid="usb-protocol-mismatch" className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm leading-6">
      <p>
        {target === "bench" ? "Detected ots-bench-v1 JSON firmware." : "Detected legacy SCT013 CSV firmware."}
        {" "}This sketch belongs on the {label} page. No measurements from this protocol were accepted here.
        {" "}You do not need to reflash the ESP32.
      </p>
      {busy ? (
        <p>Disconnect the device on this page before opening the {label}.</p>
      ) : (
        <Link href={`/${target}`} className="font-medium text-primary underline">
          Open {label}
        </Link>
      )}
    </div>
  );
}
