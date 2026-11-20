import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId, getCurrentProfile, getCurrentUser } from "@/lib/auth/currentCompany";
import { getPublicCampaign } from "@/lib/queries/publicCampaigns";
import { getResellerCampaignById } from "@/lib/queries/campaigns";
import { settleRead } from "@/lib/utils/settleRead";
import {
  publicCampaignPath,
  publicCampaignSummary,
  type PublicCampaign,
} from "@/lib/utils/publicCampaign";
import DataUnavailableNotice from "@/components/ui/DataUnavailableNotice";
import PublicCampaignView from "@/components/campaigns/PublicCampaignView";
import PublicCampaignOrderAction from "@/components/campaigns/PublicCampaignOrderAction";
import PublicCampaignHeader from "./PublicCampaignHeader";

interface PublicCampaignPageProps {
  params: Promise<{ id: string }>;
}

/** Image d'aperçu de remplacement (logo Radiza) quand la campagne n'a aucune image publique. */
const IMAGE_DE_REMPLACEMENT = { url: "/brand/radiza-og.png", width: 1200, height: 630 };

/**
 * Aperçu du lien partagé (ADR-058, décision 6) : titre, description et image publique de la
 * production, logo Radiza à défaut ; jamais d'information non publique. Non indexé.
 */
export async function generateMetadata(props: PublicCampaignPageProps): Promise<Metadata> {
  const { id } = await props.params;
  const robots = { index: false, follow: false };
  let campaign: PublicCampaign | null;
  try {
    campaign = await getPublicCampaign(id);
  } catch {
    // Panne de lecture : la page affiche l'écran d'erreur ; le titre reste neutre (jamais « indisponible »).
    return { title: "Campagne — Radiza", robots };
  }

  if (!campaign) {
    return { title: "Campagne indisponible — Radiza", robots };
  }

  const description = publicCampaignSummary(campaign);
  const image = campaign.image_url
    ? { url: campaign.image_url, alt: campaign.title }
    : { ...IMAGE_DE_REMPLACEMENT, alt: "Radiza" };
  const url = publicCampaignPath(campaign.id);

  return {
    title: `${campaign.title} — Radiza`,
    description,
    robots,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Radiza",
      locale: "fr_FR",
      url,
      title: campaign.title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: campaign.title,
      description,
      images: [image.url],
    },
  };
}

/**
 * Page de consultation d'une campagne (Lot UX/UI 5B, ADR-058), consultable sans connexion pour
 * les seules campagnes actives. La zone « Commander » dépend du visiteur : connexion pour un
 * visiteur, commande pour un revendeur éligible (mêmes règles que son espace), gestion pour la
 * société qui publie la campagne. Le contenu affiché est le même pour tous.
 */
export default async function PublicCampaignPage(props: PublicCampaignPageProps) {
  const { id } = await props.params;
  const campaign = await getPublicCampaign(id);

  if (!campaign) {
    notFound();
  }

  const user = await getCurrentUser();
  const action = await zoneDeCommande(campaign, user !== null);

  return (
    <div className="min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <PublicCampaignHeader connecte={user !== null} retour={publicCampaignPath(campaign.id)} />
        <main>
          <PublicCampaignView campaign={campaign} action={action} />
        </main>
      </div>
    </div>
  );
}

const lienPrincipal =
  "inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-forest-700 text-white hover:bg-forest-800 text-sm font-semibold transition-colors";
const lienSecondaire =
  "inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm font-semibold transition-colors";

async function zoneDeCommande(campaign: PublicCampaign, connecte: boolean): Promise<ReactNode> {
  const retour = publicCampaignPath(campaign.id);

  // Visiteur non connecté : la commande est réservée aux revendeurs connectés.
  if (!connecte) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-700 leading-relaxed">
          La commande est réservée aux revendeurs inscrits sur Radiza, dans les zones desservies par
          cette campagne.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href={`/login?redirect=${encodeURIComponent(retour)}`} className={lienPrincipal}>
            Se connecter pour commander
          </Link>
          <Link href="/register/reseller" className={lienSecondaire}>
            Créer un compte revendeur
          </Link>
        </div>
      </div>
    );
  }

  const profile = await getCurrentProfile();

  if (profile?.role === "reseller") {
    return zoneRevendeur(campaign.id);
  }

  if (profile?.role === "company") {
    const companyRead = await settleRead(getCurrentCompanyId(), null);
    if (companyRead.data && companyRead.data === campaign.company.id) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Votre société publie cette campagne.</p>
          <Link
            href={`/dashboard/company/campaigns?campagne=${encodeURIComponent(campaign.id)}`}
            className={lienPrincipal}
          >
            Gérer cette campagne
          </Link>
        </div>
      );
    }
  }

  return (
    <p className="text-sm text-gray-700 leading-relaxed">
      La commande est réservée aux revendeurs connectés, dans les zones desservies par cette campagne.
    </p>
  );
}

async function zoneRevendeur(campaignId: string): Promise<ReactNode> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { data: reseller, error: resellerError } = await supabase
    .from("resellers")
    .select("id, country_id, province_id, city, delivery_address, provinces(id, name, code), countries(id, name, code)")
    .eq("id", user!.id)
    .maybeSingle();

  // Sans localisation lisible, l'éligibilité serait fausse : jamais de « hors zone » par défaut.
  const campaignRead = resellerError
    ? { data: null, failed: true }
    : await settleRead(getResellerCampaignById(campaignId, reseller), null);

  if (campaignRead.failed) {
    return (
      <DataUnavailableNotice title="Commande momentanément indisponible">
        Les conditions de commande de cette campagne n&apos;ont pas pu être vérifiées. Réessayez dans
        quelques instants.
      </DataUnavailableNotice>
    );
  }

  if (!reseller) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          Complétez votre profil revendeur (province de livraison) pour commander.
        </p>
        <Link href="/dashboard/reseller" className={lienPrincipal}>
          Mon espace revendeur
        </Link>
      </div>
    );
  }

  if (!campaignRead.data) {
    return (
      <p className="text-sm text-gray-700">
        Cette campagne ne peut pas être commandée depuis votre compte pour le moment.
      </p>
    );
  }

  return (
    <PublicCampaignOrderAction
      campaign={campaignRead.data}
      resellerProvinceId={reseller.province_id ?? undefined}
      resellerProvinceName={(reseller.provinces as { name?: string } | null)?.name}
      defaultCity={reseller.city || ""}
      defaultAddress={reseller.delivery_address || ""}
    />
  );
}
