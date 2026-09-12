import { createClient } from "@/lib/supabase/server";
import { getPublicFeedProductions } from "@/lib/queries/feed";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import FeedView from "@/components/feed/FeedView";
import { Compass, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ResellerFeedPage() {
  const supabase = createClient();

  // 1. Récupération des productions publiques réelles
  const feedResult = await getPublicFeedProductions();

  // 2. Récupération des catégories de produits distinctes
  const { data: categoriesData } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true);

  const categories = Array.from(
    new Set((categoriesData || []).map((p: any) => p.category).filter(Boolean))
  ).sort() as string[];

  // 3. Récupération des provinces actives
  const { data: provincesData } = await supabase
    .from("provinces")
    .select("id, name")
    .order("name", { ascending: true });

  const provinces = (provincesData || []).map((p: any) => ({
    id: p.id,
    name: p.name,
  }));

  return (
    <div className="space-y-6">
      {/* Fil d'Ariane & Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/dashboard/reseller"
          className="hover:text-earth-800 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Accueil Revendeur
        </Link>
      </div>

      {/* En-tête de la page */}
      <PageHeader
        title="Flux des Productions Agricoles"
        description="Découvrez en avant-première les cycles culturaux déclarés et les récoltes prévues par les producteurs partenaires."
        badge={
          <Badge variant="forest" icon={<Compass className="w-3.5 h-3.5" />}>
            Flux Découverte Actif
          </Badge>
        }
      />

      {/* Vue principale interactive du Feed */}
      <FeedView
        initialItems={feedResult.items}
        totalCount={feedResult.totalCount}
        categories={categories}
        provinces={provinces}
      />
    </div>
  );
}
