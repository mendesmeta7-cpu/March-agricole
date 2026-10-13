"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { registerCompanyAction } from "@/lib/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import { Building2, AlertCircle, ArrowLeft, ShieldAlert, MailCheck } from "lucide-react";

export default function RegisterCompanyPage() {
  const [state, formAction] = useFormState(registerCompanyAction, null);

  if (state?.emailSent) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-forest-50/50 flex flex-col justify-center">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-forest-100 p-8 text-center">
          <div className="w-16 h-16 bg-forest-100 text-forest-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MailCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vérifiez votre boîte mail</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Nous vous avons envoyé un email contenant un lien pour confirmer la création de votre compte professionnel.
          </p>
          <div className="p-4 bg-gray-50 rounded-xl mb-8">
            <p className="text-xs text-gray-500 font-medium">Sécurité propulsée par</p>
            <p className="text-sm font-bold text-slate-800 tracking-wider">SYNAPTA Identity</p>
          </div>
          <Link
            href="/login"
            className="inline-block w-full py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold shadow-sm transition-colors"
          >
            Aller à la page de connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-forest-50/50">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 text-sm font-medium text-forest-800 hover:text-forest-950 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au choix du profil
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-forest-100 flex items-center justify-center text-forest-700">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Inscription Entreprise Agricole
              </h1>
              <p className="text-sm text-gray-600">
                Créez le profil de votre ferme, plantation ou coopérative
              </p>
            </div>
          </div>

          <div className="mb-6 p-4 rounded-xl bg-forest-50/60 border border-forest-200/60 text-xs text-forest-900 flex items-start gap-3 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-forest-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Étape 1 sur 2 :</strong> Créez votre accès responsable. La configuration détaillée de votre exploitation (dénomination, localisation et filières) s&apos;effectue lors de l&apos;activation de votre compte.
            </div>
          </div>

          {state?.error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>{state.error}</div>
            </div>
          )}

          <form action={formAction} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet du responsable <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                placeholder="Ex: Jean Mukendi"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de téléphone
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="Ex: +243 990 000 000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email professionnelle <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="contact@ferme-agro.cd"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="Au moins 6 caractères"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none"
              />
            </div>

            <SubmitButton
              className="w-full py-3 px-4 rounded-lg bg-forest-700 hover:bg-forest-800 text-white shadow-sm hover:shadow"
              loadingText="Création du compte en cours..."
            >
              Créer mon compte Société
            </SubmitButton>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Vous possédez déjà un compte ?{" "}
              <Link href="/login" className="font-medium text-forest-700 hover:text-forest-800 underline">
                Connectez-vous ici
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
