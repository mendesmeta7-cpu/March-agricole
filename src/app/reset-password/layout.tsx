import type { Metadata } from "next";

// Lot UX/UI 6B (NAV-04) : la page est un composant client et ne peut pas déclarer de métadonnées ;
// ce gabarit transparent porte son titre d'onglet.
export const metadata: Metadata = { title: "Nouveau mot de passe — Radiza" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
