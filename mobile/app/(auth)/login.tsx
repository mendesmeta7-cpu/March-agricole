import { useRef, useState } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { Link, useRouter } from "expo-router";

import { AppText, BrandLogo, Button, Screen, StatusNotice, TextField } from "@/components/ui";
import { services, type ServiceError } from "@/services";
import { useSession } from "@/session/SessionProvider";
import { colors, spacing } from "@/theme";

/** Connexion par e-mail : textes repris de src/app/login/page.tsx et src/lib/actions/auth.ts. */
export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useSession();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<ServiceError | null>(null);

  const submit = async () => {
    setFormError(null);
    setServiceError(null);
    if (!email.trim() || !password) {
      setFormError("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }
    setSubmitting(true);
    const result = await services.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (!result.ok) {
      setServiceError(result.error);
      return;
    }
    setSession(result.data);
    router.replace("/");
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <BrandLogo variant="horizontal" height={42} />
        <AppText variant="display" align="center" accessibilityRole="header">
          Connexion à votre espace
        </AppText>
        <AppText variant="small" tone="muted" align="center">
          Ou{" "}
          <Link href="/register" style={styles.link}>
            créer un nouveau compte
          </Link>
        </AppText>
      </View>

      {serviceError ? (
        <StatusNotice
          variant={serviceError.code === "NOT_CONNECTED" ? "notConnected" : "error"}
          title={serviceError.code === "NOT_CONNECTED" ? "Connexion indisponible" : "Connexion impossible"}
          description={serviceError.message}
        />
      ) : null}

      <View style={styles.form}>
        <TextField
          label="Adresse email"
          value={email}
          onChangeText={setEmail}
          placeholder="nom@domaine.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!submitting}
        />
        <TextField
          ref={passwordRef}
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          revealable
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          editable={!submitting}
          error={formError}
        />
        <Link href="/forgot-password" style={[styles.link, styles.forgot]}>
          Mot de passe oublié ?
        </Link>
        <Button
          label="Se connecter"
          loading={submitting}
          loadingLabel="Connexion en cours..."
          size="lg"
          fullWidth
          onPress={() => void submit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: spacing.md, paddingTop: spacing.xl },
  form: { gap: spacing.lg },
  link: { color: colors.primary, fontWeight: "600" },
  forgot: { alignSelf: "flex-end", paddingVertical: spacing.sm, fontSize: 14 },
});
