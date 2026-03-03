import React, { useRef, useState, useMemo } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet, {
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

type Program = {
  title: string;
  description: string;
};

export default function MainMenu() {
  const bottomSheetRef = useRef<BottomSheet | null>(null);
  const snapPoints = useMemo(() => ["50%"], []);

  const [selectedProgram, setSelectedProgram] =
    useState<Program | null>(null);

  const handleProgramPress = (program: Program) => {
    if (selectedProgram?.title === program.title) {
      bottomSheetRef.current?.close();
      setSelectedProgram(null);
      return;
    }

    setSelectedProgram(program);
    bottomSheetRef.current?.snapToIndex(0);
  };

  return (
    <BottomSheetModalProvider>
      <>
        {/* ===== MAIN CONTENT ===== */}
        <SafeAreaView className="flex-1 bg-white px-6 pt-6">
          <Image
            source={require("../../assets/images/logo.png")}
            className="w-full h-40 mt-12"
            resizeMode="contain"
          />

          <View className="mt-10 flex-row justify-between">
            <TouchableOpacity
              className="bg-white rounded-3xl p-4 items-center shadow w-[30%]"
              onPress={() =>
                handleProgramPress({
                  title: "Snabbläge",
                  description:
                    "Torkar snabbt med högre temperatur. Perfekt när du har bråttom.",
                })
              }
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
              onPress={() =>
                handleProgramPress({
                  title: "Ekoläge",
                  description:
                    "Energisnålt program med lägre temperatur och längre torktid.",
                })
              }
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
              onPress={() =>
                handleProgramPress({
                  title: "Standard",
                  description:
                    "Balanserad torkning för vardagsbruk. Normal temperatur och tid.",
                })
              }
            >
              <Image
                source={require("../../assets/images/normal-mode.png")}
                className="w-20 h-20"
                resizeMode="contain"
              />
              <Text className="mt-3 font-semibold">Standard</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center items-center">
            <Text>Du är inloggad</Text>
          </View>
        </SafeAreaView>

        {/* ===== BOTTOM SHEET ===== */}
        <BottomSheet
          ref={bottomSheetRef}
          index={10}
          snapPoints={snapPoints}
          backgroundStyle={{ backgroundColor: "red"}}
          enablePanDownToClose
          onClose={() => setSelectedProgram(null)}
        >
          <View className="px-6">
            {selectedProgram && (
              <Animated.View
                key={selectedProgram.title}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
              >
                <Text className="text-xl font-bold mb-3">
                  {selectedProgram.title}
                </Text>

                <Text className="mb-6">
                  {selectedProgram.description}
                </Text>

                <TouchableOpacity
                  className="bg-blue-600 py-4 rounded-2xl items-center"
                  onPress={() => {
                    console.log("Startar:", selectedProgram.title);
                    bottomSheetRef.current?.close();
                  }}
                >
                  <Text className="text-white font-semibold">
                    Starta program
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </BottomSheet>
      </>
    </BottomSheetModalProvider>
  );
}
