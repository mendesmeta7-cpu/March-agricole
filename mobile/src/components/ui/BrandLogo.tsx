import { Image } from "expo-image";

import compactLogo from "../../../assets/brand/radiza-compact.svg";
import horizontalLogo from "../../../assets/brand/radiza-horizontal.svg";

/** Rapports largeur / hauteur des logos (viewBox 995×320 et 1024×1024, PROJECT_CONTEXT.md §10). */
const RATIO = { horizontal: 995 / 320, compact: 1 } as const;

export interface BrandLogoProps {
  variant?: "horizontal" | "compact";
  height?: number;
}

/** Logo Radiza : fichiers SVG du Web copiés sans modification ; proportions conservées. */
export function BrandLogo({ variant = "horizontal", height = 40 }: BrandLogoProps) {
  return (
    <Image
      source={variant === "horizontal" ? horizontalLogo : compactLogo}
      style={{ height, width: height * RATIO[variant] }}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel="Radiza"
    />
  );
}
