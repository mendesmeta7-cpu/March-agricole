import { Stack } from "expo-router";

import { colors } from "@/theme";

/** Écrans d'accès : connexion, création de compte, mot de passe oublié, onboarding. */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: "Créer un compte" }} />
      <Stack.Screen name="forgot-password" options={{ title: "Mot de passe oublié" }} />
      <Stack.Screen name="onboarding" options={{ title: "Finaliser l'inscription" }} />
    </Stack>
  );
}
