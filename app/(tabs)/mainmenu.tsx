import { View, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";

export default function MainMenu() {
  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* Header, bild */}
        <Image
          source={require("../../assets/images/logo.png")}
          className="w-full h-32 mt-12"
          resizeMode="contain"
        />

        <View className="flex-1 justify-center items-center">
          <Text>Du är inloggad</Text>
        </View>
    </SafeAreaView>
  );
}


