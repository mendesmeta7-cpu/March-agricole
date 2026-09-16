"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { registerCompanyAction } from "@/lib/actions/auth";
import GeographySelector from "@/components/GeographySelector";
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
              <strong>Règle d&apos;or V1 :</strong> L&apos;inscription crée exclusivement votre compte utilisateur et le profil d&apos;entreprise.
              La configuration des produits et des récoltes s&apos;effectue ultérieurement depuis votre tableau de bord.
            </div>
          </div>

          {state?.error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>{state.error}</div>
            </div>
          )}

          <form action={formAction} className="space-y-6">
            {/* Section 1 : Responsable */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-forest-800">
                1. Responsable du compte
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom complet <span className="text-red-500">*</span>
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
                    Téléphone professionnel
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Ex: +243 990 000 000"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse email <span className="text-red-500">*</span>
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
              </div>
            </div>

            {/* Section 2 : Entité Agricole */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-forest-800">
                2. Profil de l&apos;Entreprise Agricole
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dénomination / Raison sociale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  required
                  placeholder="Ex: AgriCongo Ferme du Plateau"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description de l&apos;activité
                </label>
                <textarea
                  name="companyDescription"
                  rows={3}
                  placeholder="Présentez brièvement vos exploitations et filières cultivées..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse physique / Siège
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="Ex: Route nationale 1, Plateau de Bateke"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-forest-600 focus:border-transparent transition-all outline-none"
                />
              </div>

              {/* Localisation géographique réelle */}
              <GeographySelector required={true} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo de l&apos;entreprise (optionnel)
                </label>
                <input
                  type="file"
                  name="logo"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-forest-50 file:text-forest-700 hover:file:bg-forest-100 transition-all cursor-pointer"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Format JPG, PNG ou WebP. Max 5 Mo. Hébergé sur Supabase Storage.
                </p>
              </div>
            </div>

            <SubmitButton
              className="w-full py-3 px-4 rounded-lg bg-forest-700 hover:bg-forest-800 text-white shadow-sm hover:shadow"
              loadingText="Création de l'entreprise en cours..."
            >
              Créer mon compte Entreprise
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
