import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, TouchableOpacity, Animated, Dimensions } from "react-native";
import { Svg, Circle } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";


export default function MainMenu() {
  const snapPoints = useMemo(() => ["50%"], []);
  const [selectedMode, setSelectedMode] = useState<
    "quick" | "eco" | "normal" | null
  >(null);
  const [sheetIndex, setSheetIndex] = useState(-1);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeProgram, setActiveProgram] = useState<{
    mode: "quick" | "eco" | "normal";
    endTime: number;
  } | null>(null);

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
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      setUserId(id);

      if (id) {
        try {
          const stored = localStorage.getItem(`activeProgram:${id}`);
          if (stored) {
            const parsed = JSON.parse(stored) as {
              mode: "quick" | "eco" | "normal";
              endTime: number;
            };
            if (parsed.endTime && parsed.endTime > Date.now()) {
              setActiveProgram(parsed);
            } else {
              localStorage.removeItem(`activeProgram:${id}`);
            }
          }
        } catch {
          // ignore storage errors
        }
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
          try {
            localStorage.removeItem(`activeProgram:${userId}`);
          } catch {
            // ignore
          }
        }
      } else {
        setActiveProgram((prev) => (prev ? { ...prev } : null));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeProgram, userId]);

  const handleOpenMode = (mode: "quick" | "eco" | "normal") => {
    setSelectedMode(mode);
    setSheetIndex(0);
  };

  const titleMap: Record<"quick" | "eco" | "normal", string> = {
    quick: "Snabbläge",
    eco: "Ecoläge",
    normal: "Standardläge",
  };

  const descriptionMap: Record<"quick" | "eco" | "normal", string> = {
    quick: "Starta en snabb cykel med kortare programtid.",
    eco: "Spara energi och vatten med ett optimerat program.",
    normal: "Ett balanserat program för vardagsanvändning.",
  };

  const runningDescriptionMap: Record<"quick" | "eco" | "normal", string> = {
    quick: "Just nu utförs en snabbtork!",
    eco: "Just nu körs ett energisnålt program!",
    normal: "Just nu körs standardprogrammet!",
  };

  const imageMap: Record<"quick" | "eco" | "normal", any> = {
    quick: require("../../assets/images/quick-mode.png"),
    eco: require("../../assets/images/eco-mode.png"),
    normal: require("../../assets/images/normal-mode.png"),
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
    try {
      localStorage.setItem(`activeProgram:${userId}`, JSON.stringify(program));
    } catch {
      // ignore storage errors
    }
    setSheetIndex(-1);
  };

  const handleStopProgram = async () => {
    setActiveProgram(null);
    if (userId) {
      try {
        localStorage.removeItem(`activeProgram:${userId}`);
      } catch {
        // ignore
      }
    }
  };

  const remainingTime =
    activeProgram && activeProgram.endTime > Date.now()
      ? Math.max(0, Math.floor((activeProgram.endTime - Date.now()) / 1000))
      : 0;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  const totalDurationSec = 2 * 60 * 60;
  const progress =
    totalDurationSec > 0
      ? Math.max(0, Math.min(1, remainingTime / totalDurationSec))
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

        <View className="mt-10">
          <Text className="text-lg font-semibold mb-3">Pågående program</Text>
          {!activeProgram ? (
            <Text className="text-sm text-gray-600">
              Inga pågående program - Välj ett program och tryck "Starta" för
              att påbörja torkning av kläder
            </Text>
          ) : (
            <View className="flex-row items-center justify-between bg-white rounded-3xl px-5 py-5 shadow">
              <View className="flex-1 pr-5">
                <Text className="text-lg font-semibold mb-2">
                  {titleMap[activeProgram.mode]}
                </Text>
                <Text className="text-sm text-gray-600 mb-3">
                  {runningDescriptionMap[activeProgram.mode]}
                </Text>
                <Text className="text-xs text-gray-500">
                  Återstående tid: {formatTime(remainingTime)}
                </Text>
              </View>

              <View className="items-center">
                <View
                  style={{
                    width: 96,
                    height: 96,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Svg width={96} height={96}>
                    <Circle
                      cx={48}
                      cy={48}
                      r={42}
                      stroke="#e5e7eb"
                      strokeWidth={5}
                      fill="none"
                    />
                    <Circle
                      cx={48}
                      cy={48}
                      r={42}
                      stroke="#4ade80"
                      strokeWidth={5}
                      fill="none"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={
                        (2 * Math.PI * 42) * (1 - progress)
                      }
                      strokeLinecap="round"
                      rotation={-90}
                      origin="48,48"
                    />
                  </Svg>
                  <View
                    style={{
                      position: "absolute",
                      width: 76,
                      height: 76,
                      borderRadius: 38,
                      backgroundColor: "white",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      source={imageMap[activeProgram.mode]}
                      style={{ width: 56, height: 56 }}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {activeProgram && (
          <View className="mt-8">
            <TouchableOpacity
              className="rounded-2xl py-3 items-center"
              style={{ backgroundColor: "#DE58AD" }}
              onPress={handleStopProgram}
            >
              <Text className="text-white font-semibold">
                Avsluta pågående program
              </Text>
            </TouchableOpacity>
          </View>
        )}

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