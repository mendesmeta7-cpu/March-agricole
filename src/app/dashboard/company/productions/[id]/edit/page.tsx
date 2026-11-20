import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect, notFound } from "next/navigation";
import { getProductionById } from "@/lib/queries/productions";
import { getCompanyProducts } from "@/lib/queries/products";
import ProductionForm from "@/components/productions/ProductionForm";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Modifier la production — Radiza" };

interface EditProductionPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Modification d'une production sur page dédiée (Lot UX/UI 5B, ADR-058). Même formulaire, mêmes
 * verrous (unité, statut, visibilité) et même action serveur (updateProductionAction) que l'ancien
 * tiroir. La production n'est lue que pour la société courante : sinon, page introuvable.
 */
export default async function EditCompanyProductionPage(props: EditProductionPageProps) {
  const { id } = await props.params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/company/productions/${encodeURIComponent(id)}/edit`);
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return <CompanyAccountMissing />;
  }

  const [production, companyProducts] = await Promise.all([
    getProductionById(id, companyId),
    getCompanyProducts(companyId),
  ]);

  if (!production) {
    notFound();
  }

  return <ProductionForm companyProducts={companyProducts} editingProduction={production} />;
}
