"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { Suspense } from "react";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import { AlertCircle, CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

// ---------------------------------------------------------------------------
// Formulaire de demande de réinitialisation
// ---------------------------------------------------------------------------
function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestPasswordResetAction, null);

  if (state?.success && state?.emailSent) {
    return (
      <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 shadow-sm border border-gray-200 rounded-2xl text-center">
        <div className="flex flex-col items-center gap-3 mb-5">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-forest-50 border border-forest-200">
            <CheckCircle2 className="w-7 h-7 text-forest-700" />
          </span>
          <h2 className="text-xl font-bold text-gray-900">Vérifiez votre boîte mail</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Si un compte correspond à cette adresse e-mail, vous recevrez un lien de
          réinitialisation dans les prochaines minutes. Vérifiez également votre dossier
          <span className="font-medium"> Spam / Indésirables</span>.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:text-forest-800 hover:underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 shadow-sm border border-gray-200 rounded-2xl">
      {state?.error && (
        <div className="mb-5 rounded-xl bg-red-50 p-3.5 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>{state.error}</div>
        </div>
      )}

      <p className="text-sm text-gray-600 mb-5 leading-relaxed">
        Saisissez l&apos;adresse e-mail associée à votre compte. Vous recevrez un lien pour
        créer un nouveau mot de passe.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="forgot-email"
            className="text-xs font-semibold text-gray-700 uppercase tracking-wide"
          >
            Adresse e-mail
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="votre@email.com"
              className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent bg-gray-50 transition-all"
            />
          </div>
        </div>

        <SubmitButton
          className="w-full py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white shadow-sm hover:shadow font-semibold text-sm min-h-[44px] flex items-center justify-center"
          loadingText="Envoi en cours..."
        >
          Envoyer le lien de réinitialisation
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
// Page publique /forgot-password
// ---------------------------------------------------------------------------
export default function ForgotPasswordPage() {
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
            Mot de passe oublié
          </h1>
          <p className="text-sm text-gray-500">
            Récupérez l&apos;accès à votre espace Radiza
          </p>
        </div>

        <Suspense>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
