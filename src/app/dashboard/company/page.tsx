import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  Package,
  Tractor,
  Megaphone,
  ShoppingBag,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default async function CompanyDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Récupération des données réelles de l'entreprise
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, description, address, city, phone, email, verification_status, logo_url, provinces(name), countries(name)")
    .eq("created_by", user!.id)
    .maybeSingle();

  // 2. Comptages réels depuis les tables de la base de données
  let productsCount = 0;
  let productionsCount = 0;
  let campaignsCount = 0;
  let ordersCount = 0;

  if (company?.id) {
    const [pRes, prRes, cRes, oRes] = await Promise.all([
      supabase.from("company_products").select("*", { count: "exact", head: true }).eq("company_id", company.id),
      supabase.from("productions").select("*", { count: "exact", head: true }).eq("company_id", company.id),
      supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("company_id", company.id),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("company_id", company.id),
    ]);

    productsCount = pRes.count || 0;
    productionsCount = prRes.count || 0;
    campaignsCount = cRes.count || 0;
    ordersCount = oRes.count || 0;
  }

  const verificationBadge = company?.verification_status === "verified" ? (
    <Badge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
      Entreprise Vérifiée
    </Badge>
  ) : (
    <Badge variant="warning" icon={<Clock className="w-3.5 h-3.5" />}>
      Vérification administrative en attente
    </Badge>
  );

  return (
    <div className="space-y-8">
      {/* En-tête de la page */}
      <PageHeader
        title={company?.name || "Tableau de Bord"}
        description="Supervisez votre exploitation agricole, vos produits configurés, vos récoltes et vos engagements de vente."
        badge={verificationBadge}
        action={
          <Badge variant="forest" size="md" className="w-full sm:w-auto justify-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Compte Producteur Actif
          </Badge>
        }
      />

      {/* Cartouche d'identité et de localisation de l'exploitation */}
      <Card padding="md" className="border-forest-100 bg-gradient-to-r from-white to-forest-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-forest-100 border border-forest-200/80 flex items-center justify-center text-forest-800 flex-shrink-0 shadow-xs overflow-hidden relative">
              {company?.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name || "Logo"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {company?.name || "Exploitation Agricole"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 line-clamp-2">
                {company?.description || "Aucune description enregistrée pour cette entreprise."}
              </p>
              <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                <span className="inline-flex items-center gap-1 font-medium text-forest-900">
                  <MapPin className="w-3.5 h-3.5 text-forest-600 flex-shrink-0" />
                  <span>{(company as any)?.provinces?.name || "Province"}, {(company as any)?.countries?.name || "RDC"}</span>
                </span>
                {company?.city && <span className="truncate">Ville : {company.city}</span>}
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/company/profile"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all shadow-2xs whitespace-nowrap min-h-[44px]"
          >
            Gérer le profil & logo &rarr;
          </Link>
        </div>
      </Card>

      {/* Métriques réelles (Comptages issus de la base de données) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-sm sm:text-base font-bold text-gray-900">
            Aperçu de l&apos;Exploitation (Données Réelles)
          </h2>
          <span className="text-xs text-gray-500">
            Comptabilisation en temps réel sans données simulées
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Produits Configurés"
            value={productsCount}
            icon={<Package className="w-5 h-5 text-forest-700" />}
            variant="forest"
            helper={productsCount === 0 ? "Aucun produit associé" : `${productsCount} produit(s)`}
          />
          <StatCard
            label="Productions & Récoltes"
            value={productionsCount}
            icon={<Tractor className="w-5 h-5 text-forest-700" />}
            variant="forest"
            helper={productionsCount === 0 ? "0 récolte déclarée" : `${productionsCount} récolte(s)`}
          />
          <StatCard
            label="Campagnes Commerciales"
            value={campaignsCount}
            icon={<Megaphone className="w-5 h-5 text-amber-700" />}
            variant="amber"
            helper={campaignsCount === 0 ? "0 campagne lancée" : `${campaignsCount} campagne(s)`}
          />
          <StatCard
            label="Commandes Fermes"
            value={ordersCount}
            icon={<ShoppingBag className="w-5 h-5 text-gray-700" />}
            variant="default"
            helper={ordersCount === 0 ? "0 commande reçue" : `${ordersCount} commande(s)`}
          />
        </div>
      </div>

      {/* Grille des états réels sans données fictives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Module Produits (Actif - Phase 4) */}
        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-forest-700 flex-shrink-0" />
                Catalogue de vos Produits
              </h3>
              <Badge variant="success" size="sm">Actif</Badge>
            </div>
            {productsCount === 0 ? (
              <EmptyState
                title="Vous n'avez configuré aucun produit"
                description="Sélectionnez dans le catalogue national les denrées que vous cultivez ou ajoutez un nouveau produit pour préparer vos déclarations de récoltes."
                className="py-4 sm:py-6 bg-forest-50/20"
              />
            ) : (
              <p className="text-xs sm:text-sm text-gray-600">Vous avez {productsCount} produit(s) configuré(s) pour votre exploitation.</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <Link
              href="/dashboard/company/products"
              className="text-xs font-semibold text-forest-700 hover:text-forest-800 inline-flex items-center gap-1 min-h-[38px] items-center"
            >
              Gérer mes produits
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Module Productions (Actif - Phase 5) */}
        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <Tractor className="w-4 h-4 text-forest-700 flex-shrink-0" />
                Productions & Récoltes Déclarées
              </h3>
              <Badge variant="success" size="sm">Actif</Badge>
            </div>
            {productionsCount === 0 ? (
              <EmptyState
                title="Aucune production enregistrée"
                description="Déclarez vos cycles culturaux (volumes prévisionnels, calendrier cultural, photographies de parcelles) pour préparer vos futures campagnes."
                className="py-4 sm:py-6 bg-forest-50/20"
              />
            ) : (
              <p className="text-xs sm:text-sm text-gray-600">Vous avez {productionsCount} cycle(s) de production enregistré(s).</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <Link
              href="/dashboard/company/productions"
              className="text-xs font-semibold text-forest-700 hover:text-forest-800 inline-flex items-center gap-1 min-h-[38px] items-center"
            >
              Gérer mes productions
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Module Campagnes Commerciales (Actif - Phase 9) */}
        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-forest-700 flex-shrink-0" />
                Campagnes Commerciales
              </h3>
              <Badge variant="success" size="sm">Actif</Badge>
            </div>
            {campaignsCount === 0 ? (
              <EmptyState
                title="Aucune campagne active"
                description="Lancez votre première offre de vente en fixant vos prix par unité, volumes et provinces desservies."
                className="py-4 sm:py-6 bg-forest-50/20"
              />
            ) : (
              <p className="text-xs sm:text-sm text-gray-600">Vous avez {campaignsCount} campagne(s) commerciale(s) enregistrée(s).</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <Link
              href="/dashboard/company/campaigns"
              className="text-xs font-semibold text-forest-700 hover:text-forest-800 inline-flex items-center gap-1 min-h-[38px] items-center"
            >
              Gérer mes campagnes
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Module Commandes Reçues (Actif - Phase 10) */}
        <Card padding="md" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-forest-700 flex-shrink-0" />
                Commandes Reçues & Réservations
              </h3>
              <Badge variant="success" size="sm">Actif</Badge>
            </div>
            {ordersCount === 0 ? (
              <EmptyState
                title="Aucune commande reçue pour l'instant"
                description="Les engagements fermes et les réservations de stocks effectués par les revendeurs sur vos campagnes s'afficheront ici."
                className="py-4 sm:py-6 bg-forest-50/20"
              />
            ) : (
              <p className="text-xs sm:text-sm text-gray-600">Vous avez {ordersCount} commande(s) d&apos;achat ferme(s) enregistrée(s).</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <Link
              href="/dashboard/company/orders"
              className="text-xs font-semibold text-forest-700 hover:text-forest-800 inline-flex items-center gap-1 min-h-[38px] items-center"
            >
              Gérer mes commandes
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

