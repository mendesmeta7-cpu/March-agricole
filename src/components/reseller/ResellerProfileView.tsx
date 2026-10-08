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
import ResellerEditProfileDrawer from "./ResellerEditProfileDrawer";
import ResellerEditLocationDrawer from "./ResellerEditLocationDrawer";
import ResellerLogoutButton from "./ResellerLogoutButton";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import {
  Store,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  User,
  ArrowLeft,
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
  ordersCount: number;
  demandsCount: number;
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

  // Drawers d'édition
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);

  // Gestion de l'avatar Cloudinary
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copie de l'identifiant
  const [copiedId, setCopiedId] = useState(false);

  const displayName =
    reseller?.business_name || profile?.full_name || "Acheteur Professionnel";
  const fullName = profile?.full_name || "Titulaire non renseigné";
  const resellerType = reseller?.reseller_type || "wholesaler";
  const typeLabel = RESELLER_TYPE_LABELS[resellerType] || "Acheteur";
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
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux", {
        description: "L'image ne doit pas dépasser 5 Mo.",
      });
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);

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
      toast.error("Problème de connexion", {
        description: err.message || "Une erreur est survenue. Veuillez réessayer.",
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
      toast.error("Erreur de connexion", {
        description: err.message || "Une erreur est survenue.",
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
      {/* 1. Fil d'Ariane épuré */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
        <Link
          href="/dashboard/reseller"
          className="hover:text-forest-800 flex items-center gap-1.5 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Espace Revendeur</span>
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">Mon Profil</span>
      </div>

      {/* 2. Carte d'en-tête du profil Revendeur */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Avatar + Identité principale */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            {/* Conteneur Avatar */}
            <div className="relative group shrink-0">
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
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center text-white">
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
              <label
                htmlFor="profile-avatar-upload"
                className="absolute bottom-0 right-0 p-2 sm:p-2.5 rounded-full bg-forest-800 hover:bg-forest-900 text-white shadow-md border-2 border-white cursor-pointer transition-all hover:scale-105 active:scale-95"
                title="Changer la photo de profil"
                aria-label="Changer la photo de profil"
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </label>

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
                  <span>Titulaire : <strong>{profile.full_name}</strong></span>
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
              variant="outline"
              size="sm"
              onClick={() => setIsEditLocationOpen(true)}
              className="flex-1 sm:flex-initial"
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-earth-700" />
              <span>Territoire</span>
            </Button>

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
          </div>
        </div>

        {/* 4. Bandeau de statistiques rapides réelles (0 Mock Data) */}
        <div className="pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100/80 space-y-0.5">
            <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">
              Commandes Fermes
            </span>
            <span className="text-lg font-black text-gray-950 font-display">
              {ordersCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100/80 space-y-0.5">
            <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">
              Besoins Exprimés
            </span>
            <span className="text-lg font-black text-forest-900 font-display">
              {demandsCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100/80 space-y-0.5">
            <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">
              Région Pivot
            </span>
            <span className="text-sm font-bold text-gray-950 truncate block">
              {provinceName}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100/80 space-y-0.5">
            <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider block">
              Statut Sécurité
            </span>
            <span className="text-sm font-bold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Vérifié SSR
            </span>
          </div>
        </div>
      </div>

      {/* 5. Grille principale en 2 colonnes (2/3 + 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche (2/3) : Fiche Établissement & Territoire Pivot */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card A : Établissement Commercial & Coordonnées */}
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
                    Informations d&apos;activité et coordonnées de contact
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="text-xs font-bold text-forest-800 hover:text-forest-950 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Dénomination Commerciale
                </span>
                <span className="font-bold text-gray-950 block">
                  {reseller?.business_name || profile?.full_name || "Non renseignée"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Typologie d&apos;Achat
                </span>
                <span className="font-bold text-earth-900 block">{typeLabel}</span>
                {typeDesc && (
                  <span className="text-[11px] text-gray-500 block">{typeDesc}</span>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Titulaire du Compte
                </span>
                <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {fullName}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
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

              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
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
                    Territoire d&apos;Opération Pivot
                  </h2>
                  <p className="text-xs text-gray-500">
                    Détermine l&apos;éligibilité territoriale aux offres de récoltes
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditLocationOpen(true)}
                className="text-xs font-bold text-earth-800 hover:text-earth-950 hover:underline flex items-center gap-1"
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
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Pays
                </span>
                <span className="font-bold text-gray-900 block">
                  {countryName} ({countryCode})
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-earth-50 border border-earth-200/80 space-y-1">
                <span className="text-[10px] text-earth-800 uppercase font-bold tracking-wider block">
                  Province Pivot
                </span>
                <span className="font-black text-earth-950 block truncate">
                  {provinceName}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Ville / Commune
                </span>
                <span className="font-semibold text-gray-900 block truncate">
                  {reseller?.city || "Non spécifiée"}
                </span>
              </div>
            </div>

            {/* Adresse habituelle de livraison */}
            <div className="pt-3 border-t border-gray-100 space-y-1 text-xs sm:text-sm">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
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

        {/* Colonne droite (1/3) : Compte, Sécurité & Liens Rapides */}
        <div className="space-y-6">
          {/* Card C : Compte & Sécurité */}
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
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Rôle Système Attribué
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-forest-900">
                  <ShieldCheck className="w-4 h-4 text-forest-700" />
                  Revendeur (Acheteur Pro)
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Création du Compte
                </span>
                <span className="text-gray-800 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {fullCreationDate}
                </span>
              </div>

              <div className="space-y-1 pt-1 border-t border-gray-100">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">
                  Identifiant Unique (UUID)
                </span>
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-200/80 font-mono text-[11px] text-gray-600">
                  <span className="truncate max-w-[190px]">{user.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                    title="Copier l'identifiant"
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card D : Accès Directs aux Espaces Métier */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Accès Rapides
            </h3>

            <div className="space-y-2">
              <Link
                href="/dashboard/reseller/orders"
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-forest-50/70 border border-gray-200/70 hover:border-forest-200 text-xs font-bold text-gray-900 hover:text-forest-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-forest-700" />
                  <span>Mes Commandes</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-mono font-bold group-hover:border-forest-300">
                  {ordersCount}
                </span>
              </Link>

              <Link
                href="/dashboard/reseller/demands"
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-forest-50/70 border border-gray-200/70 hover:border-forest-200 text-xs font-bold text-gray-900 hover:text-forest-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-forest-700" />
                  <span>Mes Demandes d&apos;Achat</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-mono font-bold group-hover:border-forest-300">
                  {demandsCount}
                </span>
              </Link>

              <Link
                href="/dashboard/reseller/campaigns"
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-earth-50/70 border border-gray-200/70 hover:border-earth-200 text-xs font-bold text-gray-900 hover:text-earth-900 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Megaphone className="w-4 h-4 text-earth-700" />
                  <span>Offres Commerciales</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-earth-700" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Section Déconnexion clairement accessible en bas de page (Section 14) */}
      <div className="pt-2">
        <ResellerLogoutButton />
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
    </div>
  );
}
