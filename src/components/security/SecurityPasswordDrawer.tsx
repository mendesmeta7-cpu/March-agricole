"use client";

import { useState, useEffect, useCallback } from "react";
import Drawer from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import {
  changePasswordAction,
  getUserSecurityStatusAction,
  requestPasswordSetupOtpAction,
  UserSecurityStatus,
} from "@/lib/actions/security";
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Lock,
  Info,
  Loader2,
  Mail,
  RefreshCw,
  Send,
} from "lucide-react";

interface SecurityPasswordDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function SecurityPasswordDrawer({
  isOpen,
  onClose,
  userEmail,
}: SecurityPasswordDrawerProps) {
  const { toast } = useToast();

  // États du formulaire
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // Affichage / masquage des mots de passe
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // État de chargement et statut de sécurité (Fail-Closed)
  const [securityStatus, setSecurityStatus] = useState<UserSecurityStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Parcours OTP (Option A)
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  // Soumission et erreurs
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Réinitialisation de l'état sensible
  const resetFormState = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOtpCode("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setOtpSent(false);
    setIsSendingOtp(false);
    setOtpMessage(null);
    setErrorMessage(null);
  }, []);

  // Chargement fail-closed du statut de sécurité
  const fetchSecurityStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    setErrorMessage(null);

    try {
      const status = await getUserSecurityStatusAction();
      if (status.error) {
        setStatusError(status.error);
        setSecurityStatus(null);
      } else {
        setSecurityStatus(status);
        setStatusError(null);
      }
    } catch {
      setStatusError("Impossible de vérifier l'état de sécurité du compte. Veuillez réessayer.");
      setSecurityStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetFormState();
      fetchSecurityStatus();
    } else {
      resetFormState();
      setSecurityStatus(null);
      setStatusError(null);
    }
  }, [isOpen, resetFormState, fetchSecurityStatus]);

  const hasPassword = securityStatus?.hasPassword ?? false;
  const isOAuthOnly = securityStatus?.isOAuthOnly ?? false;

  // Envoi de l'OTP de réauthentification (Étape 2 - Option A)
  const handleSendOtp = async () => {
    setErrorMessage(null);
    setIsSendingOtp(true);

    try {
      const result = await requestPasswordSetupOtpAction();
      if (result.error) {
        setErrorMessage(result.error);
        toast.error("Échec de l'envoi", {
          description: result.error,
        });
      } else {
        setOtpSent(true);
        const msg = result.message || "Code de vérification envoyé à votre adresse e-mail.";
        setOtpMessage(msg);
        toast.success("Code envoyé", {
          description: msg,
        });
      }
    } catch {
      setErrorMessage("Une erreur imprévue est survenue lors de l'envoi du code.");
      toast.error("Erreur de communication", {
        description: "Impossible d'acheminer la demande d'OTP.",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Soumission principale
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    // Validation préalable commune
    if (!newPassword || !confirmPassword) {
      setErrorMessage("Veuillez renseigner et confirmer votre nouveau mot de passe.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Le nouveau mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    // Validation spécifique par parcours
    if (hasPassword) {
      if (!currentPassword) {
        setErrorMessage("Veuillez saisir votre mot de passe actuel.");
        return;
      }
      if (currentPassword === newPassword) {
        setErrorMessage("Le nouveau mot de passe doit être différent du mot de passe actuel.");
        return;
      }
    } else {
      // Parcours sans mot de passe : OTP strictement requis
      if (!otpSent) {
        setErrorMessage("Veuillez d'abord demander l'envoi d'un code de vérification.");
        return;
      }
      if (!otpCode || otpCode.trim().length < 6) {
        setErrorMessage("Veuillez renseigner le code de vérification à 6 chiffres reçu par e-mail.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (hasPassword) {
        formData.append("currentPassword", currentPassword);
      } else {
        formData.append("otp", otpCode.trim());
      }
      formData.append("newPassword", newPassword);
      formData.append("confirmPassword", confirmPassword);

      const result = await changePasswordAction(null, formData);

      if (result.error) {
        setErrorMessage(result.error);
        toast.error("Échec de l'opération", {
          description: result.error,
        });
      } else {
        toast.success("Sécurité mise à jour", {
          description:
            result.message ||
            (hasPassword
              ? "Votre mot de passe a été modifié avec succès."
              : "Votre mot de passe Radiza a été configuré."),
        });
        resetFormState();
        onClose();
      }
    } catch {
      setErrorMessage("Une erreur imprévue est survenue lors de l'enregistrement.");
      toast.error("Erreur de connexion", {
        description: "Impossible de joindre le serveur de sécurité. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {
        resetFormState();
        onClose();
      }}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-forest-700" />
          <span>
            {isLoadingStatus || statusError
              ? "Gestion du mot de passe"
              : hasPassword
              ? "Modifier mon mot de passe"
              : "Définir un mot de passe Radiza"}
          </span>
        </div>
      }
      description={
        isLoadingStatus || statusError
          ? "Vérification des identifiants de sécurité..."
          : hasPassword
          ? "Mettez à jour les identifiants de sécurité de votre compte professionnel."
          : "Ajoutez un mot de passe pour vous connecter directement par e-mail en plus de Google."
      }
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => {
              resetFormState();
              onClose();
            }}
            disabled={isSubmitting || isSendingOtp}
          >
            {statusError ? "Fermer" : "Annuler"}
          </Button>

          {/* Affichage du bouton de validation uniquement si le statut est valide */}
          {!statusError && !isLoadingStatus && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => handleSubmit()}
              isLoading={isSubmitting}
              disabled={isLoadingStatus || (!hasPassword && !otpSent)}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              {hasPassword ? "Mettre à jour le mot de passe" : "Enregistrer le mot de passe"}
            </Button>
          )}
        </div>
      }
    >
      {/* 1. Écran de chargement initial */}
      {isLoadingStatus && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="w-7 h-7 text-forest-700 animate-spin" />
          <p className="text-xs text-gray-500 font-medium">
            Vérification du statut de sécurité de votre compte...
          </p>
        </div>
      )}

      {/* 2. Règle FAIL-CLOSED : Blocage complet si statut indéterminé ou RPC indisponible */}
      {!isLoadingStatus && statusError && (
        <div className="py-4 space-y-4">
          <Alert
            variant="error"
            title="Vérification de sécurité impossible"
            icon={<AlertCircle className="w-4 h-4" />}
          >
            <p className="text-xs leading-relaxed">{statusError}</p>
            <p className="text-xs text-gray-600 mt-2">
              Par mesure de protection, la modification et la définition de mot de passe sont
              momentanément suspendues.
            </p>
          </Alert>

          <div className="flex justify-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchSecurityStatus}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Réessayer la vérification
            </Button>
          </div>
        </div>
      )}

      {/* 3. Formulaire actif (uniquement si le statut de sécurité est confirmé) */}
      {!isLoadingStatus && !statusError && securityStatus && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <Alert
              variant="error"
              title="Impossible de valider"
              icon={<AlertCircle className="w-4 h-4" />}
            >
              {errorMessage}
            </Alert>
          )}

          {/* Bandeau contextuel d'information */}
          {isOAuthOnly ? (
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200/80 space-y-2">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-xs uppercase tracking-wider">
                <Info className="w-4 h-4 text-sky-700" />
                <span>Compte associé à Google</span>
              </div>
              <p className="text-xs text-sky-800 leading-relaxed">
                Votre compte est authentifié via Google ({userEmail || "e-mail du profil"}).
                La création d&apos;un mot de passe vous permettra de vous connecter indifféremment
                avec vos identifiants Radiza ou via le bouton Google, sans doublon de compte ni perte de données.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Pour garantir la sécurité de vos transactions agricoles, choisissez un mot de passe unique
                d&apos;au moins 6 caractères associant lettres et chiffres.
              </p>
            </div>
          )}

          {/* PARCOURS A : Compte possédant déjà un mot de passe */}
          {hasPassword && (
            <FormField label="Mot de passe actuel" required>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Saisissez votre mot de passe actuel"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label={
                    showCurrentPassword
                      ? "Masquer le mot de passe actuel"
                      : "Afficher le mot de passe actuel"
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </FormField>
          )}

          {/* PARCOURS B : Compte sans mot de passe (Option A : OTP + Nonce) */}
          {!hasPassword && (
            <div className="space-y-4">
              {!otpSent ? (
                <div className="p-4 rounded-xl bg-forest-50/70 border border-forest-100 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-forest-900">
                        Étape 1 : Réauthentification par e-mail
                      </h4>
                      <p className="text-xs text-forest-800/90 mt-1 leading-relaxed">
                        Pour définir votre mot de passe en toute sécurité, nous devons confirmer votre identité.
                        Un code de vérification temporaire à 6 chiffres va être transmis à l&apos;adresse{" "}
                        <span className="font-semibold text-forest-950">{userEmail || "associée à votre profil"}</span>.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSendOtp}
                    isLoading={isSendingOtp}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Envoyer le code de vérification
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {otpMessage && (
                    <Alert
                      variant="info"
                      title="Code de sécurité envoyé"
                      icon={<CheckCircle2 className="w-4 h-4 text-sky-700" />}
                    >
                      <p className="text-xs leading-relaxed">{otpMessage}</p>
                    </Alert>
                  )}

                  <FormField
                    label="Code de vérification (OTP)"
                    description="Saisissez le code à 6 chiffres reçu dans votre boîte de réception."
                    required
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ""))}
                        placeholder="Ex: 123456"
                        maxLength={10}
                        autoComplete="one-time-code"
                        disabled={isSubmitting}
                        className="font-mono tracking-widest text-center text-sm font-semibold max-w-[200px]"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSendOtp}
                        isLoading={isSendingOtp}
                        disabled={isSubmitting}
                        leftIcon={<RefreshCw className="w-3 h-3" />}
                        className="text-xs"
                      >
                        Renvoyer un code
                      </Button>
                    </div>
                  </FormField>
                </div>
              )}
            </div>
          )}

          {/* Champs Nouveau mot de passe et Confirmation (accessibles pour hasPassword ou si OTP envoyé) */}
          {(hasPassword || otpSent) && (
            <>
              {/* Champ : Nouveau mot de passe */}
              <FormField
                label={hasPassword ? "Nouveau mot de passe" : "Définir le mot de passe"}
                description="Minimum 6 caractères."
                required
              >
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nouveau mot de passe (min. 6 caractères)"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                    aria-label={
                      showNewPassword
                        ? "Masquer le nouveau mot de passe"
                        : "Afficher le nouveau mot de passe"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </FormField>

              {/* Champ : Confirmation du nouveau mot de passe */}
              <FormField label="Confirmer le nouveau mot de passe" required>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le nouveau mot de passe"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword
                        ? "Masquer la confirmation du mot de passe"
                        : "Afficher la confirmation du mot de passe"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </FormField>

              {/* Indicateur visuel de conformité */}
              {newPassword && confirmPassword && (
                <div className="text-xs space-y-1 pt-1">
                  {newPassword.length < 6 ? (
                    <div className="text-rose-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Le mot de passe doit comporter au moins 6 caractères.</span>
                    </div>
                  ) : newPassword !== confirmPassword ? (
                    <div className="text-amber-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Les deux nouveaux mots de passe ne correspondent pas encore.</span>
                    </div>
                  ) : (
                    <div className="text-emerald-600 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Les mots de passe correspondent parfaitement.</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </form>
      )}
    </Drawer>
  );
}
