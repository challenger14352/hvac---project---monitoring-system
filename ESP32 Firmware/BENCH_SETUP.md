# Box-fan bench setup — ESP32, DS18B20, ADS1115 and SCT013

**ESP32 not programmed yet?** Start with [First run from an unprogrammed ESP32 —
Windows](FIRST_RUN_WINDOWS.md). It gives a temperature-only first run, Windows
upload and CSV steps, then a separate, explicitly replacement current circuit.
Do not mix its direct-biased current circuit with the earlier photographed
AC-coupled arrangement.

This guide accompanies `esp32_bench/esp32_bench.ino` and the platform’s `/bench`
page. It is a **reference connection plan**, not a certification of your existing
wiring. The photographs do not establish resistor values, capacitor polarity,
continuity, solder-joint quality, or every wire destination.

## What this does

DS18B20 probes → ESP32 → USB cable → Windows Chrome/Edge → `/bench`.

SCT013 → checked bias circuit → ADS1115 → ESP32 joins the same USB stream once
current measurement is enabled. You do not need Wi-Fi or a firmware API key.
The browser can display local readings without login. Saving requires your
normal signed-in session and a dedicated **bench_test** unit in your account.

These are fan/filter bench measurements, not an HVAC diagnostic experiment.
No pressure sensor is present, so we do **not** measure pressure drop or airflow.
A fan does not have a cooling coil; do not expect supply/return cooling ΔT.
Temperature probes placed before/after the filter do not measure filter restriction.

## 1. Safety and parts check — before power

- Unplug the ESP32 USB cable and the fan before changing connections.
- Do not open the fan, remove its guards, cut/separate its cord, open a wall
  outlet, or put mains wires on a breadboard. There is no direct electrical
  connection between the fan's mains supply and this acquisition circuit.
- For current measurements use a commercially enclosed, appropriately
  rated/listed **AC line splitter intended for clamp-meter measurements**,
  according to its instructions. The CT surrounds the splitter’s marked
  measurement opening, never exposed mains wiring. If you do not have one,
  do the temperature-only test first. Clamping an intact ordinary cord enclosing
  both line and neutral normally gives near-zero net current.
- Check the splitter's rating against the fan and outlet. Do not make your own
  separated cable. Use only a marked x1 or x10 measurement loop and set the
  matching firmware multiplier.
- Keep all leads and probes outside the fan guards, away from blades and motor,
  secured so airflow cannot pull them in. Keep the breadboard and USB equipment
  separate from moving parts, liquid, and mains plugs.
- Do not completely obstruct the fan or use an unsuitable filter arrangement.
  Follow the fan/filter manufacturers’ guidance. Use a listed purpose-built
  fan/filter arrangement if available; otherwise start with unobstructed fan
  observations. Never assume an arbitrary box fan is suitable for a filter.
  Supervise short tests and stop immediately for unusual heat, smell, vibration,
  noise, damaged cables, or an unstable setup.
- The pictured CT is **YHDC SCT013 100 A / 1 V**, a voltage-output model.
  Do not follow SCT013-000 100 A / 50 mA burden-resistor instructions.
- You need a **4.7 kΩ pull-up resistor** for the DS18B20 bus. For the reference CT
  bias circuit below, you also need **two 10 kΩ resistors** and **one 10 µF
  capacitor rated at least 6.3 V**. A multimeter is needed for the DC checks.
  Verify the parts you have; the photos alone cannot identify their values.
  If these are missing, current acquisition is not ready merely because wires
  are attached.
- Loose female jumper connectors on unsoldered header pins are not reliable
  electrical joints. Inspect the ADS1115 header connections; use properly
  soldered headers or suitable manufacturer-supported connectors.

## 2. Controller and ADS1115 — compare with your assembly

Use the **printed terminal labels**, not positions counted from a photo.
Your controller is an ESP32-WROOM-32UE development board, not an ESP32-S3.
Power the controller through its USB connector only during this test.

