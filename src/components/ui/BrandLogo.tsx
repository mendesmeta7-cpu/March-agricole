/**
 * BrandLogo — Composant centralisé de la marque Radiza.
 *
 * Variantes :
 *   - "horizontal" : logo complet symbole + nom (viewBox 995×320, ratio ~3.11:1)
 *     Utilisation : header desktop/tablette, grands espaces de branding.
 *   - "compact"    : symbole seul (viewBox 1024×1024, ratio 1:1)
 *     Utilisation : mobile, drawers, petits espaces, formulaires.
 *
 * Exemples :
 *   <BrandLogo variant="horizontal" />              // h=38px, w calculé auto
 *   <BrandLogo variant="compact" height={32} />     // h=32px, w=32px
 *   <BrandLogo variant="horizontal" className="…" />
 */

import Image from "next/image";

export type BrandLogoVariant = "horizontal" | "compact";

export interface BrandLogoProps {
  /** Variante du logo : "horizontal" (défaut) ou "compact". */
  variant?: BrandLogoVariant;
  /**
   * Hauteur souhaitée en pixels (la largeur est calculée automatiquement
   * selon le ratio SVG réel pour éviter toute déformation).
   * Valeurs recommandées :
   *   - horizontal : 36–40 px (header desktop/tablette)
   *   - compact    : 28–36 px (header mobile, drawers)
   */
  height?: number;
  /** Classes CSS supplémentaires. */
  className?: string;
  /**
   * Priorité de chargement Next.js Image.
   * Mettre à true pour les logos above-the-fold (headers, login, landing).
   */
  priority?: boolean;
}

// Dimensions SVG réelles issues des viewBox des fichiers fournis.
// horizontal : viewBox="0 0 995 320"
// compact    : viewBox="0 0 1024 1024"
const LOGO_DIMS = {
  horizontal: { w: 995, h: 320 },
  compact:    { w: 1024, h: 1024 },
} as const;

const LOGO_PATHS: Record<BrandLogoVariant, string> = {
  horizontal: "/brand/radiza-horizontal.svg",
  compact:    "/brand/radiza-compact.svg",
};

const DEFAULT_HEIGHTS: Record<BrandLogoVariant, number> = {
  horizontal: 38,
  compact:    36,
};

export default function BrandLogo({
  variant   = "horizontal",
  height,
  className = "",
  priority  = false,
}: BrandLogoProps) {
  const h    = height ?? DEFAULT_HEIGHTS[variant];
  const dims = LOGO_DIMS[variant];
  // Largeur proportionnelle au ratio réel — jamais de déformation.
  const w    = Math.round((h * dims.w) / dims.h);

  return (
    <Image
      src={LOGO_PATHS[variant]}
      alt="Radiza"
      width={w}
      height={h}
      priority={priority}
      className={`block object-contain flex-shrink-0 ${className}`.trim()}
      // style width:auto est prioritaire pour que la balise reste responsive
      // même si le conteneur est plus petit que la largeur calculée.
      style={{ width: "auto", height: `${h}px`, maxWidth: "100%" }}
    />
  );
}
