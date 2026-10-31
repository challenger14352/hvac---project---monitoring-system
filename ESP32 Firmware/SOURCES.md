# Bench implementation sources and disclosure

Prepared with Replit Agent assistance. The applicant's individual hardware
contributions and physical test results are not asserted by these files.
The application-side USB protocol, browser bridge, and RMS sketch were written
for this bench workflow; they still need the user's physical checks.

References consulted:

- Adafruit ADS1X15 breakout pinouts:
  https://learn.adafruit.com/adafruit-4-channel-adc-breakouts/pinouts
- Texas Instruments ADS1115 datasheet, supply/input limits and conversion rates:
  https://www.ti.com/lit/ds/symlink/ads1115.pdf
- Analog Devices DS18B20 datasheet, powered 1-Wire operation, unique addresses,
  conversion time, and pull-up:
  https://www.analog.com/media/en/technical-documentation/data-sheets/ds18b20.pdf
- OpenEnergyMonitor, CT bias circuits and voltage-output CT internal burden:
  https://docs.openenergymonitor.org/electricity-monitoring/ct-sensors/interface-with-arduino.html
- ESP32 Arduino installation:
  https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html
- Arduino IDE:
  https://www.arduino.cc/en/software/
- Web Serial API:
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API

Arduino libraries (install via Library Manager, retain their licenses):

- OneWire 2.3.8 — https://github.com/PaulStoffregen/OneWire
- DallasTemperature 4.0.6 — https://github.com/milesburton/Arduino-Temperature-Control-Library
- Adafruit ADS1X15 2.5.0 — https://github.com/adafruit/Adafruit_ADS1X15
- Adafruit BusIO (ADS1X15 dependency) — https://github.com/adafruit/Adafruit_BusIO

Verification target: esp32 by Espressif Systems 3.0.7, ESP32 Dev Module.
The physical current sensor rating comes from the photographed
YHDC SCT013 **100 A / 1 V**, not the incompatible 100 A / 50 mA example.
No supplier-specific DS18B20 cable-color guarantee was established; confirm the
actual probe wiring with its seller before powering it.