| ESP32 terminal | ADS1115 pin | Purpose |
| --- | --- | --- |
| **3V3** | **VIN** | 3.3 V power / I²C logic pull-up supply |
| **GND** | **GND** | Common low-voltage ground |
| **21** | **SDA** | I²C data |
| **22** | **SCL** | I²C clock |
| **GND** | **ADDR** | Explicit default address 0x48 |

Leave **ALRT** unused. Leave analog **A2** and **A3** unused. The pins marked
**A+ / A−** are filtered supply outputs on the shown Adafruit revision, **not**
analog channels: do not confuse them with A0/A1. Use VIN/GND for power as above.

Do not power the ADS1115 from 5 V in this wiring plan: its I²C pull-ups would then
be wrong for direct ESP32 logic. The ADC’s ±4.096 V gain setting is a
**differential conversion scale**, not permission for an input pin to go negative
or above the 3.3 V supply.

## 3. DS18B20 probes — start with one

Use normal three-wire powered operation, **not parasite power**.

| Verified probe function | Connect to |
| --- | --- |
| VDD / power | ESP32 **3V3** |
| GND / ground | ESP32 **GND** |
| DQ / data | ESP32 terminal **4** (GPIO 4) |

Put **one 4.7 kΩ resistor between GPIO 4 / DQ and 3V3**. It is a pull-up across
those two nodes, not a series resistor in the data wire.

Many waterproof probes use red = VDD, black = GND, yellow = DQ. **Verify the
seller’s pinout for your actual cable before applying power; colors alone are
not a guaranteed pinout.** Do not apply the pin orientation of a bare TO-92 chip
to a sealed cable probe.

Additional DS18B20s share the same three nodes in parallel and one shared
pull-up. This firmware reports up to five probes by their permanent 16-digit
ROM addresses, not as assumed return/supply channels. Start with one, then add
one at a time. Record which address belongs to each physical probe by gently
warming one probe in your hand.

## 4. Reference SCT013 circuit — check, do not assume

This firmware uses **differential A0 minus A1** with both inputs held near the
middle of the 3.3 V supply. It does not assume a CT lead is connected to ground.

With USB and fan unplugged, construct or verify these exact low-voltage nodes:

```text
ESP32 3V3 ── 10 kΩ resistor ──┐
                              ├── BIAS node ───────── ADS1115 A1
ESP32 GND ── 10 kΩ resistor ──┘       │
                                     ├── SCT013 output lead 1
                                     │
                                     └── (+) 10 µF capacitor (−) ── GND

SCT013 output lead 2 ──────────────────────────────── ADS1115 A0

ADS1115 VIN = 3V3; ADS1115 GND = ESP32 GND.
```

For this RMS magnitude measurement, swapping the **two identified CT signal
leads** reverses phase but not RMS current. If its cable has extra contacts,
shield, or a jack, identify the actual output pair from the supplier information
and continuity checks; do not guess based on cable colors or cut a cable.

There is **no additional external burden resistor across the CT** in this
voltage-output reference circuit. The two 10 kΩ resistors are the voltage
divider, not burden resistors. Do not remove or repurpose your existing parts
unless you have first identified how they are connected and what they are.

Check capacitor polarity carefully: **positive to BIAS, negative/striped side
to GND**. Do not connect the CT output to the ESP32’s 5 V pin.

### DC checks, with fan disconnected from power

1. First verify the wiring while everything is unplugged. Check common grounds,
   resistor values, and no short between 3V3 and GND.
2. Leave the CT away from any energized conductor. Power only the ESP32 by USB.
3. Measure **3V3 to GND**: it should be approximately 3.3 V.
4. Measure **BIAS/A1 to GND**: approximately 1.65 V.
5. Measure **A0 to GND**: also approximately 1.65 V with the CT connected and no
   sensed current. A0/A1 must remain within the ADC supply rails during operation.
6. If the readings differ substantially, stop, unplug USB, and correct the
   circuit. Do not try to fix physical wiring with a calibration factor.

These checks and firmware range flags are not overvoltage protection and cannot
prove a circuit safe from photographs. This is only a low-current fan bench
setup; do not apply it to high-current HVAC equipment.

