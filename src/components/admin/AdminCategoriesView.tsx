"use client";

import { useState } from "react";
import { FeedCategoryItem } from "@/lib/queries/feedCategories";
import { deleteAdminFeedCategoryAction } from "@/lib/actions/admin/feedCategories";
import AdminCategoryModal from "@/components/admin/AdminCategoryModal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { Plus, Edit2, Trash2, Image as ImageIcon, Package, Layers } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminCategoriesViewProps {
  categories: FeedCategoryItem[];
}

export default function AdminCategoriesView({ categories }: AdminCategoriesViewProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FeedCategoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
    setErrorMsg(null);
  };

  const handleOpenEdit = (category: FeedCategoryItem) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
    setErrorMsg(null);
  };

  const handleDelete = async (category: FeedCategoryItem) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer la catégorie « ${category.name} » ?\nSon image Cloudinary sera également détruite.`
      )
    ) {
      return;
    }

    setDeletingId(category.id);
    setErrorMsg(null);
    try {
      const res = await deleteAdminFeedCategoryAction(category.id);
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
      {/* Barre d'action supérieure */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Catégories du Flux ({categories.length})
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configurez les icônes et images Cloudinary visibles dans le sélecteur horizontal du Flux revendeur.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Catégorie</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Grille des catégories */}
      {categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} padding="none" className="overflow-hidden flex flex-col justify-between">
              <div className="p-4 sm:p-5 flex items-start gap-4">
                {/* Miniature Cloudinary ou Placeholder */}
                <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200/80 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-gray-300" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate" title={cat.name}>
                      {cat.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={cat.is_active ? "forest" : "neutral"} size="sm">
                      {cat.is_active ? "Active" : "Désactivée"}
                    </Badge>
                    <span className="text-[11px] text-gray-400">
                      Ordre : {cat.sort_order}
                    </span>
                  </div>

                  {typeof cat.products_count === "number" && (
                    <p className="text-[11px] text-gray-500 inline-flex items-center gap-1 pt-1">
                      <Package className="w-3 h-3 text-gray-400" />
                      <span>{cat.products_count} produit{cat.products_count > 1 ? "s" : ""} associé{cat.products_count > 1 ? "s" : ""}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Barre d'actions inférieure */}
              <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 truncate font-mono">
                  {cat.cloudinary_public_id ? "Cloudinary ✓" : "Sans image"}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-forest-700 hover:bg-white transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    disabled={deletingId === cat.id}
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
          title="Aucune catégorie configurée"
          description="Créez votre première catégorie visuelle pour le sélecteur du flux revendeur."
          icon={<Layers className="w-8 h-8 text-forest-700" />}
          action={
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-2xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-xs"
            >
              Ajouter une catégorie
            </button>
          }
        />
      )}

      {/* Modal d'ajout / modification */}
      <AdminCategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          router.refresh();
        }}
        category={selectedCategory}
      />
    </div>
  );
}
