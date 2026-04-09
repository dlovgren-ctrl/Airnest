import { BleManager, Device, State, fullUUID } from "react-native-ble-plx";
import { Buffer } from "buffer";
import { PermissionsAndroid, Platform } from "react-native";
import { normalizeAndValidateArduinoLanIp } from "./arduinoWifiStatus";

const DEVICE_NAME = "Airnest";
/** Arduino: BLEService wifiService("1234") — måste matcha 16-bit + full 128-bit UUID. */
const SHORT_SERVICE = "1234";
/** Arduino: BLECharacteristic wifiCharacteristic("5678", BLEWrite, 100) */
const SHORT_WIFI_CHAR = "5678";
/** Arduino: BLERead — uppdateras med WiFi.localIP() efter anslutning (för automatisk IP i appen). */
const SHORT_IP_CHAR = "9999";
// Requires matching notify characteristic in Arduino firmware.
const SHORT_SENSOR_CHAR = "9abc";

const SERVICE_UUID_FULL = fullUUID(SHORT_SERVICE);
const WIFI_CHAR_FULL = fullUUID(SHORT_WIFI_CHAR);
const IP_CHAR_FULL = fullUUID(SHORT_IP_CHAR);
const SENSOR_CHAR_FULL = fullUUID(SHORT_SENSOR_CHAR);

async function readArduinoIpFromDevice(device: Device): Promise<string | null> {
  const services = await device.services();

  for (const service of services) {
    if (!uuidMatches(service.uuid, SHORT_SERVICE)) continue;
    const characteristics = await service.characteristics();
    for (const ch of characteristics) {
      if (!uuidMatches(ch.uuid, SHORT_IP_CHAR)) continue;
      if (!ch.isReadable) continue;
      const updated = await ch.read();
      const encoded = updated.value;
      if (!encoded) continue;
      const text = Buffer.from(encoded, "base64").toString("utf8");
      const ip = normalizeAndValidateArduinoLanIp(text);
      if (ip) return ip;
    }
  }

  try {
    const updated = await device.readCharacteristicForService(
      SERVICE_UUID_FULL,
      IP_CHAR_FULL
    );
    const encoded = updated.value;
    if (!encoded) return null;
    const text = Buffer.from(encoded, "base64").toString("utf8");
    return normalizeAndValidateArduinoLanIp(text);
  } catch {
    return null;
  }
}

function uuidMatches(actual: string, short16: string): boolean {
  const u = actual.toLowerCase();
  const s = short16.toLowerCase();
  const full = fullUUID(short16).toLowerCase();
  return u === s || u === full;
}

/**
 * Skriver rå UTF-8 payload till Arduino:s wifiCharacteristic.
 * Använder discovery + både with/without response så att written() triggas på enheten.
 */
async function writePayloadToArduinoWifiCharacteristic(
  device: Device,
  payloadUtf8: string
): Promise<void> {
  const base64Value = Buffer.from(payloadUtf8, "utf8").toString("base64");
  const services = await device.services();

  for (const service of services) {
    if (!uuidMatches(service.uuid, SHORT_SERVICE)) continue;

    const characteristics = await service.characteristics();
    for (const ch of characteristics) {
      if (!uuidMatches(ch.uuid, SHORT_WIFI_CHAR)) continue;

      const lastError: Error[] = [];

      if (ch.isWritableWithResponse) {
        try {
          await ch.writeWithResponse(base64Value);
          await new Promise((r) => setTimeout(r, 450));
          return;
        } catch (e) {
          lastError.push(
            e instanceof Error ? e : new Error(String(e))
          );
        }
      }

      if (ch.isWritableWithoutResponse) {
        try {
          await ch.writeWithoutResponse(base64Value);
          await new Promise((r) => setTimeout(r, 450));
          return;
        } catch (e) {
          lastError.push(
            e instanceof Error ? e : new Error(String(e))
          );
        }
      }

      throw lastError[0] ?? new Error("Kunde inte skriva till Wi‑Fi‑characteristic.");
    }
  }

  // Fallback: anropa forService med full UUID (vissa iOS-versioner)
  try {
    await device.writeCharacteristicWithResponseForService(
      SERVICE_UUID_FULL,
      WIFI_CHAR_FULL,
      base64Value
    );
  } catch {
    try {
      await device.writeCharacteristicWithoutResponseForService(
        SERVICE_UUID_FULL,
        WIFI_CHAR_FULL,
        base64Value
      );
    } catch {
      throw new Error(
        "Kunde inte skriva till Airnest (UUID 1234/5678). Kontrollera att samma tjänst finns i Arduino-sketch."
      );
    }
  }
  await new Promise((r) => setTimeout(r, 450));
}

export type SensorData = {
  temperature: number;
  humidity: number;
};

const manager = new BleManager();

async function ensureAndroidBlePermissions(): Promise<void> {
  if (Platform.OS !== "android") return;

  const api = Platform.Version;
  if (typeof api === "number" && api >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    const scanOk =
      granted["android.permission.BLUETOOTH_SCAN"] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const connOk =
      granted["android.permission.BLUETOOTH_CONNECT"] ===
      PermissionsAndroid.RESULTS.GRANTED;
    if (!scanOk || !connOk) {
      throw new Error(
        "Bluetooth-behörighet saknas. Tillåt Bluetooth (sökning och anslutning) i systeminställningarna."
      );
    }
  } else {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error(
        "Plats/Bluetooth-behörighet krävs för att skanna efter Airnest på denna Android-version."
      );
    }
  }
}

