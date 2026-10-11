"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { useEffect, useRef, Suspense } from "react";
import { resetPasswordAction } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import { AlertCircle, Eye, EyeOff, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Formulaire de définition du nouveau mot de passe
// ---------------------------------------------------------------------------
function ResetPasswordForm() {
  const [state, formAction] = useFormState(resetPasswordAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 shadow-sm border border-gray-200 rounded-2xl">
      {/* Bandeau sécurité */}
      <div className="mb-5 rounded-xl bg-amber-50 p-3.5 border border-amber-200 flex items-start gap-2.5 text-amber-800 text-xs sm:text-sm">
        <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          Cette page est sécurisée. Choisissez un nouveau mot de passe fort pour protéger
          votre compte.
        </div>
      </div>

      {state?.error && (
        <div className="mb-5 rounded-xl bg-red-50 p-3.5 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>{state.error}</div>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        {/* Nouveau mot de passe */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="reset-password"
            className="text-xs font-semibold text-gray-700 uppercase tracking-wide"
          >
            Nouveau mot de passe
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              id="reset-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Minimum 6 caractères"
              className="w-full pl-9 pr-10 py-3 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent bg-gray-50 transition-all"
            />
            <button
              type="button"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirmation */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="reset-confirm-password"
            className="text-xs font-semibold text-gray-700 uppercase tracking-wide"
          >
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              id="reset-confirm-password"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Répétez le mot de passe"
              className="w-full pl-9 pr-10 py-3 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent bg-gray-50 transition-all"
            />
            <button
              type="button"
              aria-label={showConfirm ? "Masquer la confirmation" : "Afficher la confirmation"}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <SubmitButton
          className="w-full py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white shadow-sm hover:shadow font-semibold text-sm min-h-[44px] flex items-center justify-center"
          loadingText="Mise à jour en cours..."
        >
          Mettre à jour le mot de passe
        </SubmitButton>
      </form>

      <div className="mt-5 flex justify-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-forest-700 hover:underline transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guard côté client : si aucune session recovery, afficher un message d erreur
// et renvoyer vers /login (le contrôle serveur strict est dans resetPasswordAction)
// ---------------------------------------------------------------------------
function NoSessionGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Page /reset-password
// ---------------------------------------------------------------------------
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/" aria-label="Retour à l accueil Radiza">
            <BrandLogo variant="horizontal" className="h-9 w-auto" />
          </Link>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">
            Nouveau mot de passe
          </h1>
          <p className="text-sm text-gray-500">
            Définissez un mot de passe sécurisé pour votre compte
          </p>
        </div>

        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
