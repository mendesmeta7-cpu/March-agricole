import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionProvider } from "@/session/SessionProvider";
import { colors } from "@/theme";

/** Racine : zones sûres, session, pile de navigation sans en-tête (chaque espace gère le sien). */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "fade",
          }}
        />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
