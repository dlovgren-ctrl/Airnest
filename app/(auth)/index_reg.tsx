import "../../global.css"
import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";

/** iOS: hjälper Password AutoFill visa «Använd starkt lösenord». */
const IOS_NEW_PASSWORD_RULES = "minlength: 8; maxlength: 64;";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function normalizeAlias(raw: string): string {
  // Dataminimering: normalisera whitespace och begränsa längd på alias.
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export default function Register() {

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [loading, setLoading] = useState(false)

    async function signUpWithEmail() {
        const normalizedName = normalizeAlias(fullName)
        const normalizedEmail = normalizeEmail(email)
        if (!normalizedName) {
            Alert.alert("Saknar alias", "Skriv in ett alias.")
            return
        }
        if (!normalizedEmail) {
            Alert.alert("Saknar e-post", "Skriv in en giltig e-postadress.")
            return
        }
        if (password !== confirmPassword) {
            Alert.alert("Lösenorden matchar inte")
            return
        }
        if (!termsAccepted) {
            Alert.alert(
              "Godkännande saknas",
              "Du behöver läsa och godkänna Terms & Conditions för att skapa konto."
            )
            return
        }
        setLoading(true)

        const { error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
                data: { full_name: normalizedName },
            },
        })
        if (error) {
            Alert.alert(error.message)
        } else {
            Alert.alert("Kontot har skapats!")
            router.replace("/(tabs)")
        }
        setLoading(false)
    }

    return (
    <View className="flex-1 bg-white">

        <View className="flex-1 bg-white px-6 -mt-1 pt-8 rounded-t-3xl">

        <Text className="text-gray-900 mb-4 mt-12 text-4xl font-semibold">
            Registrera ett konto
        </Text>

        {/* Alias */}
        <Text className="text-gray-700 mb-2 text-base font-medium">
            Alias
        </Text>
        <TextInput
            placeholder="Ditt alias"
            className="bg-white rounded-2xl border border-gray-300 px-4 py-5 mb-6"
            autoCapitalize="words"
            onChangeText={(text) => setFullName(text)}
            value={fullName}
        />

        {/* E-post */}
        <Text className="text-gray-700 mb-2 text-base font-medium">
            E-post
        </Text>
        <TextInput
            placeholder="din@epost.se"
            className="bg-white rounded-2xl border border-gray-300 px-4 py-5 mb-6"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            onChangeText={(text) => setEmail(text)}
            value={email}
        />

        {/* Lösenord */}
        <Text className="text-gray-700 mb-2 text-base font-medium">
            Lösenord
        </Text>
        <View className="bg-white rounded-2xl border border-gray-300 mb-6 overflow-hidden">
          <TextInput
            placeholder="Ange ditt lösenord"
            className="px-4 py-5 text-base bg-transparent"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            autoComplete="password-new"
            textContentType="newPassword"
            passwordRules={
              Platform.OS === "ios" ? IOS_NEW_PASSWORD_RULES : undefined
            }
            onChangeText={(text) => setPassword(text)}
            value={password}
          />
        </View>
        <Text className="text-gray-700 mb-2 text-base font-medium">
            Bekräfta ditt lösenord
        </Text>
        <View className="bg-white rounded-2xl border border-gray-300 mb-8 overflow-hidden">
          <TextInput
            placeholder="Upprepa lösenordet"
            className="px-4 py-5 text-base bg-transparent"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            autoComplete="off"
            textContentType="none"
            onChangeText={(text) => setConfirmPassword(text)}
            value={confirmPassword}
          />
        </View>
        <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-6">
            <Text className="text-xs text-slate-700 leading-5">
            Vid registrering sparar vi e-post för inloggning och ett valfritt alias.{"\n"}
            Aliaset används bara för visning i appen och behöver inte vara ditt riktiga namn.
            </Text>
        </View>
        <TouchableOpacity
          className="flex-row items-start mb-6"
          activeOpacity={0.8}
          onPress={() => setTermsAccepted((prev) => !prev)}
        >
          <View
            className={`mt-0.5 mr-3 h-5 w-5 rounded border items-center justify-center ${
              termsAccepted ? "bg-slate-900 border-slate-900" : "bg-white border-gray-400"
            }`}
          >
            {termsAccepted ? (
              <Text className="text-white text-xs font-semibold">✓</Text>
            ) : null}
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-700 leading-5">
              Jag har läst och godkänner{" "}
              <Text
                className="underline font-medium text-slate-900"
                onPress={() => router.push("/terms-and-conditions")}
              >
                Terms & Conditions
              </Text>
              .
            </Text>
          </View>
        </TouchableOpacity>
        {/* Registrera, knapp */}
        <TouchableOpacity className="bg-slate-900 rounded-2xl py-5 items-center mb-8 shadow-lg mt-5" disabled={loading} onPress={() => signUpWithEmail()}>
            <Text className="text-white text-lg font-semibold">
            Registrera konto
            </Text>
        </TouchableOpacity>
    </View>
</View>
    );
}