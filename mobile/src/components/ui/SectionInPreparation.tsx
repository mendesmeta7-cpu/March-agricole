import { StyleSheet, View } from "react-native";

import { spacing } from "@/theme";
import { AppText } from "./AppText";
import { Screen } from "./Screen";
import { StatusNotice } from "./StatusNotice";

export interface SectionInPreparationProps {
  /** Libellé de la rubrique, identique au menu du Web (ADR-055). */
  title: string;
  /**
   * `tab` : écran d'onglet, titre dans la page (la barre d'onglets protège le bas).
   * `stacked` : écran empilé, titre déjà affiché par l'en-tête de navigation.
   */
  layout?: "tab" | "stacked";
}

/** Rubrique dont l'écran n'est pas encore construit : aucune donnée, simple repère de navigation. */
export function SectionInPreparation({ title, layout = "tab" }: SectionInPreparationProps) {
  const stacked = layout === "stacked";
  return (
    <Screen edges={stacked ? ["bottom"] : ["top"]} scroll>
      {stacked ? null : (
        <View style={styles.header}>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
        </View>
      )}
      <StatusNotice
        variant="info"
        title="Écran en préparation"
        description="Cette rubrique sera construite dans une prochaine étape du développement de l'application mobile."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
});
