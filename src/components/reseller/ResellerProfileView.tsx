"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Province } from "@/lib/queries/geography";
import {
  updateResellerAvatarAction,
  deleteResellerAvatarAction,
  ActionResponse,
} from "@/lib/actions/resellerProfile";
import { usePhotoForUpload } from "@/components/ui/usePhotoForUpload";
import ResellerEditProfileDrawer from "./ResellerEditProfileDrawer";
import ResellerEditLocationDrawer from "./ResellerEditLocationDrawer";
import ResellerLogoutButton from "./ResellerLogoutButton";
import SecurityPasswordDrawer from "@/components/security/SecurityPasswordDrawer";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/PageHeader";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
import {
  Store,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Camera,
  Trash2,
  Loader2,
  Edit3,
  Calendar,
  ShoppingBag,
  FileText,
  Megaphone,
  Check,
  Copy,
  Sparkles,
  Info,
  Building2,
  ExternalLink,
  KeyRound,
  Activity,
} from "lucide-react";

interface ResellerProfileViewProps {
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
  reseller: {
    id: string;
    business_name?: string | null;
    province_id: string;
    reseller_type: string;
    city?: string | null;
    delivery_address?: string | null;
    created_at?: string;
    provinces?: any;
    countries?: any;
  } | null;
  provinces: Province[];
  /** null : lecture en échec (affiché « Indisponible », jamais 0) — Lot 7 */
  ordersCount: number | null;
  demandsCount: number | null;
}

const RESELLER_TYPE_LABELS: Record<string, string> = {
  wholesaler: "Grossiste",
  semi_wholesaler: "Demi-grossiste",
  retailer: "Détaillant",
  processor: "Transformateur agro-alimentaire",
};

const RESELLER_TYPE_DESCRIPTIONS: Record<string, string> = {
  wholesaler: "Achat et distribution en très grands volumes",
  semi_wholesaler: "Distribution intermédiaire vers les détaillants",
  retailer: "Vente directe aux consommateurs sur les marchés urbains",
  processor: "Transformation industrielle ou artisanale de matière première",
};

type TabType = "identity" | "contact" | "activity" | "security";

/** Préfixe des identifiants des onglets et panneaux du profil Revendeur (Lot 7). */
const PROFILE_TABS_ID = "profil-revendeur";

