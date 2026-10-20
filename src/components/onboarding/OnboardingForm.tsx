"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { completeOnboardingAction, logoutAction } from "@/lib/actions/auth";
import GeographySelector from "@/components/GeographySelector";
import SubmitButton from "@/components/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import {
  Building2,
  Store,
  Check,
  ShieldCheck,
  MapPin,
  Phone,
  Info,
  LogOut,
  Sparkles,
} from "lucide-react";

interface OnboardingFormProps {
  userEmail?: string;
  initialFullName?: string;
  initialPhone?: string;
  initialPreferredRole?: "company" | "reseller";
}

export default function OnboardingForm({
  userEmail,
  initialFullName = "",
  initialPhone = "",
  initialPreferredRole,
}: OnboardingFormProps) {
  const [selectedRole, setSelectedRole] = useState<"company" | "reseller">(
    initialPreferredRole || "company"
  );
  // showRoleSelector : false si le rôle est déjà connu (bandeau compact), true sinon (cartes de sélection)
  const [showRoleSelector, setShowRoleSelector] = useState<boolean>(!initialPreferredRole);
  const [state, formAction] = useFormState(completeOnboardingAction, null);

  return (
    <div className="space-y-8">
      {/* Bandeau utilisateur connecté */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 backdrop-blur-sm border border-forest-100/80 rounded-2xl p-4 text-xs sm:text-sm text-forest-900 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center text-forest-700 font-bold shrink-0">
            {initialFullName ? initialFullName.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <span className="text-gray-500">Connecté en tant que </span>
            <span className="font-semibold text-forest-950">
              {initialFullName || "Utilisateur"}
            </span>
            {userEmail && (
              <span className="text-gray-400 text-xs ml-1.5">({userEmail})</span>
            )}
          </div>
        </div>

        <form action={logoutAction} className="shrink-0 self-end sm:self-auto">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-rose-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-rose-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Changer de compte</span>
          </button>
        </form>
      </div>

      {/* Formulaire Principal */}
      <form action={formAction} className="space-y-8">
        {/* Champ masqué pour le rôle choisi */}
        <input type="hidden" name="role" value={selectedRole} />

        {/* ── ÉTAPE 1 : Choix / Confirmation du type de compte ────────────── */}
        <div className="space-y-4">
          {!showRoleSelector ? (
            /* ── Mode compact : rôle déjà connu ── */
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedRole === "company"
                      ? "bg-forest-600 text-white"
                      : "bg-earth-700 text-white"
                  }`}
                >
                  {selectedRole === "company" ? (
                    <Building2 className="w-5 h-5" />
                  ) : (
                    <Store className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium">Type de compte</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {selectedRole === "company"
                      ? "Société / Producteur Agricole"
                      : "Revendeur Professionnel"}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    selectedRole === "company"
                      ? "bg-forest-100 text-forest-800"
                      : "bg-earth-100 text-earth-900"
                  }`}
                >
                  <Check className="w-3 h-3" />
                  Sélectionné
                </span>
              </div>
            </div>
          ) : (
            /* ── Mode sélection : rôle non connu ou modification demandée ── */
            <>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest-600 text-white text-xs font-bold">
                  1
                </span>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Choisissez votre type d&apos;activité sur Radiza
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Option 1 : Société Agricole / Producteur */}
            <button
              type="button"
              onClick={() => { setSelectedRole("company"); }}
              className={`relative p-5 sm:p-6 rounded-2xl text-left transition-all border-2 flex flex-col justify-between ${
                selectedRole === "company"
                  ? "bg-forest-50/50 border-forest-600 shadow-md ring-2 ring-forest-600/20"
                  : "bg-white border-gray-200 hover:border-forest-200 hover:bg-forest-50/20 shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      selectedRole === "company"
                        ? "bg-forest-600 text-white shadow-sm"
                        : "bg-forest-100 text-forest-700"
                    }`}
                  >
                    <Building2 className="w-6 h-6" />
                  </div>
                  {selectedRole === "company" && (
                    <span className="flex items-center gap-1 bg-forest-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                      <Check className="w-3.5 h-3.5" /> Sélectionné
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-forest-100 text-forest-800 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Production & Vente
                </div>

                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5">
                  Société / Producteur Agricole
                </h3>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                  Ferme, plantation, coopérative ou agro-industrie qui produit, récolte et vend des denrées agricoles.
                </p>

                <ul className="space-y-1.5 text-xs text-forest-900/80 pt-3 border-t border-forest-100">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest-600 shrink-0" />
                    <span>Enregistrement des récoltes & productions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest-600 shrink-0" />
                    <span>Lancement de campagnes de vente sécurisées</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest-600 shrink-0" />
                    <span>Observation de la demande nationale en temps réel</span>
                  </li>
                </ul>
              </div>
            </button>

            {/* Option 2 : Revendeur Professionnel */}
            <button
              type="button"
              onClick={() => setSelectedRole("reseller")}
              className={`relative p-5 sm:p-6 rounded-2xl text-left transition-all border-2 flex flex-col justify-between ${
                selectedRole === "reseller"
                  ? "bg-earth-50/60 border-earth-700 shadow-md ring-2 ring-earth-700/20"
                  : "bg-white border-gray-200 hover:border-earth-200 hover:bg-earth-50/20 shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      selectedRole === "reseller"
                        ? "bg-earth-700 text-white shadow-sm"
                        : "bg-earth-100 text-earth-800"
                    }`}
                  >
                    <Store className="w-6 h-6" />
                  </div>
                  {selectedRole === "reseller" && (
                    <span className="flex items-center gap-1 bg-earth-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                      <Check className="w-3.5 h-3.5" /> Sélectionné
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-earth-100 text-earth-900 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Achat & Distribution
                </div>

                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5">
                  Revendeur Professionnel
                </h3>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                  Grossiste, demi-grossiste, détaillant ou transformateur qui achète des denrées pour le marché.
                </p>

                <ul className="space-y-1.5 text-xs text-earth-900/80 pt-3 border-t border-earth-100">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-earth-700 shrink-0" />
                    <span>Accès au flux de récoltes réelles vérifiées</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-earth-700 shrink-0" />
                    <span>Commandes avec réservation garantie de stock</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-earth-700 shrink-0" />
                    <span>Expression de besoins d&apos;approvisionnement</span>
                  </li>
                </ul>
              </div>
            </button>
              </div>
            </>
          )}
        </div>


        {/* ── ÉTAPE 2 : Informations Spécifiques & Localisation ──────────── */}
        <div className="space-y-6 bg-white rounded-2xl border border-gray-200/90 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest-600 text-white text-xs font-bold">
              2
            </span>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              {selectedRole === "company"
                ? "Informations de votre entreprise agricole"
                : "Informations de votre commerce revendeur"}
            </h2>
          </div>

          {/* Champs communs aux deux rôles (auth-5.14) */}
          <div className="space-y-5">
            <FormField
              label="Numéro de téléphone professionnel"
              optional
              description="Votre numéro de contact pour vos échanges commerciaux sur Radiza."
            >
              <Input
                name="phone"
                type="tel"
                defaultValue={initialPhone}
                placeholder="Ex : +243 81 234 5678"
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </FormField>
          </div>

          {/* Champs Spécifiques Société */}
          {selectedRole === "company" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <FormField
                label="Dénomination / Raison sociale de l'entreprise"
                required
                description="Le nom officiel de votre exploitation, ferme ou coopérative."
              >
                <Input
                  name="companyName"
                  placeholder={initialFullName ? `Ex : ${initialFullName} SARL, Ferme de la Lukaya...` : "Ex : Ferme Agro-Kwilu SARL, Plantations de la Lukaya..."}
                  leftIcon={<Building2 className="w-4 h-4" />}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Téléphone professionnel"
                  optional
                  description="Numéro de contact pour vos échanges commerciaux."
                >
                  <Input
                    name="companyPhone"
                    type="tel"
                    defaultValue={initialPhone}
                    placeholder="Ex : +243 81 234 5678"
                    leftIcon={<Phone className="w-4 h-4" />}
                  />
                </FormField>

                <FormField
                  label="Adresse de l'exploitation ou siège"
                  optional
                  description="Adresse physique, route ou repère de la ferme."
                >
                  <Input
                    name="companyAddress"
                    placeholder="Ex : Route de Bandundu, Km 18"
                    leftIcon={<MapPin className="w-4 h-4" />}
                  />
                </FormField>
              </div>

              <FormField
                label="Description des activités"
                optional
                description="Décrivez brièvement vos cultures principales, spécialités ou méthodes de travail."
              >
                <Textarea
                  name="companyDescription"
                  rows={3}
                  placeholder="Ex : Exploitation agricole spécialisée dans la production de maïs blanc, manioc doux et maraîchage de saison avec livraison vers Kinshasa..."
                />
              </FormField>
            </div>
          )}

          {/* Champs Spécifiques Revendeur */}
          {selectedRole === "reseller" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <FormField
                label="Nom commercial / Enseigne"
                optional
                description="Le nom commercial de votre point de vente (par défaut votre nom complet)."
              >
                <Input
                  name="businessName"
                  defaultValue={initialFullName}
                  placeholder="Ex : Établissements Mwana Mboka, Superette de l'Avenir..."
                  leftIcon={<Store className="w-4 h-4" />}
                />
              </FormField>

              <FormField
                label="Type d'activité de distribution"
                required
                description="Sélectionnez l'échelle principale de vos activités d'achat et vente."
              >
                <Select
                  name="resellerType"
                  defaultValue="wholesaler"
                  required
                  options={[
                    {
                      value: "wholesaler",
                      label: "Grossiste",
                      description: "Achat et vente en gros volumes",
                    },
                    {
                      value: "semi_wholesaler",
                      label: "Demi-grossiste",
                      description: "Distribution intermédiaire vers commerces",
                    },
                    {
                      value: "retailer",
                      label: "Détaillant",
                      description: "Vente directe au consommateur final",
                    },
                    {
                      value: "processor",
                      label: "Transformateur agroalimentaire",
                      description: "Transformation industrielle ou artisanale",
                    },
                  ]}
                />
              </FormField>

              <FormField
                label="Adresse habituelle de livraison / Dépôt"
                optional
                description="Adresse de votre entrepôt, magasin ou point de déchargement."
              >
                <Input
                  name="deliveryAddress"
                  placeholder="Ex : Grand Marché, Allée 4, Dépôt n°12"
                  leftIcon={<MapPin className="w-4 h-4" />}
                />
              </FormField>
            </div>
          )}

          {/* Sélecteur Géographique Officiel (Commun aux deux rôles) */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-forest-700" />
              <h3 className="text-sm font-bold text-gray-900">
                Territoire et Localisation Officielle
              </h3>
            </div>

            <GeographySelector required={true} showCityInput={true} />

            <div className="rounded-xl bg-forest-50/70 p-3 border border-forest-100 flex items-start gap-2.5 text-xs text-forest-900">
              <Info className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {selectedRole === "company" ? (
                  <span>
                    La <strong>province</strong> indiquée correspond à l&apos;implantation principale de vos exploitations. Vous pourrez configurer vos parcelles précises dans votre espace.
                  </span>
                ) : (
                  <span>
                    <strong>Important pour les commandes :</strong> Votre <strong>province</strong> est le critère juridique qui détermine votre éligibilité régionale pour commander sur les campagnes commerciales ouvertes dans votre zone.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Affichage des Erreurs ────────────────────────────────────────── */}
        {state?.error && (
          <Alert variant="error" title="Impossible de finaliser votre inscription">
            {state.error}
          </Alert>
        )}

        {/* ── Bouton de Soumission & Garde-Fou ─────────────────────────────── */}
        <div className="space-y-4">
          <SubmitButton
            className="w-full py-4 px-6 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-base shadow-md hover:shadow-lg transition-all"
            loadingText="Enregistrement et configuration de votre espace..."
          >
            <Sparkles className="w-4 h-4" />
            <span>Finaliser la configuration & Accéder à mon espace</span>
          </SubmitButton>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Processus sécurisé Radiza Identity • Aucune donnée fictive • Respect de la confidentialité
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
