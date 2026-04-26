import { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ProgramStatusCard } from "../../components/ProgramStatusCard";
import {
  ActiveProgram,
  getCurrentUserId,
  loadActiveProgram,
} from "../../lib/programState";
import {
  type ArduinoSensorHttpFailure,
  fetchArduinoSensorsFromHttpDetailed,
  loadArduinoWifiState,
} from "../../lib/arduinoWifiStatus";

function describeSensorHttpFailure(
  ip: string,
  f: ArduinoSensorHttpFailure
): string {
  switch (f.type) {
    case "invalid_ip":
      return "IP-adressen i inställningarna är ogiltig.";
    case "timeout":
      return "Ingen kontakt inom 12 sekunder. Samma Wi‑Fi som Arduino? Rätt IP (kolla Serial Monitor: WiFi.localIP())? I sketchen måste handleSensorHttpRequest() anropas även inne i while (central.connected()), annars svarar Arduino ofta inte på HTTP när telefonen är BLE-kopplad.";
    case "network":
      return `Kunde inte öppna TCP mot Arduino (${f.message}). Öppna http://${ip}/sensor i Safari på telefonen — om det inte fungerar där är det nätverket eller webservern på Arduino, inte appens JSON-parser.`;
    case "http_status":
      if (f.status === 404) {
        return "Arduino svarade 404. Första raden i HTTP-förfrågan ska innehålla exakt «GET /sensor» (inga stavfel, ingen /server).";
      }
      if (f.status === 503) {
        return "Arduino svarade 503 — vanligt när DHT inte går att läsa (fel GPIO, DHT11 vs DHT22, kablage). Kolla Serial Monitor.";
      }
      return `Arduino svarade HTTP ${f.status}. Förväntat 200 och JSON-kropp för GET /sensor.`;
    case "json_invalid":
      return `Svar 200 men JSON gick inte att tolka som temperatur och luftfuktighet. Utdrag: «${f.preview}». Förväntat t.ex. {"temperature":23.1,"humidity":55}.`;
    default:
      return "";
  }
}

