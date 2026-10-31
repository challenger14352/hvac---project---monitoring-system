/** Absolute temperatures. Stored sensor and HVAC source units are unchanged. */
export const celsiusToFahrenheit = (celsius: number) => celsius * 9 / 5 + 32;
export const fahrenheitToCelsius = (fahrenheit: number) => (fahrenheit - 32) * 5 / 9;

/** A temperature difference has no 32-degree offset. */
export const fahrenheitDeltaToCelsius = (deltaF: number) => deltaF * 5 / 9;

function missing(value: number | null | undefined): value is null | undefined {
  return value == null || !Number.isFinite(value);
}

export function formatTemperatureCelsius(value: number | null | undefined, digits = 2) {
  return missing(value) ? "—"
    : `${celsiusToFahrenheit(value).toFixed(digits)} °F / ${value.toFixed(digits)} °C`;
}

export function formatTemperatureFahrenheit(value: number | null | undefined, digits = 1) {
  return missing(value) ? "—"
    : `${value.toFixed(digits)} °F / ${fahrenheitToCelsius(value).toFixed(digits)} °C`;
}

export function formatTemperatureDeltaFahrenheit(value: number | null | undefined, digits = 1) {
  return missing(value) ? "—"
    : `${value.toFixed(digits)} °F / ${fahrenheitDeltaToCelsius(value).toFixed(digits)} °C`;
}
