import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

type HelpItem = {
  id: string;
  title: string;
  body: string;
};

const ITEMS: HelpItem[] = [
  {
    id: "use",
    title: "Hur appen används",
    body: 'Gå till huvudmenyn och klicka på något av de program som passar dig bäst och klicka på "Starta".',
  },
  {
    id: "wifi",
    title: "Hur man ansluter till Wifi",
    body: "Säkerställ att du har Wifi och Bluetooth aktiverat på din handhållna enhet. Gå sedan till sidomenyn och klicka på inställningar. Ange uppgifterna för ditt hemmanätverk och klicka på anslut.",
  },
  {
    id: "password",
    title: "Hur man byter lösenord",
    body: 'Gå in på sidomenyn och öppna "Profil". Klicka på "Byt lösenord".',
  },
  {
    id: "network-safety",
    title: "Säkerhet i lokalt nätverk",
    body: "Airnest styrs över lokalt nätverk. Om andra har åtkomst till samma nätverk och känner till enhetens IP-adress kan de i vissa fall skicka kommandon. Använd därför skyddat Wi‑Fi och dela inte nätverksåtkomst med obehöriga.",
  },
  {
    id: "privacy",
    title: "Hur persondata hanteras",
    body: "Vi sparar e-post för inloggning och ett valfritt alias för visning i appen. Alias behöver inte vara ditt riktiga namn. Data används för att driva kontot och appens funktioner.",
  },
];

export default function HelpScreen() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-2 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2"
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold ml-1">Hjälp</Text>
      </View>

      <View className="px-6 pt-6">
        <Text className="text-2xl font-semibold text-gray-900 mb-2">
          Hjälp
        </Text>
        <Text className="text-gray-500 text-sm mb-6">
          Tryck på en rubrik för att läsa mer.
        </Text>

        {ITEMS.map((item) => {
          const open = openId === item.id;
          return (
            <View
              key={item.id}
              className="border border-gray-200 rounded-2xl mb-3 overflow-hidden"
            >
              <TouchableOpacity
                className="flex-row items-center justify-between px-4 py-4 bg-gray-50"
                onPress={() => toggle(item.id)}
                activeOpacity={0.7}
              >
                <Text className="text-base font-semibold text-gray-900 flex-1 pr-2">
                  {item.title}
                </Text>
                <Ionicons
                  name={open ? "chevron-up" : "chevron-down"}
                  size={22}
                  color="#374151"
                />
              </TouchableOpacity>
              {open ? (
                <View className="px-4 py-4 bg-white border-t border-gray-100">
                  <Text className="text-base text-gray-700 leading-6">
                    {item.body}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}

        <TouchableOpacity
          className="rounded-2xl border border-gray-300 py-3 px-4 mt-2 mb-8"
          onPress={() => router.push("/terms-and-conditions")}
        >
          <Text className="text-center text-sm font-semibold text-gray-800">
            Läs Terms & Conditions
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
