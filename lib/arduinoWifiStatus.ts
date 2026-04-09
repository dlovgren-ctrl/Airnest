const KEY_PAIRED = "arduinoWifiPaired";
const KEY_SSID = "arduinoWifiSsid";
const KEY_SENSOR_IP = "arduinoSensorIp";

/**
 * Giltig IPv4 för att nå Arduino på LAN. Slår t.ex. ut 0.0.0.0 som Arduino
 * ibland skriver innan Wi‑Fi är klar.
 */
export function normalizeAndValidateArduinoLanIp(
  ip: string | null | undefined
): string | null {
  if (ip == null || !String(ip).trim()) return null;
  const trimmed = String(ip)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) return null;
  const parts = trimmed.split(".").map((x) => Number(x));
  if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  const [a, b, c, d] = parts;
  if (a === 0 && b === 0 && c === 0 && d === 0) return null;
  if (a === 0) return null;
  if (a === 255 && b === 255 && c === 255 && d === 255) return null;
  if (a === 127) return null;
  return trimmed;
}

export type ArduinoWifiPairedState = {
  paired: boolean;
  ssid: string | null;
  sensorIp: string | null;
};

export function loadArduinoWifiState(): ArduinoWifiPairedState {
  try {
    const paired = localStorage.getItem(KEY_PAIRED) === "1";
    const ssid = localStorage.getItem(KEY_SSID);
    const rawIp = localStorage.getItem(KEY_SENSOR_IP);
    const trimmedRaw = rawIp && rawIp.trim() ? rawIp.trim() : null;
    const sensorIp = normalizeAndValidateArduinoLanIp(trimmedRaw);
    if (trimmedRaw && !sensorIp) {
      localStorage.removeItem(KEY_SENSOR_IP);
    }
    return {
      paired,
      ssid: ssid && ssid.trim() ? ssid.trim() : null,
      sensorIp,
    };
  } catch {
    return { paired: false, ssid: null, sensorIp: null };
  }
}

export function saveArduinoWifiPaired(ssid: string): void {
  try {
    localStorage.setItem(KEY_PAIRED, "1");
    localStorage.setItem(KEY_SSID, ssid.trim());
  } catch {
    // ignore
  }
}

export function saveArduinoSensorIp(ip: string): void {
  try {
    const normalized = normalizeAndValidateArduinoLanIp(
      ip.replace(/^https?:\/\//i, "").replace(/\/$/, "")
    );
    if (!normalized) {
      localStorage.removeItem(KEY_SENSOR_IP);
    } else {
      localStorage.setItem(KEY_SENSOR_IP, normalized);
    }
  } catch {
    // ignore
  }
}

export function clearArduinoWifiPairing(): void {
  try {
    localStorage.removeItem(KEY_PAIRED);
    localStorage.removeItem(KEY_SSID);
    localStorage.removeItem(KEY_SENSOR_IP);
  } catch {
    // ignore
  }
}

function parseSensorJsonBody(text: string): {
  temperature: number;
  humidity: number;
} | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const slice =
    start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;

  let j: Record<string, unknown>;
  try {
    j = JSON.parse(slice) as Record<string, unknown>;
  } catch {
    return null;
  }

  const rawT = j.temperature ?? j.t;
  const rawH = j.humidity ?? j.h;

  const t =
    typeof rawT === "number"
      ? rawT
      : typeof rawT === "string"
        ? Number(rawT)
        : NaN;
  const h =
    typeof rawH === "number"
      ? rawH
      : typeof rawH === "string"
        ? Number(rawH)
        : NaN;

  if (Number.isNaN(t) || Number.isNaN(h)) return null;
  return { temperature: t, humidity: h };
}

export type ArduinoSensorHttpFailure =
  | { type: "invalid_ip" }
  | { type: "timeout" }
  | { type: "network"; message: string }
  | { type: "http_status"; status: number }
  | { type: "json_invalid"; preview: string };

/**
 * Arduino ska svara på GET http://<ip>/sensor med JSON, t.ex.:
 * { "temperature": 23.4, "humidity": 55.2 } eller { "t": 23.4, "h": 55.2 }
 */
export async function fetchArduinoSensorsFromHttpDetailed(
  ip: string
): Promise<{
  data: { temperature: number; humidity: number } | null;
  failure: ArduinoSensorHttpFailure | null;
}> {
  const host = normalizeAndValidateArduinoLanIp(ip);
  if (!host) {
    return { data: null, failure: { type: "invalid_ip" } };
  }

  const url = `http://${host}/sensor`;
  const controller = new AbortController();
  const timeoutMs = 12000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await res.text();
    if (!res.ok) {
      return {
        data: null,
        failure: { type: "http_status", status: res.status },
      };
    }

    const parsed = parseSensorJsonBody(text);
    if (!parsed) {
      return {
        data: null,
        failure: {
          type: "json_invalid",
          preview: text.replace(/\s+/g, " ").trim().slice(0, 160),
        },
      };
    }

    return { data: parsed, failure: null };
  } catch (e) {
    clearTimeout(timer);
    const aborted =
      e instanceof Error &&
      (e.name === "AbortError" ||
        /aborted|timeout/i.test(String(e.message)));
    if (aborted) {
      return { data: null, failure: { type: "timeout" } };
    }
    const message = e instanceof Error ? e.message : String(e);
    return { data: null, failure: { type: "network", message } };
  }
}

export async function fetchArduinoSensorsFromHttp(
  ip: string
): Promise<{ temperature: number; humidity: number } | null> {
  const { data } = await fetchArduinoSensorsFromHttpDetailed(ip);
  return data;
}

/**
 * Styr relä/fläkt över Wi‑Fi. Arduino ska på GET svara 200:
 *   FAN_ON  → GET http://<ip>/fan/on
 *   FAN_OFF → GET http://<ip>/fan/off
 * (samma första-rad-format som för /sensor, t.ex. "GET /fan/on HTTP/1.1")
 */
export async function sendFanCommandOverHttp(
  ip: string,
  command: "FAN_ON" | "FAN_OFF"
): Promise<void> {
  const host = normalizeAndValidateArduinoLanIp(ip);
  if (!host) {
    throw new Error(
      "Ingen giltig IP för Airnest. Parkoppla igen eller ange IP under Inställningar."
    );
  }

  const path = command === "FAN_ON" ? "/fan/on" : "/fan/off";
  const url = `http://${host}${path}`;
  const controller = new AbortController();
  const timeoutMs = 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(
        `Airnest svarade HTTP ${res.status}. Kontrollera att sketchen hanterar GET ${path}.`
      );
    }
  } catch (e) {
    clearTimeout(timer);
    const aborted =
      e instanceof Error &&
      (e.name === "AbortError" ||
        /aborted|timeout/i.test(String(e.message)));
    if (aborted) {
      throw new Error(
        "Ingen kontakt med Airnest över Wi‑Fi (timeout). Samma nätverk som Arduino?"
      );
    }
    throw e;
  }
}
