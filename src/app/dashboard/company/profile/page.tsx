import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Building2, MapPin, Mail, Phone, ShieldCheck, Clock, User, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CompanyProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Profil fondateur
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role, created_at")
    .eq("id", user!.id)
    .single();

  // Données de l'entreprise
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, description, address, city, phone, email, verification_status, logo_url, created_at, provinces(name, code), countries(name, code)")
    .eq("created_by", user!.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/company" className="hover:text-forest-800 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
      </div>

      <PageHeader
        title="Profil de l'Entreprise Agricole"
        description="Consultez les informations juridiques, géographiques et les contacts de votre exploitation."
        badge={
          company?.verification_status === "verified" ? (
            <Badge variant="success">Vérifiée</Badge>
          ) : (
            <Badge variant="warning" icon={<Clock className="w-3 h-3" />}>En attente de vérification</Badge>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Identité de l'entreprise */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-forest-700" />
              Renseignements de l&apos;Exploitation
            </h2>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Raison Sociale</span>
                  <span className="font-semibold text-gray-900">{company?.name || "Non renseigné"}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Identifiant Slug</span>
                  <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded inline-block">
                    {company?.slug || "auto"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500 block uppercase font-medium">Description</span>
                <p className="text-gray-700 mt-1 leading-relaxed">
                  {company?.description || "Aucune description renseignée pour le moment."}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Email Professionnel</span>
                  <span className="text-gray-900 inline-flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {company?.email || user?.email}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-medium">Téléphone Siège</span>
                  <span className="text-gray-900 inline-flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {company?.phone || profile?.phone || "Non renseigné"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Localisation territoriale */}
          <Card padding="md">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-forest-700" />
              Implantation Géographique Réelle
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-xs text-gray-500 block uppercase font-medium">Pays</span>
                <span className="font-bold text-gray-900 mt-0.5 block">
                  {(company as any)?.countries?.name || "RDC"} ({(company as any)?.countries?.code || "COD"})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-xs text-gray-500 block uppercase font-medium">Province</span>
                <span className="font-bold text-forest-800 mt-0.5 block">
                  {(company as any)?.provinces?.name || "Province"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-xs text-gray-500 block uppercase font-medium">Ville / Territoire</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">
                  {company?.city || "Non spécifiée"}
                </span>
              </div>
            </div>

            {company?.address && (
              <div className="mt-4 pt-3 border-t border-gray-100 text-sm">
                <span className="text-xs text-gray-500 block uppercase font-medium">Adresse physique</span>
                <span className="text-gray-800">{company.address}</span>
              </div>
            )}
          </Card>
        </div>

        {/* Colonne droite : Gouvernance & Responsable */}
        <div className="space-y-6">
          <Card padding="md">
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <User className="w-5 h-5 text-forest-700" />
              Responsable de Compte
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-gray-500 block uppercase font-medium">Nom complet</span>
                <span className="font-semibold text-gray-900">{profile?.full_name}</span>
              </div>

              <div>
                <span className="text-xs text-gray-500 block uppercase font-medium">Rôle attribué</span>
                <span className="inline-flex items-center gap-1 text-forest-800 font-semibold mt-1">
                  <ShieldCheck className="w-4 h-4 text-forest-600" />
                  Owner (Fondateur)
                </span>
              </div>

              <div>
                <span className="text-xs text-gray-500 block uppercase font-medium">Identifiant de session</span>
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
