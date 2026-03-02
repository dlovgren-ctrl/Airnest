import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
        },
        tabBarIcon: ({ focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "ellipse-outline";

          if (route.name === "mainmenu") {
            iconName = focused ? "home" : "home-outline";
          }

          if (route.name === "diagnostics") {
            iconName = focused ? "analytics" : "analytics-outline";
          }

          if (route.name === "side-menu") {
            iconName = focused ? "menu" : "menu-outline";
          }

          return (
            <Ionicons
              name={iconName}
              size={26}
              color={focused ? "black" : "gray"}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="mainmenu" />
      <Tabs.Screen name="diagnostics" />
      
    </Tabs>
  );
}