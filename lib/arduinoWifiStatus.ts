import type { ProgramMode } from "./programState";

const KEY_PAIRED = "arduinoWifiPaired";
const KEY_SSID = "arduinoWifiSsid";
const KEY_SENSOR_IP = "arduinoSensorIp";
const USER_WIFI_PREFIX = "arduinoWifiUser:";

function scopedWifiKey(
  userId: string | null | undefined,
  suffix: string
): string | null {
  if (!userId) return null;
  return `${USER_WIFI_PREFIX}${userId}:${suffix}`;
}

function normalizeStoredSsid(raw: string | null): string | null {
  if (!raw) return null;
  const normalized = raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
  return normalized || null;
}

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

export function loadArduinoWifiState(
  userId?: string | null
): ArduinoWifiPairedState {
  const pairedKey = scopedWifiKey(userId, KEY_PAIRED);
  const ssidKey = scopedWifiKey(userId, KEY_SSID);
  const ipKey = scopedWifiKey(userId, KEY_SENSOR_IP);
  if (!pairedKey || !ssidKey || !ipKey) {
    return { paired: false, ssid: null, sensorIp: null };
  }
  try {
    const paired = localStorage.getItem(pairedKey) === "1";
    const rawSsid = localStorage.getItem(ssidKey);
    const ssid = normalizeStoredSsid(rawSsid);
    if (rawSsid && !ssid) {
      localStorage.removeItem(ssidKey);
    } else if (rawSsid && ssid && rawSsid !== ssid) {
      localStorage.setItem(ssidKey, ssid);
    }
    const rawIp = localStorage.getItem(ipKey);
    const trimmedRaw = rawIp && rawIp.trim() ? rawIp.trim() : null;
    const sensorIp = normalizeAndValidateArduinoLanIp(trimmedRaw);
    if (trimmedRaw && !sensorIp) {
      localStorage.removeItem(ipKey);
    }
    return {
      paired,
      ssid,
      sensorIp,
    };
  } catch {
    return { paired: false, ssid: null, sensorIp: null };
  }
}

export function saveArduinoWifiPaired(
  ssid: string,
  userId?: string | null
): void {
  const pairedKey = scopedWifiKey(userId, KEY_PAIRED);
  const ssidKey = scopedWifiKey(userId, KEY_SSID);
  if (!pairedKey || !ssidKey) return;
  try {
    const normalizedSsid = normalizeStoredSsid(ssid);
    if (!normalizedSsid) {
      return;
    }
    localStorage.setItem(pairedKey, "1");
    localStorage.setItem(ssidKey, normalizedSsid);
  } catch {
    // ignore
  }
}

