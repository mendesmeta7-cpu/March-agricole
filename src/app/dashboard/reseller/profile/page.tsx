import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Store, MapPin, Mail, Phone, ShieldCheck, User, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

export default async function ResellerProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Données du profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role, created_at")
    .eq("id", user!.id)
    .single();

  // 2. Données de l'activité revendeur
  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, business_name, reseller_type, city, delivery_address, created_at, provinces(name, code), countries(name, code)")
    .eq("id", user!.id)
    .maybeSingle();

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

          {/* Territoire d'opération pivot */}
          <Card padding="md">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-earth-700" />
              Territoire d&apos;Opération Pivot (Éligibilité aux Campagnes)
            </h2>

            <p className="text-xs text-gray-500 mb-4">
              Ce territoire détermine automatiquement votre éligibilité à la commande sur les campagnes de vente publiées par les producteurs agricoles.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-xs text-gray-500 block uppercase font-medium">Pays</span>
                <span className="font-bold text-gray-900 mt-0.5 block">
                  {(reseller as any)?.countries?.name || "RDC"} ({(reseller as any)?.countries?.code || "COD"})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-earth-50 border border-earth-100">
                <span className="text-xs text-earth-700 block uppercase font-medium">Province Clé</span>
                <span className="font-bold text-earth-900 mt-0.5 block">
                  {(reseller as any)?.provinces?.name || "Province"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-xs text-gray-500 block uppercase font-medium">Ville / Siège</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">
                  {reseller?.city || "Non spécifiée"}
                </span>
              </div>
            </div>

            {reseller?.delivery_address && (
              <div className="mt-4 pt-3 border-t border-gray-100 text-sm">
                <span className="text-xs text-gray-500 block uppercase font-medium">Adresse habituelle de livraison</span>
                <span className="text-gray-800">{reseller.delivery_address}</span>
              </div>
            )}
          </Card>
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
