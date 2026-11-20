import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ChevronRight, LogOut } from "lucide-react-native";

import { AppText, Button, Screen, StatusNotice } from "@/components/ui";
import { services } from "@/services";
import { useSession } from "@/session/SessionProvider";
import { colors, radius, spacing, touchTarget } from "@/theme";
import type { SectionLink } from "./sections";

export interface MoreMenuProps {
  sections: SectionLink[];
  /** Nom de l'espace dans la confirmation de déconnexion (« Société », « Revendeur »). */
  spaceName: string;
}

/** Onglet « Plus » : rubriques secondaires et déconnexion avec confirmation, comme sur le Web. */
export function MoreMenu({ sections, spaceName }: MoreMenuProps) {
  const router = useRouter();
  const { setSession } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    setSigningOut(true);
    setError(null);
    const result = await services.auth.signOut();
    setSigningOut(false);
    if (result.ok) setSession(null);
    else setError(result.error.message);
  };

  const confirmSignOut = () => {
    Alert.alert(
      "Confirmation de déconnexion",
      `Êtes-vous certain de vouloir vous déconnecter de votre espace ${spaceName} ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Oui, me déconnecter", style: "destructive", onPress: () => void signOut() },
      ]
    );
  };

  return (
    <Screen edges={["top"]} scroll>
      <AppText variant="title" accessibilityRole="header">
        Plus
      </AppText>
      <View style={styles.list}>
        {sections.map(({ href, label, Icon }, index) => (
          <Pressable
            key={href}
            accessibilityRole="link"
            accessibilityLabel={label}
            onPress={() => router.push(href as Href)}
            android_ripple={{ color: colors.border }}
            style={({ pressed }) => [
              styles.row,
              index > 0 ? styles.separator : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Icon size={22} color={colors.primary} />
            <AppText variant="body" weight="medium" style={styles.label}>
              {label}
            </AppText>
            <ChevronRight size={20} color={colors.placeholder} />
          </Pressable>
        ))}
      </View>
      {error ? <StatusNotice variant="error" title="Déconnexion impossible" description={error} /> : null}
      <Button
        label="Se déconnecter"
        variant="outline"
        loading={signingOut}
        loadingLabel="Déconnexion en cours..."
        leftIcon={<LogOut size={18} color={colors.textSecondary} />}
        onPress={confirmSignOut}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: touchTarget + 8,
    paddingHorizontal: spacing.lg,
  },
  separator: { borderTopWidth: 1, borderTopColor: colors.border },
  pressed: { backgroundColor: colors.surfaceMuted },
  label: { flex: 1 },
});