export function saveArduinoSensorIp(
  ip: string,
  userId?: string | null
): void {
  const ipKey = scopedWifiKey(userId, KEY_SENSOR_IP);
  if (!ipKey) return;
  try {
    const normalized = normalizeAndValidateArduinoLanIp(
      ip.replace(/^https?:\/\//i, "").replace(/\/$/, "")
    );
    if (!normalized) {
      localStorage.removeItem(ipKey);
    } else {
      localStorage.setItem(ipKey, normalized);
    }
  } catch {
    // ignore
  }
}

export function clearArduinoWifiPairing(userId?: string | null): void {
  const pairedKey = scopedWifiKey(userId, KEY_PAIRED);
  const ssidKey = scopedWifiKey(userId, KEY_SSID);
  const ipKey = scopedWifiKey(userId, KEY_SENSOR_IP);
  if (!pairedKey || !ssidKey || !ipKey) return;
  try {
    localStorage.removeItem(pairedKey);
    localStorage.removeItem(ssidKey);
    localStorage.removeItem(ipKey);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLikelyAbortOrTimeout(e: unknown): boolean {
  return (
    e instanceof Error &&
    (e.name === "AbortError" ||
      /aborted|timeout/i.test(String(e.message)))
  );
}

/** Skissens fläkt-GET returnerar JSON med `ok: true` (t.ex. `{"ok":true}`). */
function fanHttpPathExpectsOkJson(path: string): boolean {
  return path.toLowerCase().startsWith("/fan/");
}

function parseFanCommandAck(text: string): { ok: true } | { ok: false; detail: string } {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const slice =
    start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;

  let j: Record<string, unknown>;
  try {
    j = JSON.parse(slice) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      detail: `ogiltigt JSON (utdrag: «${trimmed.replace(/\s+/g, " ").slice(0, 120)}»)`,
    };
  }

  if (j.ok === true) return { ok: true };
  if (j.ok === false) {
    const err = j.error != null ? String(j.error) : "ok:false";
    return { ok: false, detail: err };
  }
  return { ok: false, detail: "saknar fältet ok:true i svarskroppen" };
}

/**
 * GET till Arduino med samma retry/timeout som fläktkommandon.
 * Kräver att sketchen svarar 200 på angiven path.
 * För `/fan/...` krävs dessutom JSON med `ok: true` — det bekräftar att sketchen
 * tog emot kommandot, inte att lasten (fläkten) faktiskt får ström.
 */
async function arduinoFanHttpGetWithRetries(
  ip: string,
  path: string
): Promise<void> {
  const host = normalizeAndValidateArduinoLanIp(ip);
  if (!host) {
    throw new Error(
      "Ingen giltig IP för Airnest. Parkoppla igen eller ange IP under Nätverksinställningar."
    );
  }

  const url = `http://${host}${path}`;
  const perAttemptTimeoutMs = 14000;
  const maxAttempts = 5;
  const pauseBetweenMs = 600;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perAttemptTimeoutMs);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Connection: "close",
        },
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(
          `Airnest svarade HTTP ${res.status}. Kontrollera att sketchen hanterar GET ${path}.`
        );
      }
      if (fanHttpPathExpectsOkJson(path)) {
        const ack = parseFanCommandAck(text);
        if (!ack.ok) {
          throw new Error(
            `Airnest svarade HTTP 200 men bekräftade inte fläktkommandot (${ack.detail}). ` +
              "Kontrollera att senaste `airnest.ino` är uppladdad."
          );
        }
      }
      return;
    } catch (e) {
      if (!isLikelyAbortOrTimeout(e)) {
        throw e;
      }
      if (attempt === maxAttempts - 1) {
        throw new Error(
          "Ingen kontakt med Airnest över Wi‑Fi (timeout). Samma Wi‑Fi som Arduino? " +
            "Om sketchen bara anropar handleSensorHttpRequest() sällan i loop() (t.ex. före delay(3000)), " +
            "öka hur ofta den anropas eller flytta delay så att servern hinner svara oftare."
        );
      }
      await sleep(pauseBetweenMs);
    } finally {
      clearTimeout(timer);
    }
  }
}

const FAN_MODE_PATH: Record<ProgramMode, string> = {
  quick: "/fan/mode/quick",
  eco: "/fan/mode/eco",
  normal: "/fan/mode/normal",
};

/**
 * Sätter puls-/torkprofil på Arduino innan GET /fan/on.
 * Måste matcha skissens GET /fan/mode/quick|eco|normal.
 */
export async function sendFanModeOverHttp(
  ip: string,
  mode: ProgramMode
): Promise<void> {
  const path = FAN_MODE_PATH[mode];
  try {
    await arduinoFanHttpGetWithRetries(ip, path);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/HTTP 404/.test(msg)) {
      throw new Error(
        `${msg}\n\nAirnest verkar köra en äldre sketch utan ${path}. ` +
          "Ladda upp senaste `IPP/arduino/airnest/airnest.ino` (hanterar /fan/mode/quick, /eco, /normal) och prova igen."
      );
    }
    throw e;
  }
}

/**
 * Styr relä/fläkt över Wi‑Fi. Arduino ska på GET svara 200 med JSON `{"ok":true}`:
 *   FAN_ON  → GET http://<ip>/fan/on
 *   FAN_OFF → GET http://<ip>/fan/off
 * (samma första-rad-format som för /sensor, t.ex. "GET /fan/on HTTP/1.1")
 *
 * Det bekräftar bara att sketchen körde kommandot — inte att fläkten får ström
 * (relä/last kan vara frånkopplad utan att Arduino märker det).
 *
 * Flera försök: när BLE inte är aktiv anropar många skisser bara
 * handleSensorHttpRequest() ungefär var tredje sekund i loop(); ett enstaka
 * fetch kan då missa svarfönstret trots att /sensor fungerar vid nästa poll.
 */
export async function sendFanCommandOverHttp(
  ip: string,
  command: "FAN_ON" | "FAN_OFF"
): Promise<void> {
  const path = command === "FAN_ON" ? "/fan/on" : "/fan/off";
  await arduinoFanHttpGetWithRetries(ip, path);
}