export default function Diagnostics() {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [arduinoPaired, setArduinoPaired] = useState(false);
  const [arduinoSsid, setArduinoSsid] = useState<string | null>(null);
  const [sensorIp, setSensorIp] = useState<string | null>(null);
  const [sensorHttpFailure, setSensorHttpFailure] =
    useState<ArduinoSensorHttpFailure | null>(null);

  const refreshProgramState = useCallback(async () => {
    const id = await getCurrentUserId();
    setUserId(id);
    if (!id) {
      setActiveProgram(null);
      return;
    }

    const program = await loadActiveProgram(id);
    setActiveProgram(program);
  }, []);

  const refreshArduinoWifi = useCallback(() => {
    const w = loadArduinoWifiState();
    setArduinoPaired(w.paired);
    setArduinoSsid(w.ssid);
    setSensorIp(w.sensorIp);
  }, []);

  useEffect(() => {
    refreshProgramState();
    refreshArduinoWifi();
  }, [refreshProgramState, refreshArduinoWifi]);

  useFocusEffect(
    useCallback(() => {
      refreshProgramState();
      refreshArduinoWifi();
      return undefined;
    }, [refreshProgramState, refreshArduinoWifi])
  );

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      refreshProgramState();
    }, 1000);

    return () => clearInterval(interval);
  }, [userId, refreshProgramState]);

  useEffect(() => {
    if (sensorIp) return;
    setTemperature(null);
    setHumidity(null);
    setSensorHttpFailure(null);
  }, [sensorIp]);

  useEffect(() => {
    if (!sensorIp) return;

    setTemperature(null);
    setHumidity(null);
    setSensorHttpFailure(null);

    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const { data, failure } =
          await fetchArduinoSensorsFromHttpDetailed(sensorIp);
        if (cancelled) return;
        if (data) {
          setTemperature(data.temperature);
          setHumidity(data.humidity);
          setSensorHttpFailure(null);
        } else {
          setSensorHttpFailure(failure);
        }
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const interval = setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sensorIp]);

  const remainingTime =
    activeProgram && activeProgram.endTime > Date.now()
      ? Math.max(0, Math.floor((activeProgram.endTime - Date.now()) / 1000))
      : 0;

  const showSensorHint =
    temperature === null &&
    humidity === null &&
    arduinoPaired &&
    !sensorIp;

  const showHttpEndpointHint =
    Boolean(sensorIp) &&
    arduinoPaired &&
    temperature === null &&
    humidity === null;

  const showStaleReadingHint =
    Boolean(sensorIp) &&
    arduinoPaired &&
    sensorHttpFailure != null &&
    (temperature !== null || humidity !== null);

  return (
    <SafeAreaView className="flex-1 bg-white px-6 pt-6">
      <Text className="text-2xl font-semibold mb-2">Diagnostics</Text>

      {arduinoPaired && arduinoSsid ? (
        <View className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4">
          <Text className="text-sm font-semibold text-emerald-900">
            Airnest · Wi‑Fi parkopplad
          </Text>
          <Text className="text-sm text-emerald-800 mt-1">
            Nätverk: {arduinoSsid}
            {sensorIp
              ? ` · Sensordata via Wi‑Fi ${sensorIp}`
              : " · Sensordata via Wi‑Fi när IP är sparad (Inställningar)"}
          </Text>
        </View>
      ) : null}

      <View className="flex-row justify-between mb-2">
        <View className="bg-white rounded-3xl shadow p-5 w-[48%]">
          <Text className="text-sm text-gray-500 mb-1">Temperatur</Text>
          <Text className="text-3xl font-semibold">
            {temperature === null ? "--" : `${temperature.toFixed(1)}°C`}
          </Text>
        </View>

        <View className="bg-white rounded-3xl shadow p-5 w-[48%]">
          <Text className="text-sm text-gray-500 mb-1">Luftfuktighet</Text>
          <Text className="text-3xl font-semibold">
            {humidity === null ? "--" : `${humidity.toFixed(1)}%`}
          </Text>
        </View>
      </View>

      {showSensorHint ? (
        <Text className="text-xs text-gray-500 mb-4">
          Bluetooth används bara för att skicka Wi‑Fi-uppgifter och (vid behov)
          läsa IP en gång. Sensordata hämtas endast över Wi‑Fi från{" "}
          <Text className="font-mono">http://&lt;IP&gt;/sensor</Text> — spara IP
          under Inställningar (efter parkoppling om UUID 9999 fungerar, eller
          manuellt).
        </Text>
      ) : null}

      {showStaleReadingHint && sensorIp ? (
        <View className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
          <Text className="text-xs text-amber-900 font-medium">
            Senaste hämtningen misslyckades — siffrorna kan vara gamla.
          </Text>
          <Text className="text-xs text-amber-800 mt-1">
            {describeSensorHttpFailure(sensorIp, sensorHttpFailure)}
          </Text>
        </View>
      ) : null}

      {showHttpEndpointHint && sensorIp ? (
        <View className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">
          <Text className="text-xs text-amber-800">
            IP {sensorIp} är sparad men inga sensordata kom igenom från{" "}
            <Text className="font-mono">http://{sensorIp}/sensor</Text>.
          </Text>
          {sensorHttpFailure ? (
            <Text className="text-xs text-amber-900 font-medium mt-2">
              {describeSensorHttpFailure(sensorIp, sensorHttpFailure)}
            </Text>
          ) : (
            <Text className="text-xs text-amber-800 mt-2">
              Hämtar… om detta kvarstår: testa samma URL i Safari (samma Wi‑Fi
              som Arduino). Sökväg ska vara <Text className="font-mono">/sensor</Text>
              , inte /server. Exempel på svar:{" "}
              <Text className="font-mono">
                {`{"temperature":23.1,"humidity":55}`}
              </Text>
              .
            </Text>
          )}
        </View>
      ) : null}

      <ProgramStatusCard
        activeProgram={activeProgram}
        remainingTime={remainingTime}
        emptyText="Inget program körs"
      />
    </SafeAreaView>
  );
}
