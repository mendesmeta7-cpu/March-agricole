import { StyleSheet, View } from "react-native";
import { AlertCircle, CloudOff, Info } from "lucide-react-native";

import { colors, radius, spacing } from "@/theme";
import { AppText } from "./AppText";
import { Button } from "./Button";

type Variant = "notConnected" | "error" | "info";

export interface StatusNoticeProps {
  variant: Variant;
  title: string;
  description?: string;
  onRetry?: () => void;
}

const look = {
  notConnected: { bg: colors.warningSoft, border: colors.warningBorder, icon: colors.warningIcon, Icon: CloudOff },
  error: { bg: colors.dangerSoft, border: colors.dangerBorder, icon: colors.danger, Icon: AlertCircle },
  info: { bg: colors.primarySoft, border: colors.border, icon: colors.primary, Icon: Info },
} as const;

/**
 * Avis d'état : données non connectées, panne de lecture ou information.
 * Équivalent mobile de DataUnavailableNotice : une donnée non lue n'est jamais présentée comme vide.
 */
export function StatusNotice({ variant, title, description, onRetry }: StatusNoticeProps) {
  const l = look[variant];
  return (
    <View
      accessibilityRole={variant === "error" ? "alert" : "summary"}
      style={[styles.box, { backgroundColor: l.bg, borderColor: l.border }]}
    >
      <View style={styles.header}>
        <l.Icon size={20} color={l.icon} />
        <AppText variant="label" style={styles.title}>
          {title}
        </AppText>
      </View>
      {description ? (
        <AppText variant="small" tone="secondary">
          {description}
        </AppText>
      ) : null}
      {onRetry ? <Button label="Réessayer" variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  title: { flex: 1 },
});
