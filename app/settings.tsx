import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  sendWifiCredentialsToArduino,
  waitForArduinoIpViaBle,
} from "../lib/arduinoBle";
import {
  clearArduinoWifiPairing,
  loadArduinoWifiState,
  saveArduinoSensorIp,
  saveArduinoWifiPaired,
} from "../lib/arduinoWifiStatus";

export default function SettingsScreen() {
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [sensorIp, setSensorIp] = useState("");
  const [pairingStep, setPairingStep] = useState<
    "idle" | "sending" | "fetchingIp"
  >("idle");
  const [isRefreshingIp, setIsRefreshingIp] = useState(false);
  const [paired, setPaired] = useState(false);
  const [pairedSsid, setPairedSsid] = useState<string | null>(null);

  const hydrate = useCallback(() => {
    const s = loadArduinoWifiState();
    setPaired(s.paired);
    setPairedSsid(s.ssid);
    setSensorIp(s.sensorIp ?? "");
    if (s.ssid) setSsid(s.ssid);
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const canSend = useMemo(
    () =>
      ssid.trim().length > 0 &&
      password.length > 0 &&
      pairingStep === "idle",
    [ssid, password, pairingStep]
  );

  async function handlePairArduinoToWifi() {
    const trimmedSsid = ssid.trim();
    if (!trimmedSsid || !password) {
      Alert.alert("Saknad information", "Fyll i nätverksnamn och lösenord.");
      return;
    }

    try {
      setPairingStep("sending");
      await sendWifiCredentialsToArduino(trimmedSsid, password);
      setPassword("");

      setPairingStep("fetchingIp");
      const ip = await waitForArduinoIpViaBle({
        maxAttempts: 25,
        delayMs: 2000,
      });

      saveArduinoWifiPaired(trimmedSsid);
      setPaired(true);
      setPairedSsid(trimmedSsid);
      if (ip) {
        saveArduinoSensorIp(ip);
        setSensorIp(ip);
        Alert.alert(
          "Parkoppling klar",
          `Airnest är parkopplat mot "${trimmedSsid}". IP ${ip} lästes via Bluetooth en gång och sparas — sensordata under Diagnostics hämtas därefter över Wi‑Fi från http://${ip}/sensor.`
        );
      } else {
        Alert.alert(
          "Parkoppling klar",
          `Airnest har fått uppgifter för "${trimmedSsid}". IP kunde inte läsas automatiskt ännu — lägg till characteristic 9999 (BLERead) i Arduino enligt dokumentationen, eller ange IP manuellt nedan.`
        );
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : String(e);
      Alert.alert(
        "Kunde inte skicka till Airnest",
        msg ||
          "Kontrollera Bluetooth, att Airnest är nära och att SSID/lösenord stämmer."
      );
    } finally {
      setPairingStep("idle");
    }
  }

  async function handleRefreshIpFromBle() {
    try {
      setIsRefreshingIp(true);
      const ip = await waitForArduinoIpViaBle({
        maxAttempts: 12,
        delayMs: 2000,
      });
      if (ip) {
        saveArduinoSensorIp(ip);
        setSensorIp(ip);
        Alert.alert("IP uppdaterad", ip);
      } else {
        Alert.alert(
          "Hittade ingen IP",
          "Kontrollera att Arduino är nära, har Wi‑Fi och uppdaterar UUID 9999."
        );
      }
    } finally {
      setIsRefreshingIp(false);
    }
  }

  function handleSaveSensorIp() {
    saveArduinoSensorIp(sensorIp);
    Alert.alert("Sparat", "IP-adressen används för sensordata under Diagnostics.");
  }

  function handleChangeNetwork() {
    Alert.alert(
      "Byt nätverk?",
      "Du kan parkoppla Airnest mot ett nytt Wi‑Fi. Nuvarande sparad status rensas.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Fortsätt",
          style: "destructive",
          onPress: () => {
            clearArduinoWifiPairing();
            setPaired(false);
            setPairedSsid(null);
            setSsid("");
            setPassword("");
            setSensorIp("");
            hydrate();
          },
        },
      ]
    );
  }

  const inputStyle = {
    backgroundColor: "#ffffff",
    borderColor: "#d1d5db",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    color: "#111827",
  } as const;

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center mt-4 mb-6">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="chevron-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-2xl font-semibold">Inställningar</Text>
        </View>

        {paired ? (
          <View className="bg-white rounded-3xl shadow p-5 mb-4">
            <Text className="text-lg font-semibold mb-2">
              Airnest och Wi‑Fi
            </Text>
            <View className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-sm font-semibold text-emerald-900 mb-1">
                Parkoppling klar
              </Text>
              <Text className="text-sm text-emerald-800">
                Arduino är konfigurerad för Wi‑Fi-nätverket{" "}
                <Text className="font-semibold">
                  {pairedSsid ?? "—"}
                </Text>
                . IP kan läsas via Bluetooth en gång (UUID{" "}
                <Text className="font-mono">9999</Text>) så appen vet var den
                ska anropa sensorn över Wi‑Fi.
              </Text>
            </View>

            <Text className="text-gray-700 mb-2 font-medium">
              IP-adress för sensordata
            </Text>
            <Text className="text-xs text-gray-500 mb-2">
              Fylls normalt i automatiskt efter parkoppling. Vid behov kan du
              justera manuellt. Appen anropar{" "}
              <Text className="font-mono">http://&lt;ip&gt;/sensor</Text> för
              sensordata och <Text className="font-mono">/fan/on</Text> samt{" "}
              <Text className="font-mono">/fan/off</Text> när program startas
              eller stoppas.
            </Text>
            <TextInput
              value={sensorIp}
              onChangeText={setSensorIp}
              placeholder="192.168.0.45"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              selectionColor="#000000"
              style={inputStyle}
            />
            <TouchableOpacity
              onPress={handleSaveSensorIp}
              style={{
                backgroundColor: "#000000",
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text className="text-white font-semibold">Spara IP-adress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRefreshIpFromBle}
              disabled={isRefreshingIp}
              className="rounded-2xl border border-gray-300 py-3 items-center mb-4"
            >
              <Text className="text-gray-800 font-semibold">
                {isRefreshingIp
                  ? "Hämtar IP via Bluetooth..."
                  : "Hämta IP från Airnest igen"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleChangeNetwork}
              className="py-3 items-center"
            >
              <Text className="text-gray-700 font-medium underline">
                Byt Wi‑Fi-nätverk
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-white rounded-3xl shadow p-5">
            <Text className="text-lg font-semibold mb-2">
              Parkoppla Airnest till Wi‑Fi
            </Text>
            <Text className="text-sm text-gray-600 mb-5">
              Det här skickar bara nätverksuppgifter till Arduino via Bluetooth.
              Din mobil kopplas inte automatiskt till samma Wi‑Fi.
            </Text>

            <Text className="text-gray-700 mb-2 font-medium">
              Nätverksnamn (SSID)
            </Text>
            <TextInput
              value={ssid}
              onChangeText={setSsid}
              placeholder="Till exempel HemmaWiFi"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              selectionColor="#000000"
              style={inputStyle}
            />

            <Text className="text-gray-700 mb-2 font-medium">Lösenord</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Wi‑Fi-lösenord"
              placeholderTextColor="#6b7280"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              selectionColor="#000000"
              style={{ ...inputStyle, marginBottom: 20 }}
            />

            <TouchableOpacity
              onPress={handlePairArduinoToWifi}
              disabled={!canSend}
              style={{
                backgroundColor: "#000000",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                opacity: canSend ? 1 : 0.55,
              }}
            >
              <Text className="text-white font-semibold text-base">
                {pairingStep === "sending"
                  ? "Skickar till Airnest..."
                  : pairingStep === "fetchingIp"
                    ? "Hämtar IP från Airnest..."
                    : "Skicka till Airnest"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
