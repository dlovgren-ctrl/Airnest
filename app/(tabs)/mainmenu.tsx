import React, { useMemo } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet from "@gorhom/bottom-sheet";

export default function MainMenu() {
  const snapPoints = useMemo(() => ["50%"], []);

  return (
    <>
      <SafeAreaView className="flex-1 bg-white px-6 pt-6">
        <Image
          source={require("../../assets/images/logo.png")}
          className="w-full h-40 mt-12"
          resizeMode="contain"
        />

        <View className="mt-10 flex-row justify-between">
          <TouchableOpacity className="bg-white rounded-3xl p-4 items-center shadow w-[30%]">
            <Image
              source={require("../../assets/images/quick-mode.png")}
              className="w-20 h-20"
              resizeMode="contain"
            />
            <Text className="mt-3 font-semibold">Snabbläge</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white rounded-3xl p-4 items-center shadow w-[30%]">
            <Image
              source={require("../../assets/images/eco-mode.png")}
              className="w-20 h-20"
              resizeMode="contain"
            />
            <Text className="mt-3 font-semibold">Ecoläge</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-white rounded-3xl p-4 items-center shadow w-[30%]">
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

      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: "red" }}
      >
        <View style={{ padding: 40 }}>
          <Text style={{ color: "white", fontSize: 22 }}>
            SYNNS NU?
          </Text>
        </View>
      </BottomSheet>
    </>
  );
}