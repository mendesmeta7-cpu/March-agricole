import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Lock,
  Server,
  UserCheck,
  FileText,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Eye,
  KeyRound,
  Database,
  Globe2,
} from "lucide-react";
import StickyHeader from "@/components/landing/StickyHeader";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Radiza",
  description:
    "Découvrez comment Radiza et Synapta SARL traitent et protègent les données des comptes, des entreprises agricoles et des revendeurs dans le cadre de la plateforme B2B.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPolicyPage() {
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
              Politique de confidentialité
            </span>
          </nav>

          {/* En-tête de la page */}
          <header className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 text-forest-800 border border-forest-100 text-xs font-semibold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4 text-forest-700" />
              <span>Document officiel • Radiza V1</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Politique de Confidentialité
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
              La présente Politique de Confidentialité a pour objet d&apos;exposer en toute transparence la manière dont la plateforme <strong>Radiza</strong> collecte, traite, sécurise et conserve les données à caractère personnel et professionnel de ses utilisateurs, conformément à son architecture technique et aux fonctionnalités réellement actives dans sa version V1.
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-500 pt-4 border-t border-slate-100">
              <div>
                <span className="font-medium text-slate-700">Éditeur :</span> Synapta SARL
              </div>
              <div>
                <span className="font-medium text-slate-700">Date d&apos;entrée en vigueur :</span> {effectiveDate}
              </div>
              <div>
                <span className="font-medium text-slate-700">Dernière mise à jour :</span> {lastUpdated}
              </div>
            </div>
          </header>

          {/* Passerelle vers les CGU */}
          <div className="bg-gradient-to-r from-forest-50 via-emerald-50/50 to-white rounded-2xl p-4 sm:p-5 border border-forest-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-forest-700 mt-0.5 shrink-0" />
              <p className="text-xs sm:text-sm text-slate-700">
                Vous recherchez les règles d&apos;utilisation, d&apos;éligibilité et de responsabilité de la plateforme ?
              </p>
            </div>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-forest-800 hover:text-forest-950 underline underline-offset-4 shrink-0 transition-colors"
            >
              <span>Consulter les Conditions d&apos;utilisation</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Corps de la Politique */}
          <article className="space-y-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm leading-relaxed text-slate-700">
            {/* Section 1 : Éditeur et Objet */}
            <section id="editeur" className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>Éditeur du service et contexte de la plateforme</span>
              </h2>
              <p className="text-sm sm:text-base">
                La plateforme numérique <strong>Radiza</strong> est un service conçu et édité par la société <strong>Synapta SARL</strong>. Radiza est une solution logicielle interentreprises (B2B) destinée à connecter directement les producteurs et entreprises agricoles avec les revendeurs professionnels (grossistes, demi-grossistes, détaillants et centrales d&apos;achat).
              </p>
              <p className="text-sm sm:text-base">
                La plateforme fonctionne selon des principes d&apos;intégrité stricts : aucune donnée fictive n&apos;est injectée dans l&apos;application, les transactions reposent sur des enregistrements réels, et les accès aux données d&apos;exploitation sont strictement isolés par entité.
              </p>
            </section>

            {/* Section 2 : Données collectées */}
            <section id="donnees-collectees" className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span>Données effectivement collectées et traitées</span>
              </h2>
              <p className="text-sm sm:text-base">
                Radiza applique le principe de minimisation des données : seules les informations strictement nécessaires à la création de votre compte professionnel et à la conduite des opérations commerciales agricoles sont recueillies.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-2">
                    <UserCheck className="w-4 h-4 text-forest-700" />
                    <span>Données de compte utilisateur</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs sm:text-sm space-y-1.5 text-slate-600">
                    <li>Adresse e-mail professionnelle ;</li>
                    <li>Nom complet du titulaire de compte ;</li>
                    <li>Numéro de téléphone professionnel ;</li>
                    <li>Rôle applicatif affecté (Société, Revendeur, Administrateur) ;</li>
                    <li>Statut d&apos;onboarding du compte.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-2">
                    <KeyRound className="w-4 h-4 text-forest-700" />
                    <span>Authentification Google OAuth</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-normal mb-2">
                    Lorsque vous choisissez l&apos;authentification Google OAuth, Radiza reçoit exclusivement via OpenID Connect :
                  </p>
                  <ul className="list-disc list-inside text-xs sm:text-sm space-y-1 text-slate-600">
                    <li>Votre adresse e-mail vérifiée par Google ;</li>
                    <li>Votre nom complet associé à Google ;</li>
                    <li>Votre identifiant technique de compte Google.</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-2 italic">
                    Radiza n&apos;accède à aucun moment à vos contacts, vos courriels, vos fichiers Drive ou votre mot de passe Google.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-forest-700" />
                    <span>Profils des Entreprises et Revendeurs</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs sm:text-sm space-y-1 text-slate-600">
                    <li>Raison sociale ou dénomination commerciale ;</li>
                    <li>Localisation géographique (pays, province, ville, adresse d&apos;exploitation ou de livraison) ;</li>
                    <li>Coordonnées de contact professionnel (téléphone, e-mail) ;</li>
                    <li>Logo ou visuel d&apos;entreprise (téléchargé volontairement).</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-forest-700" />
                    <span>Activités métier et transactions</span>
                  </h3>
                  <ul className="list-disc list-inside text-xs sm:text-sm space-y-1 text-slate-600">
                    <li>Productions déclarées (volumes prévus, dates, prix indicatifs) ;</li>
                    <li>Demandes d&apos;approvisionnement formulées par les revendeurs ;</li>
                    <li>Campagnes de groupement et réservations de stock ;</li>
                    <li>Commandes fermes et historiques de statut.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 3 : Finalités */}
            <section id="finalites" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span>Finalités d&apos;utilisation des données</span>
              </h2>
              <p className="text-sm sm:text-base">
                Les données traitées par Radiza sont utilisées strictement dans le cadre des finalités suivantes :
              </p>
              <ul className="list-disc list-inside text-sm sm:text-base space-y-2 text-slate-700 pl-2">
                <li>
                  <strong>Gestion des comptes et sécurité des accès :</strong> création, authentification, vérification par e-mail ou Google OAuth, contrôle d&apos;accès basé sur les rôles (RBAC) et prévention des accès non autorisés ;
                </li>
                <li>
                  <strong>Mise en relation commerciale B2B :</strong> visibilité des productions disponibles auprès des revendeurs et transmission des besoins d&apos;approvisionnement vers les producteurs agricoles ;
                </li>
                <li>
                  <strong>Gestion des réservations et intégrité des stocks :</strong> validation transactionnelle et verrouillage atomique côté serveur des volumes réservés pour prévenir les doubles ventes ou le surbooking ;
                </li>
                <li>
                  <strong>Communications de service :</strong> transmission des notifications indispensables à l&apos;activité (confirmation de commande, changement de statut, réinitialisation de mot de passe).
                </li>
              </ul>
              <div className="p-4 rounded-xl bg-forest-50/70 border border-forest-100 text-xs sm:text-sm text-forest-900">
                <strong>Engagement formel de non-commercialisation :</strong> Vos données professionnelles et personnelles ne sont ni vendues, ni louées, ni cédées à des tiers à des fins de prospection publicitaire.
              </div>
            </section>

            {/* Section 4 : Prestataires techniques réels */}
            <section id="prestataires" className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  4
                </span>
                <span>Sous-traitants et prestataires techniques réels</span>
              </h2>
              <p className="text-sm sm:text-base">
                Pour assurer la disponibilité, la sécurité et la haute performance de la plateforme Radiza, nous faisons appel à des prestataires techniques reconnus de premier plan :
              </p>
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between font-semibold text-slate-900 text-sm mb-1">
                    <span>Vercel Inc.</span>
                    <span className="text-xs font-normal text-slate-500">États-Unis / Réseau mondial</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Hébergement du frontend Next.js, distribution Edge CDN et exécution des fonctions serverless applicatives.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between font-semibold text-slate-900 text-sm mb-1">
                    <span>Supabase Inc.</span>
                    <span className="text-xs font-normal text-slate-500">Infrastructure PostgreSQL (Région Europe)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Hébergement de la base de données relationnelle PostgreSQL, moteur d&apos;authentification chiffré (Supabase Auth / GoTrue) et application des règles de cloisonnement Row Level Security (RLS).
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between font-semibold text-slate-900 text-sm mb-1">
                    <span>Google Identity Services (Google LLC)</span>
                    <span className="text-xs font-normal text-slate-500">États-Unis / International</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Fournisseur d&apos;authentification fédérée (OAuth 2.0 / OpenID Connect) utilisé lors de la connexion via le bouton Google.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between font-semibold text-slate-900 text-sm mb-1">
                    <span>Cloudinary Ltd.</span>
                    <span className="text-xs font-normal text-slate-500">Hébergement multimédia sécurisé</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Stockage, optimisation et diffusion sécurisée des ressources multimédias (logos d&apos;entreprises, bannières et photos de profil).
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5 : Sécurité et Cloisonnement */}
            <section id="securite" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  5
                </span>
                <span>Sécurité, cloisonnement et conservation des données</span>
              </h2>
              <p className="text-sm sm:text-base">
                La sécurité des données est inscrite au cœur de l&apos;architecture de Radiza :
              </p>
              <ul className="list-disc list-inside text-sm sm:text-base space-y-2 text-slate-700 pl-2">
                <li>
                  <strong>Chiffrement des flux :</strong> Toutes les communications entre votre navigateur et Radiza sont protégées par le protocole HTTPS / TLS 1.3.
                </li>
                <li>
                  <strong>Mots de passe protégés :</strong> Les mots de passe sont hachés de manière unidirectionnelle cryptographique par le service d&apos;authentification et ne sont jamais stockés en clair.
                </li>
                <li>
                  <strong>Cloisonnement par politiques RLS (Row Level Security) :</strong> La base de données PostgreSQL applique des politiques d&apos;accès strictes : une entreprise ne peut modifier que ses propres données, et les revendeurs n&apos;accèdent qu&apos;aux demandes et commandes qui les concernent.
                </li>
                <li>
                  <strong>Durée de conservation :</strong> Les données sont conservées pendant toute la durée d&apos;activation de votre compte professionnel. En cas de fermeture ou d&apos;inactivité prolongée, les données sont archivées ou détruites conformément aux obligations de traçabilité commerciale.
                </li>
              </ul>
            </section>

            {/* Section 6 : Gestion des cookies */}
            <section id="cookies" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  6
                </span>
                <span>Gestion des cookies et données de session</span>
              </h2>
              <p className="text-sm sm:text-base">
                Radiza utilise exclusivement des témoins de connexion (cookies) <strong>strictement nécessaires</strong> au bon fonctionnement technique et à la sécurité du service :
              </p>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-900">Cookies de session Supabase :</span> Permettent de maintenir votre session connectée en toute sécurité (<code className="text-forest-800 bg-forest-50 px-1 py-0.5 rounded">HttpOnly</code>, <code className="text-forest-800 bg-forest-50 px-1 py-0.5 rounded">SameSite=Lax</code>).
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-900">Cookie temporaire d&apos;inscription OAuth (<code className="text-forest-800 bg-forest-50 px-1 py-0.5 rounded">radiza_oauth_role</code>) :</span> Cookie éphémère (durée de vie maximale : 10 minutes) utilisé exclusivement lors de la création d&apos;un compte via Google OAuth pour transmettre le rôle sélectionné, immédiatement supprimé à l&apos;issue du flux d&apos;authentification.
                </div>
              </div>
              <p className="text-xs text-slate-500 italic mt-2">
                Radiza ne dépose aucun cookie de pistage publicitaire tiers, aucun traceur de reciblage commercial, ni aucun pixel de réseaux sociaux.
              </p>
            </section>

            {/* Section 7 : Droits des utilisateurs */}
            <section id="droits" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  7
                </span>
                <span>Droits des utilisateurs et modalités d&apos;exercice</span>
              </h2>
              <p className="text-sm sm:text-base">
                Tout utilisateur titulaire d&apos;un compte Radiza dispose des droits suivants sur ses données :
              </p>
              <ul className="list-disc list-inside text-sm sm:text-base space-y-1.5 text-slate-700 pl-2">
                <li><strong>Droit d&apos;accès :</strong> consulter l&apos;ensemble des informations associées à son profil et à ses activités ;</li>
                <li><strong>Droit de rectification :</strong> mettre à jour ses coordonnées et informations d&apos;entreprise directement depuis son tableau de bord ;</li>
                <li><strong>Droit à l&apos;effacement :</strong> solliciter la suppression de son compte utilisateur et des données personnelles afférentes, sous réserve des contraintes d&apos;intégrité des commandes déjà enregistrées ;</li>
                <li><strong>Droit à la limitation du traitement :</strong> demander la suspension temporaire de l&apos;utilisation d&apos;un compte.</li>
              </ul>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 mt-3">
                <p className="font-semibold text-slate-900 mb-1">Comment exercer vos droits ?</p>
                <p>
                  Les demandes d&apos;accès, de modification ou de suppression de compte peuvent être adressées à l&apos;équipe technique et administrative de <strong>Synapta SARL</strong> via les canaux d&apos;assistance de la plateforme ou aux coordonnées de contact officielles transmises lors de votre inscription.
                </p>
              </div>
            </section>

            {/* Section 8 : Transferts internationaux */}
            <section id="transferts" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  8
                </span>
                <span>Transferts techniques de données</span>
              </h2>
              <p className="text-sm sm:text-base">
                En raison de l&apos;architecture cloud distribuée (Vercel, Supabase, Google, Cloudinary), certaines données techniques peuvent être hébergées ou transiter sur des serveurs situés hors de votre pays de résidence (notamment dans l&apos;Union Européenne et aux États-Unis). Ces transferts sont encadrés par des engagements de sécurité stricts garantis par les prestataires sélectionnés.
              </p>
            </section>

            {/* Section 9 : Modifications de la politique */}
            <section id="modifications" className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
                  9
                </span>
                <span>Mise à jour de la présente Politique</span>
              </h2>
              <p className="text-sm sm:text-base">
                Synapta SARL se réserve la faculté d&apos;adapter et de mettre à jour la présente Politique de Confidentialité afin de refléter les évolutions techniques ou réglementaires de la plateforme Radiza. Toute révision substantielle sera signalée par l&apos;actualisation de la date de « Dernière mise à jour » en tête de ce document.
              </p>
            </section>

            {/* Avis de transparence légale */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Note de transparence — Version V1 Expérimentale</p>
                  <p className="leading-relaxed">
                    Ce document décrit fidèlement les flux et technologies actifs dans la version V1 de Radiza. Conformément aux règles d&apos;intégrité du projet, aucune mention de conformité ou de certification non auditée n&apos;a été ajoutée. Les coordonnées postales du siège social et l&apos;adresse électronique formelle de l&apos;éditeur restent à compléter par la direction de Synapta SARL.
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
              href="/terms"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-semibold text-sm shadow-sm transition-colors"
            >
              <span>Consulter les Conditions d&apos;utilisation</span>
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
              className="text-slate-600 hover:text-forest-700 underline-offset-4 hover:underline transition-colors"
            >
              Conditions d&apos;utilisation
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              href="/privacy"
              className="text-forest-800 font-semibold underline-offset-4 underline"
            >
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
