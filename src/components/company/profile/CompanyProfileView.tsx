"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import CompanyEditProfileDrawer from "./CompanyEditProfileDrawer";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Clock,
  User,
  ArrowLeft,
  Camera,
  Edit3,
  Calendar,
  Layers,
  ShoppingBag,
  Megaphone,
  Copy,
  Check,
  Sparkles,
  LogOut,
  ExternalLink,
  Info,
  CheckCircle2,
  Activity,
  FileText,
} from "lucide-react";

interface CompanyProfileViewProps {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    full_name: string;
    phone?: string | null;
    role: string;
    avatar_url?: string | null;
    created_at?: string;
  } | null;
  company: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    verification_status: "pending" | "verified" | "rejected" | string;
    logo_url: string | null;
    created_at?: string;
    provinces?: any;
    countries?: any;
  };
  productionsCount: number;
  campaignsCount: number;
  ordersCount: number;
}

type TabType = "identity" | "contact" | "activity" | "security";

export default function CompanyProfileView({
  user,
  profile,
  company,
  productionsCount,
  campaignsCount,
  ordersCount,
}: CompanyProfileViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("identity");
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Normalisation des relations géographiques
  const rawProvince = Array.isArray(company.provinces)
    ? company.provinces[0]
    : company.provinces;
  const provinceName = rawProvince?.name || "Province non renseignée";

  const rawCountry = Array.isArray(company.countries)
    ? company.countries[0]
    : company.countries;
  const countryName = rawCountry?.name || "République Démocratique du Congo";
  const countryCode = rawCountry?.code || "COD";

  // Formatage des dates
  const creationDateFormatted = company.created_at
    ? new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric",
      }).format(new Date(company.created_at))
    : "Récemment";

  const fullCreationDate = company.created_at
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(company.created_at))
    : "Non renseignée";

  // Initiales de l'exploitation
  const getInitials = () => {
    const name = company.name || "EA";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Copie du slug
  const handleCopySlug = async () => {
    try {
      await navigator.clipboard.writeText(company.slug);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
      toast.info("Identifiant copié", {
        description: `Slug @${company.slug} copié dans le presse-papier.`,
      });
    } catch {
      // Ignorer
    }
  };

  // Copie de l'identifiant session
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.info("Identifiant copié", {
        description: "ID de compte copié dans le presse-papier.",
      });
    } catch {
      // Ignorer
    }
  };

  // Déconnexion sécurisée
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
      await logoutAction();
    } catch {
      // Redirection Next.js
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  const isVerified = company.verification_status === "verified";

  return (
    <div className="space-y-6 pb-24 sm:pb-12 max-w-7xl mx-auto">
      {/* 1. Fil d'Ariane épuré */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link
          href="/dashboard/company"
          className="hover:text-forest-800 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tableau de bord</span>
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">Profil de l&apos;exploitation</span>
      </div>

      {/* 2. Carte d'en-tête du profil de l'exploitation */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          {/* Logo officiel + Identité principale */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            {/* Conteneur Logo avec bouton appareil photo */}
            <div className="relative group shrink-0">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-forest-100 text-forest-800 border-2 border-forest-200/80 shadow-md flex items-center justify-center font-bold text-2xl overflow-hidden">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials()}</span>
                )}
              </div>

              {/* Bouton direct pour ouvrir l'édition du logo */}
              <button
                type="button"
                onClick={() => setIsEditDrawerOpen(true)}
                className="absolute bottom-0 right-0 p-1.5 sm:p-2 rounded-full bg-forest-800 hover:bg-forest-900 text-white shadow-md border-2 border-white transition-all hover:scale-105 active:scale-95"
                title="Modifier le logo ou la photo de l'exploitation"
                aria-label="Modifier le logo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dénominations & Métadonnées rapides */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-950 tracking-tight font-display">
                  {company.name}
                </h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Vérifiée
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200/80">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Dossier en cours d&apos;audit
                  </span>
                )}
              </div>

              {/* Slug et gérant */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-xs font-semibold">
                  @{company.slug}
                </span>
                {profile?.full_name && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <span className="text-gray-300">•</span>
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>Gérant : <strong className="text-gray-800">{profile.full_name}</strong></span>
                  </span>
                )}
              </div>

              {/* Badges d'attachement géographique & temporel */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-forest-50 text-forest-800 text-xs font-semibold border border-forest-100">
                  <MapPin className="w-3.5 h-3.5 text-forest-600" />
                  {company.city ? `${company.city}, ` : ""}{provinceName} ({countryCode})
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs border border-gray-100">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Membre depuis {creationDateFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Boutons d'actions principales */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleCopySlug}
              leftIcon={copiedSlug ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            >
              {copiedSlug ? "Identifiant copié" : "Copier le slug"}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setIsEditDrawerOpen(true)}
              leftIcon={<Edit3 className="w-4 h-4" />}
            >
              Modifier le profil
            </Button>
          </div>
        </div>

        {/* 4. Barre d'onglets façon YouTube Studio / Facebook */}
        <div className="border-t border-gray-100 pt-4">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "identity"}
              onClick={() => setActiveTab("identity")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === "identity"
                  ? "bg-forest-800 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Identité & Fiche</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "contact"}
              onClick={() => setActiveTab("contact")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === "contact"
                  ? "bg-forest-800 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Coordonnées & Siège</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "activity"}
              onClick={() => setActiveTab("activity")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === "activity"
                  ? "bg-forest-800 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Activité en direct</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "activity" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
              }`}>
                {productionsCount + campaignsCount + ordersCount}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "security"}
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === "security"
                  ? "bg-forest-800 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Gouvernance & Sécurité</span>
            </button>
          </nav>
        </div>
      </div>

      {/* 5. Contenu des onglets */}
      <div className="space-y-6">
        {/* ONGLET 1 : IDENTITÉ & FICHE */}
        {activeTab === "identity" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Carte Présentation */}
              <Card padding="lg" className="border-gray-200/80">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        Présentation de l&apos;Exploitation
                      </h2>
                      <p className="text-xs text-gray-500">
                        Description officielle de votre activité agricole
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditDrawerOpen(true)}
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  >
                    Modifier
                  </Button>
                </div>

                <div className="prose prose-sm text-gray-700 max-w-none">
                  {company.description ? (
                    <p className="whitespace-pre-line leading-relaxed text-sm sm:text-base">
                      {company.description}
                    </p>
                  ) : (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                      <p className="text-sm text-gray-500">
                        Aucune description n&apos;a encore été rédigée pour cette exploitation.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-3"
                        onClick={() => setIsEditDrawerOpen(true)}
                      >
                        Ajouter une présentation
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Carte Renseignements juridiques */}
              <Card padding="lg" className="border-gray-200/80">
                <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Renseignements Juridiques & Système
                    </h2>
                    <p className="text-xs text-gray-500">
                      Identification unique de l&apos;entité sur Radiza
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold block">
                      Raison Sociale Officielle
                    </span>
                    <span className="text-gray-900 font-bold text-base mt-1 block">
                      {company.name}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold block">
                      Identifiant Slug Public
                    </span>
                    <span className="text-gray-900 font-mono text-sm font-bold mt-1 block">
                      {company.slug}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold block">
                      Date d&apos;immatriculation
                    </span>
                    <span className="text-gray-900 font-semibold text-sm mt-1 block">
                      {fullCreationDate}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold block">
                      Statut d&apos;Homologation
                    </span>
                    <span className="mt-1 block">
                      {isVerified ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1.5 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Exploitation Certifiée
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold flex items-center gap-1.5 text-sm">
                          <Clock className="w-4 h-4 text-amber-600" />
                          Audit Administratif en cours
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Colonne latérale : Statut & Recommandations */}
            <div className="space-y-6">
              <Card padding="md" className="border-forest-200/80 bg-forest-50/40">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-forest-800" />
                  <h3 className="font-bold text-forest-900 text-sm">
                    {isVerified ? "Exploitation Agréée" : "Audit de Conformité"}
                  </h3>
                </div>
                <p className="text-xs text-forest-800/90 leading-relaxed">
                  {isVerified
                    ? "Votre exploitation agricole est pleinement certifiée par le réseau Radiza. Vos productions et campagnes de vente sont ouvertes aux acheteurs revendeurs professionnels."
                    : "Votre dossier est actuellement soumis aux critères de validation de la plateforme. Vous pouvez d'ores et déjà préparer vos productions et consulter la demande du marché."}
                </p>
              </Card>

              <Card padding="md" className="border-gray-200/80">
                <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-forest-700" />
                  Règle d&apos;or Radiza
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  L&apos;inscription de votre entreprise est <strong>strictement indépendante</strong> de la création de vos productions. Vos récoltes et stocks sont gérés au niveau du module Productions & Récoltes.
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* ONGLET 2 : COORDONNÉES & SIÈGE */}
        {activeTab === "contact" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Carte Coordonnées officielles */}
            <Card padding="lg" className="border-gray-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Coordonnées Directes
                    </h2>
                    <p className="text-xs text-gray-500">
                      Canaux de contact officiels pour les partenaires
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDrawerOpen(true)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Modifier
                </Button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase font-semibold block">
                    Téléphone du Siège
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-forest-700" />
                    <span className="font-bold text-gray-900 text-base">
                      {company.phone || profile?.phone || "Non renseigné"}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase font-semibold block">
                    Email Professionnel
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4 text-forest-700" />
                    <span className="font-bold text-gray-900 text-base">
                      {company.email || user.email || "Non renseigné"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Carte Implantation territoriale */}
            <Card padding="lg" className="border-gray-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Implantation Territoriale
                    </h2>
                    <p className="text-xs text-gray-500">
                      Localisation géographique officielle
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDrawerOpen(true)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Modifier
                </Button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold block">
                      Pays
                    </span>
                    <span className="font-bold text-gray-900 mt-0.5 block">
                      {countryName} ({countryCode})
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold block">
                      Province
                    </span>
                    <span className="font-bold text-forest-800 mt-0.5 block">
                      {provinceName}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase font-semibold block">
                    Ville ou Territoire
                  </span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {company.city || "Non spécifiée"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase font-semibold block">
                    Adresse physique précise
                  </span>
                  <span className="text-gray-800 mt-0.5 block">
                    {company.address || "Aucune adresse physique précise enregistrée."}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ONGLET 3 : ACTIVITÉ EN DIRECT (DONNÉES 100% RÉELLES) */}
        {activeTab === "activity" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Carte Productions */}
              <Link
                href="/dashboard/company/productions"
                className="group p-5 rounded-2xl bg-white border border-gray-200/80 hover:border-forest-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                    Productions Enregistrées
                  </span>
                  <div className="text-3xl font-black text-gray-950 mt-1 font-display">
                    {productionsCount}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Cultures et parcelles suivies
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between text-xs font-bold text-forest-800 group-hover:translate-x-0.5 transition-transform">
                  <span>Gérer les productions</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>

              {/* Carte Campagnes */}
              <Link
                href="/dashboard/company/campaigns"
                className="group p-5 rounded-2xl bg-white border border-gray-200/80 hover:border-indigo-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                    Campagnes de Vente
                  </span>
                  <div className="text-3xl font-black text-gray-950 mt-1 font-display">
                    {campaignsCount}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Lots commercialisables ouverts
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between text-xs font-bold text-indigo-800 group-hover:translate-x-0.5 transition-transform">
                  <span>Gérer les campagnes</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>

              {/* Carte Commandes */}
              <Link
                href="/dashboard/company/orders"
                className="group p-5 rounded-2xl bg-white border border-gray-200/80 hover:border-amber-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                    Commandes Reçues
                  </span>
                  <div className="text-3xl font-black text-gray-950 mt-1 font-display">
                    {ordersCount}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Réservations fermes d&apos;acheteurs
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between text-xs font-bold text-amber-800 group-hover:translate-x-0.5 transition-transform">
                  <span>Voir les commandes</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>

            <Card padding="md" className="border-gray-200/80 bg-gray-50/70">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-forest-700" />
                <h4 className="font-bold text-gray-900 text-sm">
                  Transparence & Intégrité des Données
                </h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Les chiffres affichés ci-dessus proviennent exclusivement de vos transactions réelles sur la base de données. Radiza ne simule aucune statistique commerciale.
              </p>
            </Card>
          </div>
        )}

        {/* ONGLET 4 : GOUVERNANCE & SÉCURITÉ */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Responsable de compte */}
            <Card padding="lg" className="border-gray-200/80 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Responsable de Compte
                  </h2>
                  <p className="text-xs text-gray-500">
                    Titulaire légal habilité à engager l&apos;exploitation
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase font-semibold block">
                    Nom Complet du Titulaire
                  </span>
                  <span className="font-bold text-gray-900 text-base mt-1 block">
                    {profile?.full_name || "Non renseigné"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase font-semibold block">
                    Rôle de Gouvernance Attribué
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-forest-800 font-bold mt-1 text-sm">
                    <ShieldCheck className="w-4 h-4 text-forest-600" />
                    Owner (Fondateur de l&apos;exploitation)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 uppercase font-semibold block">
                    Téléphone Personnel du Gérant
                  </span>
                  <span className="text-gray-900 font-medium text-sm mt-1 block">
                    {profile?.phone || "Non renseigné"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Session & Déconnexion sécurisée */}
            <Card padding="lg" className="border-gray-200/80 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Session & Déconnexion
                    </h2>
                    <p className="text-xs text-gray-500">
                      Gestion sécurisée de votre accès
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mt-4 text-sm">
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 uppercase font-semibold">
                        Identifiant Session Sécurisé
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="text-xs text-forest-700 hover:text-forest-900 font-semibold inline-flex items-center gap-1"
                      >
                        {copiedId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                    <span className="font-mono text-xs text-gray-600 truncate block">
                      {user.id}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-xs text-gray-500 uppercase font-semibold block">
                      Email d&apos;Authentification
                    </span>
                    <span className="font-medium text-gray-800 text-sm mt-1 block">
                      {user.email || profile?.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton de déconnexion avec ConfirmDialog */}
              <div className="pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="destructive"
                  size="md"
                  className="w-full"
                  onClick={() => setIsLogoutConfirmOpen(true)}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Se déconnecter de l&apos;exploitation
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 6. Drawer d'édition du profil (R1 Design System) */}
      <CompanyEditProfileDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        company={company}
      />

      {/* 7. Dialogue de confirmation de déconnexion (ConfirmDialog R1) */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Déconnexion de l'espace Société"
        description="Êtes-vous certain de vouloir fermer votre session ? Vos données de production et commandes restent sécurisées."
        confirmText="Oui, me déconnecter"
        cancelText="Rester connecté"
        variant="destructive"
        isLoading={isLoggingOut}
      />
    </div>
  );
}
