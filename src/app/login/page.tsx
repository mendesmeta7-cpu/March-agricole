"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loginAction } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import { AlertCircle, Lock, Mail } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

function LoginForm() {
  const [state, formAction] = useFormState(loginAction, null);
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  return (
    <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 shadow-sm border border-gray-200 rounded-2xl">
      {(state?.error || urlError) && (
        <div className="mb-5 rounded-xl bg-red-50 p-3.5 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            {state?.error ||
              (urlError === "profile_missing"
                ? "Profil introuvable pour ce compte. Veuillez contacter l'administrateur."
                : "Une erreur est survenue lors de l'authentification.")}
          </div>
        </div>
      )}

      <form action={formAction} className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Adresse email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              name="email"
              required
              placeholder="nom@domaine.com"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Mot de passe
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none text-sm"
            />
          </div>
        </div>

        <SubmitButton
          className="w-full py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white shadow-sm hover:shadow font-semibold text-sm min-h-[44px] flex items-center justify-center"
          loadingText="Connexion en cours..."
        >
          Se connecter
        </SubmitButton>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Plateforme B2B de mise en relation agricole — Vos données et vos transactions sont protégées.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-forest-50/50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link
          href="/"
          className="inline-flex items-center mb-3 sm:mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-lg"
          aria-label="Accueil Radiza"
        >
          <BrandLogo variant="horizontal" height={42} priority />
        </Link>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
          Connexion à votre espace
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-gray-600">
          Ou{" "}
          <Link href="/register" className="font-medium text-forest-700 hover:text-forest-800 underline">
            créer un nouveau compte
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="h-64 bg-white rounded-2xl animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
