import { createClient } from "@/lib/supabase/server";
import { getPublicFeedProductions } from "@/lib/queries/feed";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import FeedView from "@/components/feed/FeedView";
import {
  Compass,
  Store,
  MapPin,
  Megaphone,
  TrendingUp,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default async function ResellerDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Récupération du profil et de l'acheteur
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", user!.id)
    .single();

  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, business_name, reseller_type, city, delivery_address, provinces(name, code), countries(name, code)")
    .eq("id", user!.id)
    .maybeSingle();

  // 2. Récupération des productions publiques réelles pour le feed
  const feedResult = await getPublicFeedProductions();

  // 3. Catégories distinctes depuis products (actifs)
  const { data: categoriesData } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true);

  const categories = Array.from(
    new Set((categoriesData || []).map((p: any) => p.category).filter(Boolean))
  ).sort() as string[];

  // 4. Provinces actives
  const { data: provincesData } = await supabase
    .from("provinces")
    .select("id, name")
    .order("name", { ascending: true });

  const provinces = (provincesData || []).map((p: any) => ({
    id: p.id,
    name: p.name,
  }));

  // 5. Comptage d'offres et demandes pour les raccourcis
  const [cRes, dRes, oRes] = await Promise.all([
    supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("demands").select("*", { count: "exact", head: true }).eq("reseller_id", user!.id),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("reseller_id", user!.id),
  ]);

  const campaignsCount = cRes.count || 0;
  const demandsCount = dRes.count || 0;
  const ordersCount = oRes.count || 0;

  const resellerTypeLabels: Record<string, string> = {
    wholesaler: "Grossiste",
    semi_wholesaler: "Demi-grossiste",
    retailer: "Détaillant",
    processor: "Transformateur agro-alimentaire",
  };

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <PageHeader
        title="Flux des Productions Agricoles"
        description="Explorez en temps réel les récoltes et cultures des producteurs partenaires de votre territoire et d'autres provinces."
        badge={
          <Badge variant="forest" icon={<Compass className="w-3.5 h-3.5" />}>
            Flux Découverte Actif
          </Badge>
        }
        action={
          <div className="flex items-center gap-2">
            <Badge variant="earth" size="md">
              {resellerTypeLabels[reseller?.reseller_type || "wholesaler"] || "Acheteur"}
            </Badge>
            <Badge variant="forest" size="md" className="hidden sm:inline-flex">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Acheteur Qualifié
            </Badge>
          </div>
        }
      />

      {/* Bandeau d'information Acheteur & Territoire */}
      <div className="bg-gradient-to-r from-earth-50/50 via-white to-forest-50/30 p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-earth-100 border border-earth-200/80 flex items-center justify-center text-earth-800 flex-shrink-0 shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {reseller?.business_name || profile?.full_name || "Espace Acheteur"}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap mt-0.5">
                <span className="inline-flex items-center gap-1 font-semibold text-earth-900 bg-earth-100/80 px-2 py-0.5 rounded-md">
                  <MapPin className="w-3 h-3 text-earth-700 flex-shrink-0" />
                  <span>
                    {(reseller as any)?.provinces?.name || "Province"}, {(reseller as any)?.countries?.name || "RDC"}
                  </span>
                </span>
                {reseller?.city && <span>&bull; Ville : {reseller.city}</span>}
              </div>
            </div>
          </div>

          {/* Raccourcis rapides */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link
              href="/dashboard/reseller/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-forest-700 hover:bg-forest-50 hover:border-forest-200 transition-colors shadow-2xs"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Offres Commerciales ({campaignsCount})</span>
            </Link>
            <Link
              href="/dashboard/reseller/demands"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-earth-700 hover:bg-earth-50 hover:border-earth-200 transition-colors shadow-2xs"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Mes Demandes ({demandsCount})</span>
            </Link>
            <Link
              href="/dashboard/reseller/orders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Mes Commandes ({ordersCount})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Vue principale du Flux des Productions */}
      <FeedView
        initialItems={feedResult.items}
        totalCount={feedResult.totalCount}
        categories={categories}
        provinces={provinces}
      />
    </div>
  );
}
