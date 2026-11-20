import { StyleSheet, Text, type TextProps } from "react-native";

import { colors, fontSize } from "@/theme";

type Variant = "display" | "title" | "lead" | "body" | "small" | "caption" | "label";
type Tone = "default" | "secondary" | "muted" | "primary" | "danger" | "onPrimary";

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: "regular" | "medium" | "semibold" | "bold";
  align?: "left" | "center" | "right";
}

const toneColor: Record<Tone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  primary: colors.primary,
  danger: colors.dangerText,
  onPrimary: colors.onPrimary,
};

const weightValue = { regular: "400", medium: "500", semibold: "600", bold: "700" } as const;

/** Texte de l'application : police système (décision du 2026-11-15), agrandissement par l'utilisateur permis. */
export function AppText({
  variant = "body",
  tone = "default",
  weight,
  align,
  style,
  maxFontSizeMultiplier = 1.6,
  ...rest
}: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        styles[variant],
        { color: toneColor[tone] },
        weight ? { fontWeight: weightValue[weight] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontSize: fontSize.display, lineHeight: 32, fontWeight: "700" },
  title: { fontSize: fontSize.title, lineHeight: 28, fontWeight: "700" },
  lead: { fontSize: fontSize.lead, lineHeight: 26, fontWeight: "600" },
  body: { fontSize: fontSize.body, lineHeight: 24 },
  small: { fontSize: fontSize.small, lineHeight: 20 },
  caption: { fontSize: fontSize.caption, lineHeight: 16 },
  label: { fontSize: fontSize.small, lineHeight: 20, fontWeight: "600" },
});
