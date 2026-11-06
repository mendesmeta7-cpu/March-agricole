/**
 * Preuve de récupération de mot de passe (audit SEC-10).
 *
 * Posée par /auth/callback uniquement dans la branche « recovery » (lien reçu par
 * e-mail), elle contient l'identifiant du compte concerné. resetPasswordAction
 * l'exige : une session ordinaire (volée ou laissée ouverte) ne permet donc pas
 * de redéfinir le mot de passe sans connaître l'ancien.
 */
export const RECOVERY_PROOF_COOKIE = "radiza_recovery_proof";

/** Durée de validité : 15 minutes après l'ouverture du lien. */
export const RECOVERY_PROOF_MAX_AGE_SECONDS = 15 * 60;
