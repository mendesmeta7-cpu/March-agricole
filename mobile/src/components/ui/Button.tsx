import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from "react-native";

import { colors, gray, radius, spacing, touchTarget } from "@/theme";
import { AppText } from "./AppText";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

export interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  variant?: Variant;
  size?: "md" | "lg";
  loading?: boolean;
  /** Texte annoncé et affiché pendant le chargement (ex. « Connexion en cours... »). */
  loadingLabel?: string;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
}

const palette: Record<Variant, { bg: string; pressed: string; text: "onPrimary" | "default" | "secondary"; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, text: "onPrimary" },
  secondary: { bg: gray[100], pressed: gray[200], text: "default", border: gray[200] },
  outline: { bg: colors.surface, pressed: gray[50], text: "secondary", border: gray[300] },
  ghost: { bg: "transparent", pressed: gray[100], text: "secondary" },
  danger: { bg: colors.danger, pressed: colors.dangerPressed, text: "onPrimary" },
};

/** Bouton : variantes du Web (Button.tsx), cible tactile de 48 dp, état occupé annoncé. */
export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  leftIcon,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const p = palette[variant];
  const isDisabled = disabled || loading;
  const shownLabel = loading && loadingLabel ? loadingLabel : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shownLabel}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      android_ripple={variant === "ghost" ? { color: gray[200] } : undefined}
      style={({ pressed }) => [
        styles.base,
        size === "lg" ? styles.lg : styles.md,
        { backgroundColor: pressed ? p.pressed : p.bg },
        p.border ? { borderWidth: 1, borderColor: p.border } : null,
        fullWidth ? styles.fullWidth : null,
        isDisabled ? styles.disabled : null,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={p.text === "onPrimary" ? colors.onPrimary : colors.primary} />
        ) : (
          leftIcon
        )}
        <AppText variant={size === "lg" ? "lead" : "label"} tone={p.text} numberOfLines={2} align="center">
          {shownLabel}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  md: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
  lg: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.lg },
  fullWidth: { alignSelf: "stretch" },
  disabled: { opacity: 0.55 },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
