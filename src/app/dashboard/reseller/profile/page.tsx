import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ResellerProfileTerritoryCard from "@/components/reseller/ResellerProfileTerritoryCard";
import { Store, Mail, Phone, ShieldCheck, User, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ResellerProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Données du profil et de l'activité revendeur + liste des provinces
  const [profileRes, resellerRes, provincesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, role, created_at")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("resellers")
      .select("id, business_name, province_id, reseller_type, city, delivery_address, created_at, provinces(id, name, code), countries(name, code)")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("provinces")
      .select("id, country_id, code, name")
      .order("name"),
  ]);

  const profile = profileRes.data;
  const reseller = resellerRes.data;
  const provinces = provincesRes.data || [];

  const resellerTypeLabels: Record<string, string> = {
    wholesaler: "Grossiste",
    semi_wholesaler: "Demi-grossiste",
    retailer: "Détaillant",
    processor: "Transformateur agro-alimentaire",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/reseller" className="hover:text-earth-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil revendeur
        </Link>
      </div>

      <PageHeader
        title="Profil de l'Acheteur Professionnel"
        description="Consultez votre territoire d'opération pivot, votre typologie commerciale et vos coordonnées de livraison."
        badge={
          <Badge variant="earth">
            {resellerTypeLabels[reseller?.reseller_type || "wholesaler"] || "Acheteur Professionnel"}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Renseignements commerciaux & Territoire */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <Store className="w-5 h-5 text-earth-700" />
              Établissement Commercial
            </h2>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Dénomination Commerciale</span>
                  <span className="font-semibold text-gray-900">{reseller?.business_name || profile?.full_name || "Non renseignée"}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Typologie d&apos;Achat</span>
                  <span className="font-semibold text-earth-800">
                    {resellerTypeLabels[reseller?.reseller_type || "wholesaler"] || "Acheteur"}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Email Professionnel</span>
                  <span className="text-gray-900 inline-flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {user?.email}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Téléphone Contact</span>
                  <span className="text-gray-900 inline-flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {profile?.phone || "Non renseigné"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Territoire d'opération pivot modifiable avec avertissement */}
          <ResellerProfileTerritoryCard
            provinces={provinces}
            currentProvinceId={reseller?.province_id}
            currentProvinceName={(reseller as any)?.provinces?.name}
            currentCountryName={(reseller as any)?.countries?.name}
            currentCountryCode={(reseller as any)?.countries?.code}
            currentCity={reseller?.city || undefined}
            currentAddress={reseller?.delivery_address || undefined}
          />
        </div>

        {/* Colonne droite : Compte & Statut */}
        <div className="space-y-6">
          <Card padding="md">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <User className="w-5 h-5 text-earth-700" />
              Compte Utilisateur
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-gray-500 block uppercase font-medium">Titulaire</span>
                <span className="font-semibold text-gray-900">{profile?.full_name}</span>
              </div>

              <div>
                <span className="text-xs text-gray-500 block uppercase font-medium">Rôle Système</span>
                <span className="inline-flex items-center gap-1 text-earth-800 font-semibold mt-1">
                  <ShieldCheck className="w-4 h-4 text-earth-600" />
                  Revendeur (Acheteur Pro)
                </span>
              </div>

              <div>
                <span className="text-xs text-gray-500 block uppercase font-medium">Identifiant unique</span>
                <span className="font-mono text-[11px] text-gray-500 truncate block">
                  {user?.id}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
