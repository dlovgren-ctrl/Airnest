import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { fetchAuthUserProfile } from "../lib/userProfile";

function normalizeAlias(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export default function ProfileScreen() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingAlias, setSavingAlias] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const hydrate = useCallback(async () => {
    const p = await fetchAuthUserProfile();
    if (p) {
      setEmail(p.email);
      setFullName(p.fullName);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate])
  );

  async function handleSaveAlias() {
    const alias = normalizeAlias(fullName);
    if (!alias) {
      Alert.alert("Saknar alias", "Skriv in ett alias.");
      return;
    }
    setSavingAlias(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: alias },
    });
    setSavingAlias(false);

    if (error) {
      Alert.alert("Kunde inte spara", error.message);
      return;
    }
    setFullName(alias);
    Alert.alert("Sparat", "Ditt alias har uppdaterats.");
  }

  async function handleChangePassword() {
    if (!newPassword || !confirmPassword) {
      Alert.alert(
        "Ofullständigt lösenord",
        "Fyll i både nytt lösenord och bekräfta lösenord."
      );
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(
        "För kort lösenord",
        "Lösenordet måste vara minst 6 tecken."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Matchar inte", "Lösenorden är inte lika.");
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSavingPassword(false);

    if (error) {
      Alert.alert("Kunde inte byta lösenord", error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    Alert.alert("Sparat", "Ditt lösenord har uppdaterats.");
  }

  function handleDeleteAccountPress() {
    Alert.alert(
      "Radera konto?",
      "Detta markerar ditt konto för radering och loggar ut dig från appen.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Radera konto",
          style: "destructive",
          onPress: () => {
            void handleDeleteAccount();
          },
        },
      ]
    );
  }

  async function handleDeleteAccount() {
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        deletion_requested: true,
        deletion_requested_at: nowIso,
      },
    });

    if (updateError) {
      Alert.alert("Kunde inte markera radering", updateError.message);
      return;
    }

    await supabase.auth.signOut();
    Alert.alert(
      "Radering begärd",
      "Ditt konto är markerat för radering och du har loggats ut."
    );
    router.replace("/(auth)");
  }

  const inputStyle = {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center px-4 py-2 border-b border-gray-100">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2"
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={26} color="#111" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold ml-1">Profil</Text>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <View className="bg-white rounded-3xl border border-gray-200 p-5 mb-4">
            <Text className="text-gray-500 text-sm mb-1">E-post</Text>
            <Text className="text-base text-gray-900 mb-4">{email || "—"}</Text>

            <Text className="text-gray-700 font-medium mb-2">Alias</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ditt alias"
              placeholderTextColor="#6b7280"
              autoCapitalize="words"
              style={inputStyle}
            />
            <TouchableOpacity
              className="bg-slate-900 rounded-2xl py-4 items-center mt-4"
              onPress={() => void handleSaveAlias()}
              disabled={savingAlias}
            >
              <Text className="text-white font-semibold">
                {savingAlias ? "Sparar…" : "Spara"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-3xl border border-gray-200 p-5 mb-4">
            <Text className="text-lg font-semibold mb-2">Byt lösenord</Text>
            <Text className="text-gray-500 text-sm mb-4">
              Lämna tomt om du bara vill uppdatera alias.
            </Text>

            <Text className="text-gray-700 font-medium mb-2">Nytt lösenord</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nytt lösenord"
              placeholderTextColor="#6b7280"
              secureTextEntry
              style={[inputStyle, { marginBottom: 16 }]}
            />

            <Text className="text-gray-700 font-medium mb-2">
              Bekräfta lösenord
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Upprepa lösenord"
              placeholderTextColor="#6b7280"
              secureTextEntry
              style={inputStyle}
            />

            <TouchableOpacity
              className="bg-slate-900 rounded-2xl py-4 items-center mt-5"
              onPress={() => void handleChangePassword()}
              disabled={savingPassword}
            >
              <Text className="text-white font-semibold">
                {savingPassword ? "Sparar…" : "Byt lösenord"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-3xl border border-red-200 p-5">
            <Text className="text-lg font-semibold mb-2">Konto</Text>
            <Text className="text-gray-500 text-sm mb-4">
              Om du vill lämna tjänsten kan du begära radering av kontot.
            </Text>
            <TouchableOpacity
              className="border border-red-300 rounded-2xl py-4 items-center"
              onPress={handleDeleteAccountPress}
            >
              <Text className="text-red-700 font-semibold">Radera konto</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
