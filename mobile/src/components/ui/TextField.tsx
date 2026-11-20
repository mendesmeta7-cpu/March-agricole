import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

import { colors, fontSize, radius, spacing, touchTarget } from "@/theme";
import { AppText } from "./AppText";

export interface TextFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string | null;
  helper?: string;
  /** Affiche un bouton pour montrer ou masquer le mot de passe (AUT-01 du Web). */
  revealable?: boolean;
}

/** Champ de saisie : libellé visible, erreur sous le champ et annoncée, saisie conservée. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, required, error, helper, revealable, secureTextEntry, style, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hidden = revealable ? !revealed : secureTextEntry;
  const borderColor = error ? colors.danger : focused ? colors.focus : colors.borderStrong;

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" tone="secondary">
        {label}
        {required ? <AppText variant="label" tone="danger"> *</AppText> : null}
      </AppText>
      <View style={[styles.inputRow, { borderColor }, focused ? styles.focused : null]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={hidden}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {revealable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            onPress={() => setRevealed((v) => !v)}
            style={styles.reveal}
            hitSlop={4}
          >
            {revealed ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="small" tone="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs + 2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  focused: { borderWidth: 2 },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text,
  },
  reveal: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
});
