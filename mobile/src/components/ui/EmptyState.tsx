import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { colors, gray, radius, spacing } from "@/theme";
import { AppText } from "./AppText";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** État vide (lecture réussie sans résultat), sur le modèle d'EmptyState du Web. */
export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.box}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <AppText variant="lead" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText variant="small" tone="muted" align="center">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: gray[300],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  icon: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: gray[100],
  },
});
