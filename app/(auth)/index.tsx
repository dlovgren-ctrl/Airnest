import "../../global.css"
import { useState } from "react";
import { Text, View, Image, TextInput, TouchableOpacity, Alert, StyleSheet, AppState } from "react-native";
import { supabase } from '../../lib/supabase'
import { Button, Input } from '@rneui/themed'
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
 
export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        })

        if (error) {
          Alert.alert(error.message)
          setLoading(false)
        } else {
          router.replace("/(tabs)")
        }
      }
      async function signUpWithEmail() {
        setLoading(true)
        const {
          data: { session },
          error,
        } = await supabase.auth.signUp({
          email: email,
          password: password,
        })
        if (error){
          Alert.alert(error.message)
          setLoading(false)
        } else {
          router.replace("/(tabs)")
        }
      }

  return (
<View className="flex-1 bg-white">

  {/* Header, bild */}
  <Image
    source={require("../../assets/images/rusta.png")}
    className="w-full h-64"
    resizeMode="cover"
  />

    <View className="flex-1 bg-gray-100 px-6 -mt-1 pt-8 rounded-t-3xl">

      {/* E-post */}
      <Text className="text-gray-700 mb-2 text-base font-medium">
        E-post
      </Text>
      <TextInput
        placeholder="din@epost.se"
        className="bg-white rounded-2xl border border-gray-300 px-4 py-5 mb-6"
        keyboardType="email-address"
        onChangeText={(text) => setEmail(text)}
        value={email}
      />

      {/* Lösenord */}
      <Text className="text-gray-700 mb-2 text-base font-medium">
          Lösenord
      </Text>
      <View className="flex-row items-center bg-white rounded-2xl border border-gray-300 px-4 py-4 ">
        <TextInput
          placeholder="Ange ditt lösenord"
          className="flex-1 text-base"
          onChangeText={(text) => setPassword(text)}
          value={password}
        />
    
      </View>

      {/* Glömt lösenord */}
      <TouchableOpacity className="items-end mt-3 mb-8">
        <Text className="text-gray-600 underline">
          Glömt lösenord?
        </Text>
      </TouchableOpacity>

      {/* Logga-in, knapp */}
      <TouchableOpacity className="bg-slate-900 rounded-2xl py-5 items-center mb-8 shadow-lg" disabled={loading} onPress={() => signInWithEmail()}>
        <Text className="text-white text-lg font-semibold">
          Logga in
        </Text>
      </TouchableOpacity>

      {/* Registrera */}
      <View className="flex-row justify-center">
        <Text className="text-gray-600">
          Har du inget konto?{" "}
        </Text>
        <TouchableOpacity disabled={loading} onPress={() => router.push("../(auth)/index_reg")}>
          <Text className="font-semibold text-slate-900">
            Registrera dig
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
  );
}