export default function ResellerProfileView({
  user,
  profile,
  reseller,
  provinces,
  ordersCount,
  demandsCount,
}: ResellerProfileViewProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Rubrique affichée (Lot 7, D6)
  const [activeTab, setActiveTab] = useState<TabType>("identity");

  // Drawers d'édition
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);
  const [isPasswordDrawerOpen, setIsPasswordDrawerOpen] = useState(false);

  // Gestion de l'avatar Cloudinary
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Photo envoyée dès le choix : seule la préparation commune est utilisée.
  const avatarPhoto = usePhotoForUpload();

  // Copie de l'identifiant
  const [copiedId, setCopiedId] = useState(false);

  const displayName =
    reseller?.business_name || profile?.full_name || "Revendeur";
  const fullName = profile?.full_name || "Non renseigné";
  const resellerType = reseller?.reseller_type || "wholesaler";
  const typeLabel = RESELLER_TYPE_LABELS[resellerType] || "Revendeur";
  const typeDesc = RESELLER_TYPE_DESCRIPTIONS[resellerType] || "";

  // Extraction tolérante objet ou tableau retourné par Supabase Join
  const rawProvince = Array.isArray(reseller?.provinces)
    ? reseller.provinces[0]
    : reseller?.provinces;
  const provinceName = rawProvince?.name || "Non renseignée";

  const rawCountry = Array.isArray(reseller?.countries)
    ? reseller.countries[0]
    : reseller?.countries;
  const countryName = rawCountry?.name || "RDC";
  const countryCode = rawCountry?.code || "COD";

  // Formatage des dates
  const memberSince = (profile?.created_at || reseller?.created_at)
    ? new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric",
      }).format(new Date(profile?.created_at || reseller?.created_at!))
    : "Récemment";

  const fullCreationDate = (profile?.created_at || reseller?.created_at)
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(profile?.created_at || reseller?.created_at!))
    : "Non disponible";

  const getInitials = () => {
    const name = displayName;
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Upload Avatar vers Cloudinary
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (!chosen) return;

    setIsUploadingAvatar(true);
    // Contrôle et préparation communs ; la notification existante signale un refus.
    const { file, error } = await avatarPhoto.choose(chosen);
    if (!file) {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (error) toast.error("Photo non envoyée", { description: error });
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file, file.name);

    try {
      const res: ActionResponse = await updateResellerAvatarAction(null, formData);
      if (res.success && res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
        toast.success("Photo de profil mise à jour", {
          description: "Votre photo a été enregistrée avec succès.",
        });
        router.refresh();
      } else {
        toast.error("Téléchargement impossible", {
          description: res.error || "Impossible de mettre à jour la photo.",
        });
      }
    } catch (err: any) {
      console.error("Erreur profil revendeur :", err);
      toast.error("Problème de connexion", {
        description: "Une erreur est survenue. Veuillez réessayer.",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Suppression Avatar de Cloudinary
  const handleConfirmDeleteAvatar = async () => {
    setIsDeletingAvatar(true);
    try {
      const res = await deleteResellerAvatarAction();
      if (res.success) {
        setAvatarUrl(null);
        toast.success("Photo supprimée", {
          description: "Votre photo de profil a été retirée.",
        });
        setIsDeleteConfirmOpen(false);
        router.refresh();
      } else {
        toast.error("Erreur de suppression", {
          description: res.error || "Impossible de supprimer la photo.",
        });
      }
    } catch (err: any) {
      console.error("Erreur profil revendeur :", err);
      toast.error("Erreur de connexion", {
        description: "Une erreur est survenue.",
      });
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  // Copie de l'ID utilisateur
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
      toast.info("Identifiant copié", { description: "ID copié dans le presse-papier." });
    } catch {
      // Ignorer
    }
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-12">
      {/* 1. Fil d'Ariane commun (Lot 7, PRO-03) */}
      <Breadcrumb
        items={[{ href: "/dashboard/reseller", label: "Tableau de bord" }]}
        current="Mon profil"
      />

      {/* 2. Carte d'en-tête du profil Revendeur */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Avatar + Identité principale */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            {/* Conteneur Avatar */}
            <div className="relative group shrink-0 w-fit">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-forest-100 text-forest-800 border-2 border-forest-200/80 shadow-md flex items-center justify-center font-bold text-2xl sm:text-3xl overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials()}</span>
                )}

                {/* Loader pendant upload ou suppression */}
                {(isUploadingAvatar || isDeletingAvatar) && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              {/* Bouton direct pour modifier la photo (Cloudinary) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="profile-avatar-upload"
                disabled={isUploadingAvatar || isDeletingAvatar}
              />
              {/* Sous-lot P : vrai bouton (focalisable, Entrée et Espace) qui ouvre le champ masqué ;
                  zone de 44 px autour de la pastille visible, qui garde sa taille */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar || isDeletingAvatar}
                className="group/photo absolute -bottom-1 -right-1 w-11 h-11 flex items-center justify-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                title="Changer la photo de profil"
                aria-label="Changer la photo de profil"
              >
                <span
                  aria-hidden="true"
                  className="p-2 sm:p-2.5 rounded-full bg-forest-800 group-hover/photo:bg-forest-900 text-white shadow-md border-2 border-white transition-all motion-safe:group-hover/photo:scale-105 motion-safe:group-active/photo:scale-95"
                >
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
              </button>

              {/* Bouton de suppression si photo présente */}
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  disabled={isUploadingAvatar || isDeletingAvatar}
                  className="absolute top-0 right-0 p-1.5 rounded-full bg-white hover:bg-rose-50 text-gray-500 hover:text-rose-600 shadow-md border border-gray-200 transition-all hover:scale-105"
                  title="Supprimer la photo"
                  aria-label="Supprimer la photo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dénominations & Métadonnées rapides */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight font-display">
                  {displayName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Compte Actif
                </span>
              </div>

              {reseller?.business_name && profile?.full_name && (
                <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span>Responsable du compte : <strong>{profile.full_name}</strong></span>
                </p>
              )}

              {/* Badges d'attachement */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="earth">
                  <Store className="w-3 h-3 mr-1" />
                  {typeLabel}
                </Badge>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                  <MapPin className="w-3 h-3 text-earth-700" />
                  {provinceName}, {countryCode}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-50 text-gray-500 text-xs">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  Membre depuis {memberSince}
                </span>
              </div>
            </div>
          </div>

          {/* Boutons d'actions principales */}
          <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0 w-full sm:w-auto">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsEditProfileOpen(true)}
              className="flex-1 sm:flex-initial"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              <span>Modifier le profil</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditLocationOpen(true)}
              className="flex-1 sm:flex-initial"
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-earth-700" />
              <span>Territoire</span>
            </Button>
          </div>
        </div>

        {/* 4. Barre d'onglets (Lot 7, D6 et PRO-03 : même modèle que le profil Société, 2 lignes sur mobile).
            Pas de compteur sur « Activité » : en cas de panne de lecture, la page reçoit 0 pour le nombre manquant,
            et une somme mêlerait une valeur réelle et une valeur indisponible. Les deux nombres restent affichés
            séparément dans « Accès rapides », comme avant le lot. */}
        <div className="pt-4 border-t border-gray-100">
          <Tabs
            idBase={PROFILE_TABS_ID}
            ariaLabel="Rubriques de mon profil"
            variant="ghost"
            layout="grid"
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as TabType)}
            tabs={[
              { id: "identity", label: "Identité", icon: <Store className="w-4 h-4" /> },
              { id: "contact", label: "Coordonnées", icon: <MapPin className="w-4 h-4" /> },
              { id: "activity", label: "Activité", icon: <Activity className="w-4 h-4" /> },
              { id: "security", label: "Sécurité et session", icon: <ShieldCheck className="w-4 h-4" /> },
            ]}
          />
        </div>
      </div>

      {/* 5. Contenu des onglets */}
      <div className="space-y-6">
        {/* ONGLET 1 : IDENTITÉ */}
        <TabPanel idBase={PROFILE_TABS_ID} tabId="identity" activeTab={activeTab}>
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center font-bold">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 tracking-tight">
                    Établissement Commercial
                  </h2>
                  <p className="text-xs text-gray-500">
                    Informations sur votre activité commerciale
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="text-xs font-bold text-forest-800 hover:text-forest-950 hover:underline flex items-center gap-1 max-sm:min-h-11 max-sm:px-2 max-sm:-mr-2"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                  Dénomination Commerciale
                </span>
                <span className="font-bold text-gray-950 block">
                  {reseller?.business_name || profile?.full_name || "Non renseignée"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                  Typologie d&apos;Achat
                </span>
                <span className="font-bold text-earth-900 block">{typeLabel}</span>
                {typeDesc && (
                  <span className="text-xs text-gray-500 block">{typeDesc}</span>
                )}
              </div>

              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                  Responsable du compte
                </span>
                <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {fullName}
                </span>
              </div>
            </div>
          </div>
        </TabPanel>

        {/* ONGLET 2 : COORDONNÉES */}
        <TabPanel idBase={PROFILE_TABS_ID} tabId="contact" activeTab={activeTab}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Coordonnées de contact */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center font-bold">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 tracking-tight">
                      Coordonnées de contact
                    </h2>
                    <p className="text-xs text-gray-500">
                      Email et téléphone de votre compte
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="text-xs font-bold text-forest-800 hover:text-forest-950 hover:underline flex items-center gap-1 max-sm:min-h-11 max-sm:px-2 max-sm:-mr-2"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1 min-w-0">
                  <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                    Email Professionnel
                  </span>
                  <a
                    href={`mailto:${user.email}`}
                    className="font-semibold text-forest-800 hover:underline flex items-center gap-1.5 truncate"
                  >
                    <Mail className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </a>
                </div>

                <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                    Téléphone de Contact
                  </span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {profile?.phone ? (
                      <a
                        href={`tel:${profile.phone}`}
                        className="text-gray-900 hover:text-forest-800 transition-colors"
                      >
                        {profile.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400 font-normal italic">
                        Non renseigné (conseillé pour les livraisons)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Card B : Territoire d'Opération Pivot (Éligibilité Régionale) */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-earth-100 text-earth-800 flex items-center justify-center font-bold">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 tracking-tight">
                      Territoire principal d&apos;intervention
                    </h2>
                    <p className="text-xs text-gray-500">
                      Détermine l&apos;éligibilité territoriale aux campagnes
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditLocationOpen(true)}
                  className="text-xs font-bold text-earth-800 hover:text-earth-950 hover:underline flex items-center gap-1 max-sm:min-h-11 max-sm:px-2 max-sm:-mr-2"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
              </div>

              {/* Note d'explication de la règle régionale */}
              <div className="p-3.5 rounded-2xl bg-forest-50/70 border border-forest-200/70 flex items-start gap-2.5 text-xs text-forest-900 leading-relaxed">
                <Info className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
                <span>
                  Votre province de rattachement filtre automatiquement les campagnes commerciales
                  desservant votre bassin de consommation pour garantir la fraîcheur et la faisabilité logistique.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                    Pays
                  </span>
                  <span className="font-bold text-gray-900 block">
                    {countryName} ({countryCode})
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-earth-50 border border-earth-200/80 space-y-1">
                  <span className="text-[11px] text-earth-800 uppercase font-bold tracking-wider block">
                    Province principale
                  </span>
                  <span className="font-black text-earth-950 block truncate">
                    {provinceName}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                    Ville / Commune
                  </span>
                  <span className="font-semibold text-gray-900 block truncate">
                    {reseller?.city || "Non spécifiée"}
                  </span>
                </div>
              </div>

              {/* Adresse habituelle de livraison */}
              <div className="pt-3 border-t border-gray-100 space-y-1 text-xs sm:text-sm">
                <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                  Adresse habituelle de réception / Dépôt
                </span>
                <p className="text-gray-800 font-medium">
                  {reseller?.delivery_address || (
                    <span className="text-gray-400 font-normal italic">
                      Aucune adresse habituelle enregistrée. Vous pourrez la préciser lors de chaque commande.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </TabPanel>

        {/* ONGLET 3 : ACTIVITÉ (DONNÉES 100% RÉELLES) */}
        <TabPanel idBase={PROFILE_TABS_ID} tabId="activity" activeTab={activeTab}>
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Accès rapides
                </h2>
                <p className="text-xs text-gray-500">
                  Vos commandes, vos demandes et les campagnes
                </p>
              </div>
            </div>

            {/* Lot 7 : compteur en panne signalé, avec relecture réelle (« Réessayer ») */}
            {(ordersCount === null || demandsCount === null) && (
              <DataUnavailableNotice title="Compteurs indisponibles">
                Certains compteurs n&apos;ont pas pu être chargés : ils sont marqués « Indisponible »
                au lieu d&apos;un nombre. Réessayez dans un instant.
              </DataUnavailableNotice>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link
                href="/dashboard/reseller/orders"
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-forest-50/70 border border-gray-200/70 hover:border-forest-200 text-xs font-bold text-gray-900 hover:text-forest-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-forest-700" />
                  <span>Mes commandes</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-mono font-bold group-hover:border-forest-300">
                  {ordersCount ?? "Indisponible"}
                </span>
              </Link>

              <Link
                href="/dashboard/reseller/demands"
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-forest-50/70 border border-gray-200/70 hover:border-forest-200 text-xs font-bold text-gray-900 hover:text-forest-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-forest-700" />
                  <span>Mes demandes</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-mono font-bold group-hover:border-forest-300">
                  {demandsCount ?? "Indisponible"}
                </span>
              </Link>

              <Link
                href="/dashboard/reseller/campaigns"
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-earth-50/70 border border-gray-200/70 hover:border-earth-200 text-xs font-bold text-gray-900 hover:text-earth-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Megaphone className="w-4 h-4 text-earth-700" />
                  <span>Campagnes</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-earth-700" />
              </Link>
            </div>
          </div>
        </TabPanel>

        {/* ONGLET 4 : SÉCURITÉ ET SESSION */}
        <TabPanel idBase={PROFILE_TABS_ID} tabId="security" activeTab={activeTab}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Compte Utilisateur : rôle, création, identifiant, mot de passe */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4 text-forest-700" />
                </div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Compte Utilisateur
                </h2>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                    Rôle
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-forest-900">
                    <ShieldCheck className="w-4 h-4 text-forest-700" />
                    Revendeur
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                    Création du Compte
                  </span>
                  <span className="text-gray-800 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {fullCreationDate}
                  </span>
                </div>

                <div className="space-y-1 pt-1 border-t border-gray-100">
                  <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                    Identifiant du compte
                  </span>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-200/80 font-mono text-[11px] text-gray-600">
                    <span className="truncate max-w-[190px]">{user.id}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors max-sm:min-h-11 max-sm:min-w-11 max-sm:-my-2 max-sm:-mr-1 flex items-center justify-center"
                      title="Copier l'identifiant"
                      aria-label={copiedId ? "Identifiant copié" : "Copier l'identifiant"}
                    >
                      {copiedId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* AUTH-6.2 — Gestion du mot de passe */}
                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider block">
                    Sécurité du Compte
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={() => setIsPasswordDrawerOpen(true)}
                    leftIcon={<KeyRound className="w-3.5 h-3.5 text-forest-700" />}
                  >
                    Gérer le mot de passe
                  </Button>
                </div>
              </div>
            </div>

            {/* Déconnexion (composant inchangé, auparavant en bas de page) */}
            <ResellerLogoutButton />
          </div>
        </TabPanel>
      </div>

      {/* 7. Drawers et Modales */}
      <ResellerEditProfileDrawer
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentFullName={profile?.full_name || ""}
        currentBusinessName={reseller?.business_name || ""}
        currentResellerType={resellerType}
        currentPhone={profile?.phone || ""}
        userEmail={user.email}
      />

      <ResellerEditLocationDrawer
        isOpen={isEditLocationOpen}
        onClose={() => setIsEditLocationOpen(false)}
        provinces={provinces}
        currentProvinceId={reseller?.province_id}
        currentCity={reseller?.city || undefined}
        currentAddress={reseller?.delivery_address || undefined}
      />

      {/* Confirmation de suppression d'avatar */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteAvatar}
        title="Supprimer la photo de profil ?"
        description="Votre photo de profil sera définitivement retirée de votre compte. Des initiales générées seront affichées par défaut."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        isLoading={isDeletingAvatar}
      />

      {/* 8. Drawer de gestion du mot de passe (AUTH-6.2) */}
      <SecurityPasswordDrawer
        isOpen={isPasswordDrawerOpen}
        onClose={() => setIsPasswordDrawerOpen(false)}
        userEmail={user.email}
      />
    </div>
  );
}
