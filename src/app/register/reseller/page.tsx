"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { registerResellerAction } from "@/lib/actions/auth";
import GeographySelector from "@/components/GeographySelector";
import SubmitButton from "@/components/SubmitButton";
import { Store, AlertCircle, ArrowLeft, MapPin } from "lucide-react";

export default function RegisterResellerPage() {
  const [state, formAction] = useFormState(registerResellerAction, null);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-earth-50/50">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 text-sm font-medium text-earth-800 hover:text-earth-950 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au choix du profil
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-earth-100 flex items-center justify-center text-earth-700">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Inscription Revendeur Professionnel
              </h1>
              <p className="text-sm text-gray-600">
                Achetez et approvisionnez votre réseau en produits agricoles
              </p>
            </div>
          </div>

          <div className="mb-6 p-4 rounded-xl bg-earth-50/60 border border-earth-200/60 text-xs text-earth-900 flex items-start gap-3 leading-relaxed">
            <MapPin className="w-4 h-4 text-earth-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Territorialité pivot :</strong> Votre localisation (Pays et Province) détermine les campagnes agricoles auxquelles vous serez directement éligible pour passer commande ferme.
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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-earth-800">
                1. Identité de l&apos;acheteur
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom et prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="Ex: Alain Kalombo"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-earth-600 focus:border-transparent transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone de contact
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Ex: +243 810 000 000"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-earth-600 focus:border-transparent transition-all outline-none"
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
                    placeholder="alain@distribution-vivres.cd"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-earth-600 focus:border-transparent transition-all outline-none"
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
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-earth-600 focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 : Activité commerciale et territoire */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-earth-800">
                2. Activité Commerciale et Territoire
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom commercial / Enseigne
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    placeholder="Ex: Maison Vivres Frais Kin"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-earth-600 focus:border-transparent transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Typologie d&apos;acheteur <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="resellerType"
                    defaultValue="wholesaler"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-earth-600 focus:border-transparent transition-all outline-none"
                  >
                    <option value="wholesaler">Grossiste</option>
                    <option value="semi_wholesaler">Demi-grossiste</option>
                    <option value="retailer">Détaillant</option>
                    <option value="processor">Transformateur agro-alimentaire</option>
                  </select>
                </div>
              </div>

              {/* Localisation géographique réelle */}
              <GeographySelector required={true} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse de livraison habituelle
                </label>
                <input
                  type="text"
                  name="deliveryAddress"
                  placeholder="Ex: Hangar 4, Marché de gros de la Liberté"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-earth-600 focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            <SubmitButton
              className="w-full py-3 px-4 rounded-lg bg-earth-700 hover:bg-earth-800 text-white shadow-sm hover:shadow"
              loadingText="Création du profil revendeur..."
            >
              Créer mon compte Revendeur
            </SubmitButton>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Vous possédez déjà un compte ?{" "}
              <Link href="/login" className="font-medium text-earth-700 hover:text-earth-800 underline">
                Connectez-vous ici
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
