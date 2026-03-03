import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { View, TouchableOpacity } from "react-native";

function TabBar({ state, navigation }: BottomTabBarProps) {
  const order = ["side-menu", "index", "diagnostics"] as const;

  return (
    <View
      style={{
        flexDirection: "row",
        height: 70,
        paddingBottom: 10,
        backgroundColor: "white",
      }}
    >
      {order.map((name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return null;

        const index = state.routes.indexOf(route);
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        let iconName: keyof typeof Ionicons.glyphMap | null = null;
        if (route.name === "index") {
          iconName = focused ? "home" : "home-outline";
        } else if (route.name === "diagnostics") {
          iconName = focused ? "analytics" : "analytics-outline";
        } else if (route.name === "side-menu") {
          iconName = focused ? "menu" : "menu-outline";
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {iconName ? (
              <Ionicons
                name={iconName}
                size={26}
                color={focused ? "black" : "gray"}
              />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="side-menu" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="diagnostics" />
      
    </Tabs>
  );
}