## 5. Install and upload the ESP32 program on Windows

1. Install Arduino IDE 2 from **https://www.arduino.cc/en/software/**.
2. In File → Preferences → Additional boards manager URLs, add:
   **https://espressif.github.io/arduino-esp32/package_esp32_index.json**
3. In Boards Manager, install **esp32 by Espressif Systems**. The reproducible
   verification target for this project is **3.0.7**.
4. In Library Manager, install:
   - **OneWire** by Paul Stoffregen, **2.3.8**
   - **DallasTemperature**, **4.0.6**
   - **Adafruit ADS1X15**, **2.5.0**, including its **Adafruit BusIO** dependency
5. Download the firmware from `/bench`. Put `esp32_bench.ino` inside a folder
   named exactly **esp32_bench**, then open it in Arduino IDE.
6. Select **ESP32 Dev Module**, not ESP32-S3. Connect a USB **data** cable.
   Select the COM port that appears when this controller is plugged in.
7. Leave `ENABLE_CT_MEASUREMENT = false` for the first temperature-only run.
8. Upload. If the board stays on “Connecting…”, hold **BOOT** briefly as upload
   begins, then release it when writing starts. If no COM port appears, use
   Windows Device Manager to identify the USB bridge and install only the
   matching CP210x/CH340 driver from its manufacturer—not an arbitrary driver.
9. Open Serial Monitor at **115200 baud**. After startup, newline-separated JSON
   frames should appear. A real DS18B20 appears with its ROM address and `c`
   value. An empty `temperatures` array means no probe was detected. A `null`
   temperature means a detected reading failed. Neither is replaced by sample data.
10. Close Serial Monitor before opening the browser connection; one program at
    a time can hold this COM port.

There is no need to paste a website password, session cookie, Wi-Fi password,
or API key into this firmware.

## 6. Display the real USB stream on this platform

1. Open this project's preview in a **new browser tab**, then go to **`/bench`**.
   Use Windows desktop Chrome or Edge over HTTPS. An embedded preview may
   deny serial permission; Safari/Firefox do not provide the required Web Serial
   support for this workflow.
2. Click **Connect USB**, select the ESP32’s COM port in the browser chooser,
   and allow the connection. If you see a differently worded connect button,
   its function is the same. It opens at 115200 baud.
3. The page shows **only frames it actually receives**, with arrival time,
   address-identified temperatures, and current quality status. It shows no fake
   reading while waiting. Data becomes stale after ten seconds without a frame.
4. Warm a probe gently in your hand and look for a change. This is a new physical
   observation for you to make, not a result already established by this guide.
5. Use **Export CSV** to retain the browser's most recent 300 received frames.
   Longer runs require periodic exports; the page is not an unlimited logger.
6. Keep the tab open and in the foreground. Sleep, closing the tab, USB
   disconnection, or browser restrictions stop collection. Nothing uploads
   directly from the ESP32 after the browser stops.

### Save to your account, optionally

- Sign into the platform normally. The public sample demo is not the save target.
- Create a separate test customer in the normal application if needed.
- On `/bench`, select that customer and explicitly create/select a dedicated
  **Box fan bench** unit with type **bench_test**.
- Enable the page’s save option. The browser uses your existing account session
  to POST **`/api/bench/ingest`**; only your own bench unit is accepted.
- Look for a **server-confirmed save time/count**. Local arrival is not the
  same as a confirmed saved reading. Failed saves show an error; there is no
  hidden offline upload queue. An interrupted request can have an uncertain
  outcome, so “not confirmed” does not necessarily mean nothing was written.
- The saved snapshot is labeled stored data, not a live connection. All test
  keys begin `bench_`; this route never runs the HVAC diagnostic worker.
- Saving can preserve numeric acquisition metadata but is not device attestation,
  calibration certification, or a claim the server independently verified a sensor.

## 7. Enable current only after the circuit and splitter checks