/**
 * Waits until the BLE stack reports PoweredOn. Without this, iOS/Android often
 * return "BluetoothLE is powered off" even when Bluetooth is on briefly after app start.
 */
async function ensureBleReady(): Promise<void> {
  await ensureAndroidBlePermissions();

  const state = await manager.state();
  if (state === State.PoweredOn) return;

  if (state === State.Unauthorized) {
    throw new Error(
      "Bluetooth är inte tillåtet för appen. Öppna Inställningar → appen och tillåt Bluetooth."
    );
  }

  if (state === State.Unsupported) {
    throw new Error("Bluetooth LE stöds inte på den här enheten.");
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      sub.remove();
      reject(
        new Error(
          "Bluetooth blev inte redo i tid. Kontrollera att Bluetooth är på och försök igen."
        )
      );
    }, 20000);

    const sub = manager.onStateChange((newState) => {
      if (newState === State.PoweredOn) {
        clearTimeout(timeout);
        sub.remove();
        resolve();
      }
      if (newState === State.Unauthorized) {
        clearTimeout(timeout);
        sub.remove();
        reject(
          new Error(
            "Bluetooth är inte tillåtet för appen. Öppna Inställningar och tillåt Bluetooth."
          )
        );
      }
    }, true);
  });
}

async function requestDevice(timeoutMs = 10000): Promise<Device> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const finish = async (action: () => void) => {
      if (resolved) return;
      resolved = true;
      await manager.stopDeviceScan().catch(() => undefined);
      action();
    };

    const timer = setTimeout(() => {
      void finish(() =>
        reject(new Error("Hittade inte Airnest via Bluetooth."))
      );
    }, timeoutMs);

    void (async () => {
      try {
        await manager.startDeviceScan(
          null,
          { allowDuplicates: false },
          (error, device) => {
            if (resolved) return;
            if (error) {
              clearTimeout(timer);
              void finish(() => reject(error));
              return;
            }

            if (
              device?.name === DEVICE_NAME ||
              device?.localName === DEVICE_NAME
            ) {
              clearTimeout(timer);
              void finish(() => resolve(device));
            }
          }
        );
      } catch (e) {
        clearTimeout(timer);
        void finish(() =>
          reject(e instanceof Error ? e : new Error(String(e)))
        );
      }
    })();
  });
}

export async function connectToAirnest(): Promise<Device> {
  await ensureBleReady();
  const scanned = await requestDevice();
  const connected = await scanned.connect();
  await connected.discoverAllServicesAndCharacteristics();
  return connected;
}

export async function sendWifiCredentialsToArduino(
  ssid: string,
  password: string
): Promise<void> {
  const device = await connectToAirnest();
  const payload = `${ssid},${password}`;

  try {
    await writePayloadToArduinoWifiCharacteristic(device, payload);
  } finally {
    await device.cancelConnection().catch(() => undefined);
  }
}

/**
 * Läser Arduinos LAN-IP från BLE (characteristic 9999, BLERead).
 * Kräver att firmware uppdaterar värdet med WiFi.localIP() efter Wi‑Fi-anslutning.
 */
export async function readArduinoIpViaBle(): Promise<string | null> {
  const device = await connectToAirnest();
  try {
    return await readArduinoIpFromDevice(device);
  } finally {
    await device.cancelConnection().catch(() => undefined);
  }
}

/**
 * Försök igen tills Arduino hunnit ansluta till Wi‑Fi och skrivit giltig IP till 9999.
 */
export async function waitForArduinoIpViaBle(options?: {
  maxAttempts?: number;
  delayMs?: number;
}): Promise<string | null> {
  const maxAttempts = options?.maxAttempts ?? 25;
  const delayMs = options?.delayMs ?? 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const ip = await readArduinoIpViaBle();
      if (ip) return ip;
    } catch {
      // t.ex. ingen Airnest i närheten just nu
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}

/** Reserverad för ev. firmware med BLE-notify (9abc). Diagnostics använder inte detta — sensordata ska komma via Wi‑Fi HTTP. */
export async function subscribeToSensorData(
  onData: (data: SensorData) => void,
  onError?: (error: Error) => void
): Promise<() => void> {
  const device = await connectToAirnest();

  const sub = device.monitorCharacteristicForService(
    SERVICE_UUID_FULL,
    SENSOR_CHAR_FULL,
    (error, characteristic) => {
      if (error) {
        onError?.(error);
        return;
      }

      const encoded = characteristic?.value;
      if (!encoded) return;

      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      // Expected format: T:23.4,H:56.2
      const tempMatch = decoded.match(/T:([0-9]+(?:\.[0-9]+)?)/i);
      const humMatch = decoded.match(/H:([0-9]+(?:\.[0-9]+)?)/i);

      if (!tempMatch || !humMatch) return;

      onData({
        temperature: Number(tempMatch[1]),
        humidity: Number(humMatch[1]),
      });
    }
  );

  return async () => {
    if (sub && typeof sub.remove === "function") {
      sub.remove();
    }
    await device.cancelConnection().catch(() => undefined);
  };
}

