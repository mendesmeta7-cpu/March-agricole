import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";

export interface ScreenProps {
  children: ReactNode;
  /** Contenu défilant (formulaires, pages longues). */
  scroll?: boolean;
  /** Bords protégés : les écrans à onglets laissent le bas à la barre d'onglets. */
  edges?: Edge[];
  centered?: boolean;
}

/** Conteneur d'écran : zones sûres, fond de l'application, clavier qui ne masque pas les champs. */
export function Screen({ children, scroll = false, edges = ["top", "bottom"], centered = false }: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, centered ? styles.centered : null]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, centered ? styles.centered : null]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={styles.fill}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
  centered: { justifyContent: "center" },
});
