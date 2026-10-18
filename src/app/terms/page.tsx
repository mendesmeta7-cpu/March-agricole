import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  ShieldAlert,
  Scale,
  Users,
  Store,
  Layers,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Lock,
  Building2,
  DollarSign,
} from "lucide-react";
import StickyHeader from "@/components/landing/StickyHeader";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Radiza",
  description:
    "Conditions générales d'utilisation de la plateforme agricole B2B Radiza, éditée par Synapta SARL. Règles d'accès pour Sociétés agricoles et Revendeurs professionnels.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsOfServicePage() {
  const lastUpdated = "18 octobre 2026";
  const effectiveDate = "18 octobre 2026";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Navigation publique principale */}
      <StickyHeader />

      {/* Contenu principal */}
      <main className="flex-1 pt-24 sm:pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Fil d'ariane */}
          <nav
            aria-label="Fil d'ariane"
            className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-6"
          >
            <Link
              href="/"
              className="hover:text-forest-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded"
            >
              Accueil
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-medium" aria-current="page">
              Conditions d&apos;utilisation
            </span>
          </nav>

          {/* En-tête de la page */}
          <header className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 text-forest-800 border border-forest-100 text-xs font-semibold uppercase tracking-wider mb-4">
              <Scale className="w-4 h-4 text-forest-700" />
              <span>Contrat d&apos;utilisation • Radiza V1</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Conditions Générales d&apos;Utilisation
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
              Les présentes Conditions Générales d&apos;Utilisation (ci-après les « <strong>CGU</strong> ») définissent les règles et modalités d&apos;accès et d&apos;utilisation de la plateforme numérique <strong>Radiza</strong>, éditée par <strong>Synapta SARL</strong>, applicables à l&apos;ensemble des professionnels inscrits.
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-500 pt-4 border-t border-slate-100">
              <div>
                <span className="font-medium text-slate-700">Plateforme :</span> Radiza (B2B Agricole)
              </div>
              <div>
                <span className="font-medium text-slate-700">Éditeur :</span> Synapta SARL
              </div>
              <div>
                <span className="font-medium text-slate-700">Entrée en vigueur :</span> {effectiveDate}
              </div>
            </div>
          </header>

          {/* Passerelle vers la Politique de confidentialité */}
          <div className="bg-gradient-to-r from-forest-50 via-emerald-50/50 to-white rounded-2xl p-4 sm:p-5 border border-forest-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-forest-700 mt-0.5 shrink-0" />
              <p className="text-xs sm:text-sm text-slate-700">
                Vous souhaitez savoir comment vos données personnelles et techniques sont traitées et protégées ?
              </p>
            </div>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-forest-800 hover:text-forest-950 underline underline-offset-4 shrink-0 transition-colors"
            >
              <span>Consulter la Politique de confidentialité</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Corps des Conditions */}
          <article className="space-y-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm leading-relaxed text-slate-700">
            {/* Section 1 : Objet du service */}
            <section id="objet" className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>Objet et nature de la plateforme Radiza</span>
              </h2>
              <p className="text-sm sm:text-base">
                Radiza est une plateforme technologique interentreprises (B2B) ayant pour mission de faciliter la mise en relation directe, la diffusion des disponibilités et la gestion de commandes entre les acteurs professionnels des filières agricoles :
              </p>
              <ul className="list-disc list-inside text-sm sm:text-base space-y-1.5 pl-2 text-slate-700">
                <li>
                  Les <strong>Sociétés agricoles</strong> (producteurs, coopératives, exploitants agricoles) qui déclarent et publient leurs prévisions de récolte et productions réelles ;
                </li>
                <li>
                  Les <strong>Revendeurs professionnels</strong> (grossistes, demi-grossistes, détaillants, centrales d&apos;achat) qui expriment des besoins d&apos;approvisionnement et réservent des volumes disponibles.
                </li>
              </ul>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-600">
                <strong>Statut de la version :</strong> La plateforme est actuellement déployée en version V1 expérimentale d&apos;évaluation, axée sur la validation opérationnelle des flux d&apos;approvisionnement et la gestion atomique des stocks.
              </div>
            </section>

            {/* Section 2 : Éligibilité et Rôles */}
            <section id="eligibilite" className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span>Éligibilité et catégories d&apos;utilisateurs</span>
              </h2>
              <p className="text-sm sm:text-base">
                L&apos;accès à Radiza est strictement réservé aux personnes morales et aux exploitants exerçant une activité économique professionnelle vérifiable. Les comptes grand public ou les particuliers non professionnels ne sont pas éligibles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="p-4 rounded-xl bg-forest-50/50 border border-forest-100">
                  <div className="flex items-center gap-2 font-bold text-forest-900 text-sm mb-2">
                    <Building2 className="w-4 h-4 text-forest-700" />
                    <span>Sociétés agricoles</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-normal">
                    Entités productrices habilitées à créer des fiches de production, spécifier des volumes de récolte prévisionnels, configurer des campagnes et recevoir des bons de commande fermes.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-forest-50/50 border border-forest-100">
                  <div className="flex items-center gap-2 font-bold text-forest-900 text-sm mb-2">
                    <Store className="w-4 h-4 text-forest-700" />
                    <span>Revendeurs professionnels</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-normal">
                    Commerçants et distributeurs agréés autorisés à publier des demandes d&apos;approvisionnement, consulter le catalogue des productions et réserver des volumes de marchandises.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 : Compte et Séparation Inscription/Production */}
            <section id="comptes" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span>Création de compte et règle de séparation stricte</span>
              </h2>
              <p className="text-sm sm:text-base">
                L&apos;inscription sur Radiza obéit à la <strong>règle fondamentale de séparation inscription / production</strong> :
              </p>
              <ul className="list-disc list-inside text-sm sm:text-base space-y-1.5 pl-2 text-slate-700">
                <li>
                  Lors de l&apos;onboarding, l&apos;utilisateur crée exclusivement son profil professionnel d&apos;entreprise ou de revendeur (dénomination, localisation, coordonnées, logo).
                </li>
                <li>
                  La création, la mise à jour et la publication des productions ou des demandes s&apos;effectuent ultérieurement depuis le tableau de bord métier sécurisé une fois le compte activé.
                </li>
                <li>
                  Chaque utilisateur est personnellement garant de l&apos;exactitude des informations fournies et de la préservation de la confidentialité de ses identifiants (mot de passe ou session Google).
                </li>
              </ul>
            </section>

            {/* Section 4 : Absence de paiement en ligne dans la V1 */}
            <section id="paiements" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <span>Absence de paiement en ligne en V1 et autonomie des contrats</span>
              </h2>
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                  <DollarSign className="w-5 h-5 text-amber-700" />
                  <span>Important — Absence de transactions monétaires intégrées</span>
                </div>
                <p className="leading-relaxed">
                  Dans la version V1 actuelle de Radiza, <strong>aucun système de paiement en ligne, d&apos;encaissement monétaire ou de portefeuille électronique n&apos;est intégré</strong>.
                </p>
                <p className="leading-relaxed">
                  La validation d&apos;une commande sur Radiza génère un engagement ferme de réservation de stock au niveau de la plateforme logicielle. Toutefois, <strong>les règlements financiers effectifs, la facturation légale, la logistique de transport, l&apos;enlèvement et l&apos;agréage des denrées agricoles sont exécutés directement et de gré à gré</strong> entre la Société agricole et le Revendeur.
                </p>
              </div>
            </section>

            {/* Section 5 : Exactitude et interdiction de faux contenus */}
            <section id="exactitude" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  5
                </span>
                <span>Exactitude des informations et interdiction des données fictives</span>
              </h2>
              <p className="text-sm sm:text-base">
                Les utilisateurs s&apos;engagent formellement à :
              </p>
              <ul className="list-disc list-inside text-sm sm:text-base space-y-1.5 pl-2 text-slate-700">
                <li>Ne publier que des productions réelles et des volumes agricoles vérifiables ;</li>
                <li>Ne pas diffuser de fausses annonces, de prix spéculatifs ou de fausses demandes d&apos;achat ;</li>
                <li>Maintenir à jour l&apos;état réel de leurs disponibilités en cas d&apos;aléa climatique ou de perte de récolte ;</li>
                <li>Respecter les réservations de stocks validées via la plateforme afin d&apos;éviter les ruptures de chaîne logistique.</li>
              </ul>
            </section>

            {/* Section 6 : Responsabilité et exclusions */}
            <section id="responsabilite" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  6
                </span>
                <span>Responsabilités respectives et exclusions de garantie</span>
              </h2>
              <p className="text-sm sm:text-base">
                <strong>Rôle de Synapta SARL :</strong> En tant qu&apos;éditeur de la plateforme Radiza, Synapta SARL agit exclusivement en qualité de prestataire technique et intermédiaire numérique. Synapta SARL n&apos;est à aucun titre partie aux contrats de vente conclus entre les utilisateurs.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-2">
                <p className="font-semibold text-slate-900">Exclusions expresses de garantie :</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Synapta SARL ne garantit pas la qualité biologique, sanitaire, phytosanitaire ou marchande des récoltes physiques ;</li>
                  <li>Synapta SARL ne garantit pas la solvabilité des revendeurs ni le paiement effectif des marchandises ;</li>
                  <li>Synapta SARL ne peut être tenue responsable des retards d&apos;acheminement, intempéries ou litiges de livraison survenus hors de la plateforme.</li>
                </ul>
              </div>
            </section>

            {/* Section 7 : Usages interdits et sanctions */}
            <section id="interdictions" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  7
                </span>
                <span>Usages interdits, sécurité et suspension de compte</span>
              </h2>
              <p className="text-sm sm:text-base">
                Sont strictement prohibés sur la plateforme Radiza :
              </p>
              <ul className="list-disc list-inside text-sm sm:text-base space-y-1.5 pl-2 text-slate-700">
                <li>Toute tentative d&apos;accès frauduleux aux données d&apos;autres entreprises via le contournement des contrôles d&apos;accès ou de sécurité ;</li>
                <li>L&apos;injection de scripts malveillants, robots d&apos;extraction automatisée (scraping non autorisé) ou attaques par saturation ;</li>
                <li>L&apos;usurpation d&apos;identité d&apos;une entreprise agricole ou d&apos;un tiers ;</li>
                <li>L&apos;usage de la plateforme à des fins illégales, frauduleuses ou contraires aux lois en vigueur.</li>
              </ul>
              <p className="text-sm sm:text-base mt-2">
                En cas de manquement avéré, Synapta SARL se réserve le droit de suspendre ou clôturer l&apos;accès au compte sans préavis, sans préjudice d&apos;éventuelles actions judiciaires.
              </p>
            </section>

            {/* Section 8 : Propriété intellectuelle */}
            <section id="propriete" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  8
                </span>
                <span>Propriété intellectuelle</span>
              </h2>
              <p className="text-sm sm:text-base">
                La dénomination Radiza, l&apos;architecture logicielle, les interfaces graphiques, la charte visuelle, les logos et bases de données constituent la propriété exclusive de <strong>Synapta SARL</strong>. Toute reproduction totale ou partielle non autorisée est strictement interdite.
              </p>
              <p className="text-sm sm:text-base">
                Les marques et logos déposés par les utilisateurs sur leur profil d&apos;entreprise demeurent leur propriété exclusive, ces derniers accordant à Radiza une licence d&apos;utilisation strictement limitée aux besoins d&apos;affichage au sein de la plateforme.
              </p>
            </section>

            {/* Section 9 : Droit applicable et litiges */}
            <section id="droit-applicable" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  9
                </span>
                <span>Droit applicable et juridiction compétente</span>
              </h2>
              <p className="text-sm sm:text-base">
                Les présentes CGU sont régies et interprétées conformément au droit de la <strong>République Démocratique du Congo</strong> (sous réserve de validation juridique définitive). En cas de différend relatif à l&apos;interprétation ou à l&apos;exécution des présentes et à défaut d&apos;accord amiable sous 30 jours, compétence exclusive sera attribuée aux tribunaux compétents du siège de Synapta SARL.
              </p>
            </section>

            {/* Avis de transparence légale */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Clause signalée pour validation juridique</p>
                  <p className="leading-relaxed">
                    Les clauses relatives à la juridiction territoriale compétente, à la limitation forfaitaire de responsabilité et à la formalisation de la raison sociale exacte de Synapta SARL nécessitent une validation juridique formelle par les conseils légaux de l&apos;entreprise avant le déploiement commercial définitif.
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* Navigation retour & bascule */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span>← Retour à l&apos;accueil</span>
            </Link>

            <Link
              href="/privacy"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-sm shadow-sm transition-colors"
            >
              <span>Consulter la Politique de confidentialité</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer minimaliste officiel */}
      <footer className="w-full py-6 px-4 border-t border-slate-200 bg-white text-slate-600">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-center sm:text-left">
          <div className="flex items-center justify-center gap-2">
            <span>Développé par</span>
            <span className="font-bold text-slate-900">Synapta SARL</span>
            <span className="text-slate-400">•</span>
            <span>© 2026 Radiza. Tous droits réservés.</span>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs">
            <Link
              href="/terms"
              className="text-forest-800 font-semibold underline-offset-4 underline"
            >
              Conditions d&apos;utilisation
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              href="/privacy"
              className="text-slate-600 hover:text-forest-700 underline-offset-4 hover:underline transition-colors"
            >
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
