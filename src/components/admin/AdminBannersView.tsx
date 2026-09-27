"use client";

import { useState } from "react";
import { FeedBannerItem } from "@/lib/queries/feedBanners";
import { deleteAdminFeedBannerAction } from "@/lib/actions/admin/feedBanners";
import AdminBannerModal from "@/components/admin/AdminBannerModal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { Plus, Edit2, Trash2, Megaphone, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminBannersViewProps {
  banners: FeedBannerItem[];
}

export default function AdminBannersView({ banners }: AdminBannersViewProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<FeedBannerItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setSelectedBanner(null);
    setIsModalOpen(true);
    setErrorMsg(null);
  };

  const handleOpenEdit = (banner: FeedBannerItem) => {
    setSelectedBanner(banner);
    setIsModalOpen(true);
    setErrorMsg(null);
  };

  const handleDelete = async (banner: FeedBannerItem) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer la bannière « ${banner.title} » ?\nSon image Cloudinary sera également définitivement détruite.`
      )
    ) {
      return;
    }

    setDeletingId(banner.id);
    setErrorMsg(null);
    try {
      const res = await deleteAdminFeedBannerAction(banner.id);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la suppression.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barre d'action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Bannières du Flux ({banners.length})
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configurez les affiches du carrousel d&apos;accueil du Flux revendeur avec visuels Cloudinary.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Bannière</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Liste des bannières */}
      {banners.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {banners.map((banner) => (
            <Card key={banner.id} padding="none" className="overflow-hidden flex flex-col justify-between">
              {/* Image banner */}
              <div className="relative w-full aspect-21/9 bg-gray-100 overflow-hidden">
                {banner.image_url ? (
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}

                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <Badge variant={banner.is_active ? "forest" : "neutral"} size="sm">
                    {banner.is_active ? "Active" : "Désactivée"}
                  </Badge>
                  <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
                    Ordre : {banner.sort_order}
                  </span>
                </div>
              </div>

              {/* Contenu textuel */}
              <div className="p-4 sm:p-5 space-y-2 flex-1">
                <h3 className="font-bold text-gray-900 text-base leading-snug">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {banner.subtitle}
                  </p>
                )}

                {banner.button_label && (
                  <div className="pt-2 flex items-center gap-2 text-xs text-forest-700 font-semibold">
                    <span className="px-2.5 py-1 rounded-xl bg-forest-50 border border-forest-100">
                      Bouton : {banner.button_label}
                    </span>
                    {banner.button_url && (
                      <span className="text-[11px] text-gray-400 font-mono truncate max-w-[200px]">
                        → {banner.button_url}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Barre d'action */}
              <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]">
                  ID : {banner.cloudinary_public_id || "N/A"}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(banner)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-forest-700 hover:bg-white transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(banner)}
                    disabled={deletingId === banner.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aucune bannière configurée"
          description="Ajoutez des visuels avec boutons d'action pour le carrousel d'accueil du Flux revendeur."
          icon={<Megaphone className="w-8 h-8 text-forest-700" />}
          action={
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-2xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-xs"
            >
              Ajouter une bannière
            </button>
          }
        />
      )}

      {/* Modal d'ajout / modification */}
      <AdminBannerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          router.refresh();
        }}
        banner={selectedBanner}
      />
    </div>
  );
}
