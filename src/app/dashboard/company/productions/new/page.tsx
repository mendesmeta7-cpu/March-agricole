import { getCurrentCompanyId, getCurrentUser } from "@/lib/auth/currentCompany";
import CompanyAccountMissing from "@/components/company/CompanyAccountMissing";
import { redirect } from "next/navigation";
import { getCompanyProducts } from "@/lib/queries/products";
import ProductionForm from "@/components/productions/ProductionForm";
import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : titre d'onglet propre à la page.
export const metadata: Metadata = { title: "Nouvelle production — Radiza" };

/**
 * Déclaration d'une production sur page dédiée (Lot UX/UI 5B, ADR-058). Même formulaire, mêmes
 * contrôles et même action serveur (createProductionAction) que l'ancien tiroir. Sans la liste des
 * produits, le formulaire serait inutilisable : sa panne mène à la page d'erreur, jamais à un faux vide.
 */
export default async function NewCompanyProductionPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/company/productions/new");
  }

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return <CompanyAccountMissing />;
  }

  const companyProducts = await getCompanyProducts(companyId);

  return <ProductionForm companyProducts={companyProducts} />;
}
