import type { Metadata } from "next";

/**
 * Pages de consultation des campagnes (Lot UX/UI 5B, ADR-058, décision 6) : non indexées par les
 * moteurs de recherche au lancement, sans empêcher leur consultation ni leur partage. Posé sur le
 * segment pour couvrir aussi l'écran « Campagne indisponible ».
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
