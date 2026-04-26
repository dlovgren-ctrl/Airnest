import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

type Section = {
  title: string;
  body: string;
};

const SECTIONS: Section[] = [
  {
    title: "1. Om appen",
    body: "Airnest är ett skolprojekt. Appen används för att styra och övervaka ett torkskåp över lokalt nätverk och Bluetooth.",
  },
  {
    title: "2. Personuppgifter",
    body: "Vid registrering sparas e-postadress för inloggning och ett valfritt alias för visning i appen. Alias behöver inte vara ditt riktiga namn.",
  },
  {
    title: "3. Ändamål",
    body: "Uppgifterna används för autentisering, grundläggande kontohantering och för att appens funktioner ska fungera.",
  },
  {
    title: "4. Lagring",
    body: "Kontodata lagras i Supabase. Appen kan även spara lokal teknisk data på enheten, till exempel parkopplad SSID/IP för Airnest.",
  },
  {
    title: "5. Radering och rättelser",
    body: "Du kan begära kontoradering via Profil. Kontot markeras då för radering och blockeras från fortsatt inloggning. Du kan också uppdatera alias och lösenord i Profil.",
  },
  {
    title: "6. Säkerhet och ansvar",
    body: "Styrning sker över lokalt nätverk. Personer som har åtkomst till samma nätverk och enhetens IP-adress kan i vissa fall skicka kommandon till Airnest. Använd därför ett skyddat Wi‑Fi, dela inte nätverksåtkomst med obehöriga och parkoppla endast enheten i betrodda miljöer.",
  },
  {
    title: "7. Projektets natur",
    body: "Detta är ett utbildningsprojekt och ingen kommersiell tjänst. Funktioner, villkor och databehandling kan ändras inom ramen för kursarbetet.",
  },
];

export default function TermsAndConditionsScreen() {
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
        <Text className="text-lg font-semibold ml-1">Terms & Conditions</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 28 }}>
        <Text className="text-2xl font-semibold text-gray-900 mb-2">
          Terms & Conditions
        </Text>
        <Text className="text-sm text-gray-500 mb-6">
          Senast uppdaterad: april 2026
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} className="mb-5">
            <Text className="text-base font-semibold text-gray-900 mb-1">
              {section.title}
            </Text>
            <Text className="text-sm text-gray-700 leading-6">{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
