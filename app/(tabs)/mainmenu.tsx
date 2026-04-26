import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActiveProgram,
  ProgramMode,
  clearActiveProgram,
  getCurrentUserId,
  loadActiveProgram,
  saveActiveProgram,
} from "../../lib/programState";
import { ProgramStatusCard } from "../../components/ProgramStatusCard";
import {
  loadArduinoWifiState,
  sendFanCommandOverHttp,
  sendFanModeOverHttp,
} from "../../lib/arduinoWifiStatus";


export default function MainMenu() {
  const snapPoints = useMemo(() => ["50%"], []);
  const [selectedMode, setSelectedMode] = useState<ProgramMode | null>(null);
  const [sheetIndex, setSheetIndex] = useState(-1);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);

  const screenHeight = Dimensions.get("window").height;
  const sheetHeight = screenHeight * 0.4;
  const translateY = useRef(new Animated.Value(sheetHeight)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: sheetIndex === 0 ? 0 : sheetHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [sheetIndex, sheetHeight, translateY]);

  useEffect(() => {
    async function fetchUserAndProgram() {
      const id = await getCurrentUserId();
      setUserId(id);

      if (id) {
        const stored = await loadActiveProgram(id);
        setActiveProgram(stored);
      }
    }

    fetchUserAndProgram();
  }, []);

  useEffect(() => {
    if (!activeProgram) return;

    const interval = setInterval(() => {
      if (activeProgram.endTime <= Date.now()) {
        setActiveProgram(null);
        if (userId) {
          clearActiveProgram(userId);
        }
      } else {
        setActiveProgram((prev) => (prev ? { ...prev } : null));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeProgram, userId]);

  const handleOpenMode = (mode: ProgramMode) => {
    setSelectedMode(mode);
    setSheetIndex(0);
  };

  const titleMap: Record<ProgramMode, string> = {
    quick: "Snabbläge",
    eco: "Ecoläge",
    normal: "Standardläge",
  };

  const descriptionMap: Record<ProgramMode, string> = {
    quick: "Starta en snabb cykel med kortare programtid.",
    eco: "Spara energi och vatten med ett optimerat program.",
    normal: "Ett balanserat program för vardagsanvändning.",
  };

  const handleStartProgram = async () => {
    if (!selectedMode || !userId) return;

    const durationMs = 2 * 60 * 60 * 1000; // 2h
    const endTime = Date.now() + durationMs;

    const program = {
      mode: selectedMode,
      endTime,
    };

    setActiveProgram(program);
    await saveActiveProgram(userId, program);
    setSheetIndex(-1);

    try {
      const { sensorIp } = loadArduinoWifiState();
      await sendFanModeOverHttp(sensorIp ?? "", selectedMode);
      await sendFanCommandOverHttp(sensorIp ?? "", "FAN_ON");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(
        "Program startat",
        `Programmet startade i appen men Wi‑Fi-kommando till Airnest misslyckades.\n\n${msg}`
      );
      return;
    }
  };

  const handleStopProgram = async () => {
    setActiveProgram(null);
    if (userId) {
      await clearActiveProgram(userId);
    }
    try {
      const { sensorIp } = loadArduinoWifiState();
      await sendFanCommandOverHttp(sensorIp ?? "", "FAN_OFF");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(
        "Program avslutat i appen",
        `Kunde inte skicka stoppkommando till Airnest över Wi‑Fi.\n\n${msg}`
      );
    }
  };

  const remainingTime =
    activeProgram && activeProgram.endTime > Date.now()
      ? Math.max(0, Math.floor((activeProgram.endTime - Date.now()) / 1000))
      : 0;

  return (
    <>
      <SafeAreaView className="flex-1 bg-white px-6 pt-6">
        <Image
          source={require("../../assets/images/logo.png")}
          className="w-full h-40 mt-12"
          resizeMode="contain"
        />

        <View className="mt-10 flex-row justify-between">
          <TouchableOpacity
            className="bg-white rounded-3xl p-4 items-center shadow w-[30%]"
            onPress={() => handleOpenMode("quick")}
          >
            <Image
              source={require("../../assets/images/quick-mode.png")}
              className="w-20 h-20"
              resizeMode="contain"
            />
            <Text className="mt-3 font-semibold">Snabbläge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-3xl p-4 items-center shadow w-[30%]"
            onPress={() => handleOpenMode("eco")}
          >
            <Image
              source={require("../../assets/images/eco-mode.png")}
              className="w-20 h-20"
              resizeMode="contain"
            />
            <Text className="mt-3 font-semibold">Ecoläge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-3xl p-4 items-center shadow w-[30%]"
            onPress={() => handleOpenMode("normal")}
          >
            <Image
              source={require("../../assets/images/normal-mode.png")}
              className="w-20 h-20"
              resizeMode="contain"
            />
            <Text className="mt-3 font-semibold">Standard</Text>
          </TouchableOpacity>
        </View>

        <ProgramStatusCard
          activeProgram={activeProgram}
          remainingTime={remainingTime}
          emptyText='Inga pågående program - Välj ett program och tryck "Starta" för att påbörja torkning av kläder'
          onStopProgram={handleStopProgram}
        />

        <View className="flex-1" />
      </SafeAreaView>

      {sheetIndex === 0 && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSheetIndex(-1)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      )}

      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: sheetHeight,
          backgroundColor: "white",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          transform: [{ translateY }],
          paddingHorizontal: 24,
          paddingTop: 24,
        }}
      >
        {selectedMode && (
          <>
            <Text className="text-2xl font-semibold mb-2">
              {titleMap[selectedMode]}
            </Text>
            <Text className="text-base text-gray-600 mb-8">
              {descriptionMap[selectedMode]}
            </Text>
            <TouchableOpacity
              className="bg-black rounded-full py-3 items-center"
              style={{ backgroundColor: "#DE58AD" }}
              onPress={handleStartProgram}
            >
              <Text className="text-white font-semibold text-base">
                Starta
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </>
  );
}