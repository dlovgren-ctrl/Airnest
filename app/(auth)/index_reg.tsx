import "../../global.css"
import { useState } from "react";
import { Text, View, Image, TextInput, TouchableOpacity, Alert, StyleSheet, AppState } from "react-native";
import { supabase } from '../../lib/supabase'
import { Button, Input } from '@rneui/themed'
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function Register() {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)

    async function signUpWithEmail() {
        if (password !== confirmPassword) {
            Alert.alert("Lösenorden matchar inte")
            return
        }
        setLoading(true)

        const { error } = await supabase.auth.signUp({ email, password, })
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

        <View className="flex-1 bg-gray-100 px-6 -mt-1 pt-8 rounded-t-3xl">

        <Text className="text-gray-900 mb-4 text-base items-center font-medium text-3xl">
            Registrera ett konto
        </Text>

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
        <View className="flex-row items-center bg-white rounded-2xl border border-gray-300 px-4 py-4 mb-6">
            <TextInput
            placeholder="Ange ditt lösenord"
            className="flex-1 text-base"
            secureTextEntry
            onChangeText={(text) => setPassword(text)}
            value={password}
            />
        </View>
        <Text className="text-gray-700 mb-2 text-base font-medium">
            Bekräfta ditt lösenord
        </Text>
        <View className="flex-row items-center bg-white rounded-2xl border border-gray-300 px-4 py-4 mb-8">
            <TextInput
            placeholder="Ange ditt lösenord"
            className="flex-1 text-base"
            secureTextEntry
            onChangeText={(text) => setConfirmPassword(text)}
            value={confirmPassword}
            />
        </View>
        {/* Registrera, knapp */}
        <TouchableOpacity className="bg-slate-900 rounded-2xl py-5 items-center mb-8 shadow-lg mt-5" disabled={loading} onPress={() => signUpWithEmail()}>
            <Text className="text-white text-lg font-semibold">
            Registrera konto
            </Text>
        </TouchableOpacity>
    </View>
</View>
    )
}