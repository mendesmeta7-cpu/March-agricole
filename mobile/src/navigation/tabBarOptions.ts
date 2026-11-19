import type { TabsScreenOptions } from "expo-router/js-tabs";

import { colors, gray } from "@/theme";

/** Apparence commune des barres d'onglets Société et Revendeur. */
export const tabBarOptions: TabsScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: gray[500],
  tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
  tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
  sceneStyle: { backgroundColor: colors.background },
};
