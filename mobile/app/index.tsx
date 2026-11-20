import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { AppText, BrandLogo, Button, Screen, StatusNotice } from "@/components/ui";
import { services } from "@/services";
import { useSession } from "@/session/SessionProvider";
import { colors, spacing } from "@/theme";

/**
 * Aiguillage à l'ouverture, sur le modèle du middleware du Web (src/lib/supabase/middleware.ts) :
 * pas de session → connexion ; rôle non attribué ou onboarding incomplet → onboarding ;
 * Société et Revendeur → leur espace ; administrateur → le Web (hors périmètre mobile, ADR-067).
 */
export default function Index() {
  const { state, refresh, setSession } = useSession();

  if (state.status === "loading") {
    return (
      <Screen centered>
        <View style={styles.center} accessibilityLabel="Chargement de votre session" accessible>
          <BrandLogo variant="horizontal" height={42} />
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (state.status === "error") {
    return (
      <Screen centered>
        <StatusNotice
          variant="error"
          title="Impossible de vérifier votre session"
          description={state.error.message}
          onRetry={() => void refresh()}
        />
      </Screen>
    );
  }

  const session = state.session;
  if (!session) return <Redirect href="/login" />;
  if (session.role === "unassigned" || !session.onboardingCompleted) return <Redirect href="/onboarding" />;
  if (session.role === "company") return <Redirect href="/company" />;
  if (session.role === "reseller") return <Redirect href="/reseller" />;

  return (
    <Screen centered>
      <View style={styles.center}>
        <BrandLogo variant="horizontal" height={42} />
        <AppText variant="lead" align="center">
          Espace d'administration
        </AppText>
        <AppText variant="body" tone="muted" align="center">
          L'administration de Radiza se fait uniquement depuis le site Web.
        </AppText>
        <Button
          label="Se déconnecter"
          variant="outline"
          onPress={async () => {
            const result = await services.auth.signOut();
            if (result.ok) setSession(null);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", gap: spacing.xl },
});
