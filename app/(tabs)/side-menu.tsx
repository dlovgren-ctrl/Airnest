import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function SideMenu() {
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/(auth)");
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      
      {/* Profil */}
      <View className="bg-white px-6 py-8 mb-6">
        <View className="flex-row items-center">
          <View className="w-16 h-16 rounded-full bg-gray-300 items-center justify-center mr-4">
            <Ionicons name="person" size={30} color="black" />
          </View>
          <View>
            <Text className="text-lg font-semibold">Ditt Namn</Text>
            <Text className="text-gray-500">din@email.se</Text>
          </View>
        </View>
      </View>

      {/* Menyval */}
      <View className="bg-white rounded-2xl mx-4">

        <TouchableOpacity className="flex-row items-center px-6 py-4 border-b border-gray-200">
          <Ionicons name="person-outline" size={22} />
          <Text className="ml-4 text-base">Profil</Text>
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center px-6 py-4 border-b border-gray-200">
          <Ionicons name="settings-outline" size={22} />
          <Text className="ml-4 text-base">Inställningar</Text>
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center px-6 py-4">
          <Ionicons name="settings-outline" size={22} />
          <Text className="ml-4 text-base">Hjälp</Text>
        </TouchableOpacity>
      </View>

      {/* Logga ut */}
      <View className="mt-6 mx-4">
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white rounded-2x1 px-6 py-4 flex-row items-center">
            <Ionicons name="log-out-outline" size={22} color="red" />
            <Text className="ml-4 text-base text-red-500">Logga ut</Text>
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}