1. Unplug the fan. Complete the reference-circuit/DC checks in section 4.
2. With the fan still unplugged, fit the CT around the commercial splitter's
   designated measurement opening per the splitter instructions. Keep guards
   and all electrical enclosures intact.
3. In the sketch set `ENABLE_CT_MEASUREMENT = true`.
4. Set `LINE_SPLITTER_MULTIPLIER` to **1** for the marked x1 loop, or **10**
   for the marked x10 loop. Do not use guessed multipliers or the whole cord.
5. Leave `CALIBRATION_FACTOR = 1.0` initially; upload the sketch again.
6. Reconnect `/bench`. With the fan off, inspect the reported bias and quality
   status. Only then perform a short, supervised fan run according to the
   manufacturers' safety instructions.
7. The software samples the CT voltage across A0–A1 for approximately two
   seconds using completed ADS1115 conversions, subtracts the DC mean, and
   calculates:

   `CT voltage RMS = sqrt(mean((sample voltage − mean voltage)^2))`

   `fan current estimate = CT voltage RMS × 100 × calibration factor / splitter multiplier`

8. A displayed zero/noisy value is not proof the fan is off. A 100 A CT is
   oversized for many small fans, and low-current accuracy can be poor.
   A correctly rated commercial x10 splitter can improve signal level but
   does not establish accuracy. The ADC sampling bandwidth is limited and may
   miss higher-frequency waveform content.
9. Compare against a suitable reference true-RMS instrument at a stable,
   comfortably measurable load before reporting accuracy. Do not use the fan's
   nameplate rating as a calibration measurement. If you have a valid reference,
   the new factor is:

   `new factor = old factor × reference amps / displayed amps`

   Do not divide by zero or calibrate against noise. Record the reference,
   load, date, splitter loop, factor, and uncertainty. The UI continues to label
   current an estimate; no verified calibration is claimed.

## 8. Suggested fan/filter observations

Use only a manufacturer-appropriate, mechanically stable fan/filter arrangement.
First record a baseline with fixed fan speed, probe positions, and room
conditions. Then record the compatible filter condition without obstructing
the motor’s cooling or changing other variables. Label notes and times yourself.

Do not assume adding a filter must increase current: the direction depends on
the motor and fan. Do not infer airflow, filter pressure drop, energy consumption
in kWh, refrigerant charge, or HVAC fault status from this test. Current alone is
not real power, and a small ambient temperature difference may just be sensor
offset or room variation. Report only changes you actually measure.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No COM port | USB data cable; Windows Device Manager; correct USB bridge driver |
| Port busy / browser cannot open | Close Arduino Serial Monitor and other serial programs; open HTTPS `/bench` in a top-level Chrome/Edge tab |
| No temperatures | DQ goes to terminal **4**, shared GND, 3V3, 4.7 kΩ DQ pull-up, verified cable pinout |
| Null temperature | Sensor disconnected/CRC or conversion error; inspect connections with power off |
| Current `disabled` | Default firmware safety setting; finish circuit checks before enabling |
| Current `adc_missing` | 3V3/GND, SDA=21, SCL=22, ADDR=GND, soldered/secure headers; reset after repair |
| `input_out_of_range` | Stop the fan, unplug it and USB, recheck bias/CT/input wiring; software cannot protect against a bad circuit |
| `sampling_error` | Invalid/insufficient window or out-of-range result; inspect connections and serial metadata; do not treat it as zero |
| Current near zero with fan running | Whole-cord cancellation, incorrect loop/multiplier, signal too small, wiring problem; never expose mains to solve it |
| Save rejected | Sign in; select your own unit of type `bench_test`; inspect explicit error and confirmed-save status |

## Verification boundaries

The supplied photos confirm component identities, not circuit continuity or
physical operation. Software tests use explicitly synthetic protocol fixtures;
they are not experimental sensor data. We cannot flash your USB device,
energize the fan, or verify physical readings from this development environment.
Compilation and application tests, when reported, verify software only.

See `hardware/SOURCES.md` for hardware/library references and AI assistance.
