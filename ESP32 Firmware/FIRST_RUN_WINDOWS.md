# First run from an unprogrammed ESP32 — Windows

This is a proposed procedure for your current starting point, not a record of a
successful hardware run. The firmware has compiled and the software pathway has
been tested using synthetic fixtures. Your circuit, flashed board and readings
have not been physically verified.

**Complete temperature recording first. Add current only after that works.**
No Wi-Fi password, device token, or platform secret belongs in this sketch.

## 1. Gather these items

For the first stage:
- ESP32-WROOM-32UE development board and screw-terminal adapter.
- Windows computer, a **USB data cable**, Arduino IDE 2, and Chrome or Edge.
- One DS18B20 probe, one **4.7 kΩ** pull-up resistor, jumpers and breadboard.
- Firmware: `/api/bench/files/firmware` on this platform, also available from
  the **Download firmware** link on `/bench`.

For the later current stage:
- Your Adafruit ADS1115 and **SCT013 100 A / 1 V** voltage-output clamp.
- **Two 10 kΩ resistors**, one **10 µF capacitor rated at least 6.3 V**,
  and a multimeter for DC checks.
- An enclosed, appropriately rated/listed **AC clamp-meter line splitter**.
  You cannot measure the fan's current by clamping its entire intact cord.
  Do not cut the cord, expose individual mains conductors, or open the fan.

Do not substitute an unidentified resistor for the required 4.7 kΩ pull-up.
Check its label or measure it with power disconnected.

## 2. Make the first stage temperature-only

1. Unplug ESP32 USB and unplug the fan from mains.
2. Disconnect the ADS1115 and the current-sensor breadboard circuit from the
   ESP32 for this first test. Set the ADS1115/SCT assembly aside disconnected.
   The firmware can run the temperature stage without an ADS1115 attached.
3. Remove the DS18B20 leads from their existing terminal rows. Those rows did
   not visibly establish the required power and data connections.
4. Use a clear area around numbered rows **10, 11 and 12**, on the **A–E**
   half of the breadboard. Remove any existing connection in those three
   groups before using them. On a standard solderless breadboard, A–E share
   a connection within one numbered row, but not between different rows.
   Confirm the printed numbering and board connectivity; do not use the
   earlier ambiguous “0/10” coordinates from the photographed checklist.
5. Confirm the probe's VDD/GND/DQ wire functions with its supplier. Red=VDD,
   black=GND and yellow=DQ are common, but wire colors alone are not proof.
6. Connect the following, using **3V3**, not VIN/5V:

| Item | Breadboard hole / connection |
| --- | --- |
| Probe VDD, commonly red | A10 |
| ESP32 terminal **3V3** jumper | B10 |
| Probe GND, commonly black | A11 |
| ESP32 terminal **GND** jumper | B11 |
| Probe DQ/data, commonly yellow | A12 |
| ESP32 terminal **4 / GPIO 4** jumper | B12 |
| **4.7 kΩ resistor** | One end C10, other end C12 |

The resistor connects **3V3 to data**, not data to ground. The power rails are
not needed for this first stage. Avoid bare leads touching adjacent wires.
Keep the probe outside fan guards and away from blades.

## 3. Install Arduino IDE and ESP32 support on Windows

1. Download **Arduino IDE 2** from https://www.arduino.cc/en/software and install it.
2. Open **File → Preferences**.
3. Add this to **Additional boards manager URLs**, keeping existing entries:

   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`

4. Open **Tools → Board → Boards Manager**, search for **esp32**, and install
   **esp32 by Espressif Systems**, version **3.0.7**. This is the version used
   for the compile check, not a claim that it is the newest release.
5. In **Library Manager**, install these tested versions:

| Library | Version |
| --- | --- |
| OneWire | 2.3.8 |
| DallasTemperature | 4.0.6 |
| Adafruit ADS1X15 | 2.5.0 |
| Adafruit BusIO | 1.17.4 |

Choose **Install all dependencies** when offered; select the BusIO version
above if necessary. ADS1X15/BusIO are needed to compile this combined sketch
even while the physical ADS1115 is disconnected.

## 4. Upload the firmware for the first time

1. Download `esp32_bench.ino` from the platform's `/bench` page.
2. Open it in Arduino IDE. If asked to move it to a folder named
   `esp32_bench`, accept.
3. Leave this line unchanged for the first stage:

   `constexpr bool ENABLE_CT_MEASUREMENT = false;`

4. After checking the temperature wiring, connect the ESP32 to Windows using
   the USB data cable.
5. Choose **Tools → Board → esp32 → ESP32 Dev Module**.
   Do not choose an ESP32-S3 or ESP8266 board.
6. Choose **Tools → Port → COM…** for your connected board. If uncertain,
   compare the list with the board unplugged and plugged in.
7. Click **Verify** (checkmark) and wait for compilation to finish.
8. Click **Upload** (arrow) and wait for **Done uploading** or an equivalent
   successful completion message.
9. If it repeatedly remains at **Connecting…**, hold the board's **BOOT**
   button while initiating upload; release it when writing begins.
   If that fails, record the exact error rather than changing random settings.
10. Open **Tools → Serial Monitor**, set **115200 baud**, and press the board's
    reset/EN button once if needed.

After startup, expect repeated JSON lines containing `protocol`, `seq` and
`temperatures`. A detected probe has an address and a numeric `c` value.
`current_status` should be `disabled`, and `current_a` should be `null`:
**that is intentional, not a current-sensor failure.**

- If there is no COM port: check the data cable and Windows Device Manager.
  Identify the actual USB bridge before installing its manufacturer's driver;
  do not assume this board uses a particular bridge.
- If `temperatures` is empty: check the verified probe pinout, common ground,
  GPIO 4, the pull-up resistor and the exact breadboard groups.
- If a temperature is `null`: it is not a valid reading; do not record it as zero.
- If the text is unreadable: confirm **115200 baud**.

## 5. View and record actual incoming temperature frames

1. **Close Serial Monitor** and any other application holding the COM port.
   Arduino IDE itself can stay open.
2. On the same Windows computer, open the platform's **`/bench`** page in
   **Chrome or Edge in a separate top-level HTTPS tab**, not just the embedded
   preview. Firefox does not provide the Web Serial API this page requires.
3. Click **Connect serial device**.
4. Select the ESP32's serial port and approve the browser permission.
5. Wait for **Local frame received**, the probe's address and its temperature
   in **°C**. Before a valid frame arrives, the page shows no invented reading.
6. For a first observation, leave the probe still, then gently warm its tip
   in your hand and observe whether readings change. This is an observation
   for you to make, not a result this guide claims.
7. Click **Export CSV** and check the downloaded file. It contains only the
   browser's most recent **300 validated frames**, not an unlimited history.
   Export periodically and before closing/reloading the page.
8. Keep the computer awake, USB attached, and the tab open in the foreground.
   A disconnect or more than ten seconds without frames is marked not live.

CSV times are the computer/browser's frame-arrival times, not a calibrated
timestamp generated by the probe. Keep a separate note of what you did and
when; do not interpret missing or invalid values as zero.

### Optional: retain confirmed frames on the platform

Do this **before a recording run** if you want database storage too:

1. Disconnect the serial session and export any local frames you want to keep
   before signing in or navigating away.
2. Sign into the platform normally and create a separate test customer if needed.
3. Return to `/bench`. Select the test customer under **Account**.
4. Click **Create Box fan bench unit**, or select a previously created
   `bench_test` unit. Do not select an actual HVAC unit.
5. Connect the serial device again and wait for a fresh frame.
6. Check **Allow live frames to save**.
7. Confirm that **Confirmed saves** increases and a **Last server-confirmed save**
   time appears. Reading locally does not mean a server save succeeded.

Only new frames after opting in are uploaded. There is no backlog replay or
offline save queue. Errors mean saving is not confirmed, not necessarily that
no part of an interrupted request was written. Internet/session access is
needed for server saves; the ESP32 itself does not use Wi-Fi.

## 6. Add current using ONE consistent reference circuit

**Do this only after temperature reception and recording work.**

Your photographed arrangement is AC-coupled. The steps below **replace that
old current section with the simpler direct-biased reference circuit** from
`BENCH_SETUP.md`. They are not instructions to move a single wire in the old
circuit. Both approaches must not be combined.

1. Export data, disconnect the browser session, unplug USB, and unplug the fan.
2. Remove the **old current-sensor** resistors, both old current capacitors and
   their current-sensor wiring. Keep the working DS18B20 wiring and its
   **4.7 kΩ** pull-up in rows 10–12. Disconnect both SCT leads from their old
   connections, including its former ground connection.
3. Use **two 10 kΩ resistors and one 10 µF capacitor** for the new circuit.
   Set the unused third 10 kΩ resistor and second capacitor aside.
4. In the same A–E half, clear rows **18, 20, 22 and 30**. Wire:

| Connection | Exact placement |
| --- | --- |
| 3.3 V feed | Jumper **E10 → A18** |
| Ground feed | Jumper **E11 → A22** |
| Upper 10 kΩ resistor | **B18 → B20** |
| Lower 10 kΩ resistor | **C20 → C22** |
| 10 µF capacitor | **Positive D20**, **negative D22** |
| SCT red lead | **E20**, the BIAS node — **not ground in this new layout** |
| SCT white lead | **A30**, the SIGNAL node |
| ADS1115 **A1** jumper | **A20**, BIAS |
| ADS1115 **A0** jumper | **B30**, SIGNAL |
| ADS1115 **VIN** jumper | **D10**, 3.3 V |
| ADS1115 **GND** jumper | **D11**, common ground |
| ADS1115 **ADDR** jumper | **C11**, common ground |
| ADS1115 **SDA** | ESP32 **21** |
| ADS1115 **SCL** | ESP32 **22** |

Leave ADS **ALRT, A2 and A3** unused. Do not use the Adafruit board's **A+ / A−**
supply-output terminals as analog inputs. This SCT013 100 A / 1 V has an
internal burden; do not add a burden for the different 100 A / 50 mA model.

5. Inspect for shorts and verify capacitor polarity using its negative stripe.
   Use secure, properly soldered ADS headers or manufacturer-supported
   connections. Loose female leads on unsoldered header pins are not a reliable
   completed assembly.
6. Keep the fan unplugged. Apply **USB power only** and measure these with
   the meter on DC volts, black lead to common GND:
   - Row 18 / ADS VIN: approximately **3.3 V**.
   - Row 20 / ADS A1 / BIAS: approximately **1.65 V**.
   - Row 30 / ADS A0 / SIGNAL: approximately **1.65 V** with no current.
   These are expectations, not established measurements. If any is wrong,
   disconnect USB and correct the wiring. **No meter or failed checks means
   stop at temperature-only recording.** Software checks cannot protect a
   miswired ADC from damage.
7. Once those checks pass, change the sketch line to:

   `constexpr bool ENABLE_CT_MEASUREMENT = true;`

8. Match `LINE_SPLITTER_MULTIPLIER` to the splitter loop you will actually use:
   **1 for x1**, **10 for x10**. Do not select 10 merely to increase the displayed
   result. A marked x10 loop can improve signal size for a small fan; the
   software divides it back down. Leave calibration factor **1.0** until you
   have a suitable reference-current measurement.
9. Close other serial connections and upload the modified sketch. Reconnect
   `/bench`, enable server saving again if wanted, and check for an `ok` current
   status. `adc_missing`, `input_out_of_range`, or `sampling_error` means no
   valid current estimate; do not treat it as zero.

## 7. Perform a supervised fan observation and preserve the records

1. Use only an intact, suitable fan and an enclosed, appropriately
   rated/listed clamp-meter line splitter according to its instructions.
   With the fan unplugged, fit the clamp to the splitter's **marked measurement
   loop**, close its jaws fully, and arrange the low-voltage electronics away
   from mains connections and moving parts.
2. Plug the fan into the splitter and the splitter into its appropriate outlet
   according to the manufacturer's instructions. Do not open the cord, fan,
   outlet, or splitter, and do not touch exposed mains parts.
3. Start a fresh observation record: fan off, fan on at a specified speed,
   then fan off. For example, plan about one minute for each state, observing
   continuously. These are proposed test steps, not reported results.
4. Record real timestamps, fan setting, probe address/location, splitter
   multiplier and what you actually observe. Keep the probe outside the fan
   guard. Export CSV after each run and check confirmed-save feedback.
5. Initially test the unobstructed fan. Add a filter only if the fan/filter
   manufacturers allow the arrangement; otherwise do not perform a filter
   test. Never block blades, fully obstruct airflow, or leave the run unattended.
   Stop for unusual heat, smell, noise, vibration or instability.

The SCT is oversized for a small fan: displayed current is a **nominal estimate**,
not a calibrated result. A suitable true-RMS reference measurement is needed
to assess accuracy. Do not assume fitting a filter must increase current.
Room-temperature fan readings are not cooling-coil temperature differences.
This setup does not measure airflow, pressure drop, filter loading, or HVAC
health. Keep observation notes and avoid turning software-generated estimates
into unsupported diagnostic claims.
