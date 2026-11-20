"use client";

import { useEffect, useState } from "react";
import { Share2, Link2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { publicCampaignPath } from "@/lib/utils/publicCampaign";

interface CampaignShareActionsProps {
  campaignId: string;
  title: string;
  /** Taille des boutons (sm dans les tiroirs, md sur la page publique). */
  size?: "sm" | "md";
  className?: string;
}

/** Copie de secours quand l'API Presse-papiers est indisponible (contexte non sécurisé, refus). */
function copierParSelection(texte: string): boolean {
  const zone = document.createElement("textarea");
  zone.value = texte;
  zone.setAttribute("readonly", "");
  zone.style.position = "fixed";
  zone.style.opacity = "0";
  document.body.appendChild(zone);
  zone.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(zone);
  return ok;
}

/**
 * Partage d'une campagne (Lot UX/UI 5B, ADR-058, décision 5) : « Partager » ouvre le partage natif
 * de l'appareil quand il existe ; « Copier le lien » reste disponible et sert de solution de repli.
 * Aucun branchement propre à un réseau social : le lien partagé est l'adresse publique de la campagne.
 */
export default function CampaignShareActions({
  campaignId,
  title,
  size = "md",
  className,
}: CampaignShareActionsProps) {
  const { toast } = useToast();
  // Détecté après le montage : le rendu serveur ne connaît pas l'appareil.
  const [partageNatif, setPartageNatif] = useState(false);

  useEffect(() => {
    setPartageNatif(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const lien = () => `${window.location.origin}${publicCampaignPath(campaignId)}`;

  const copier = async () => {
    const url = lien();
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = copierParSelection(url);
    if (ok) {
      toast.success("Lien copié", "Collez-le dans une conversation ou une publication.");
    } else {
      toast.error("Copie impossible", `Copiez ce lien manuellement : ${url}`);
    }
  };

  const partager = async () => {
    try {
      await navigator.share({ title, text: `${title} — campagne sur Radiza`, url: lien() });
    } catch (err) {
      // Partage annulé par l'utilisateur : rien à signaler. Autre échec : repli sur la copie.
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copier();
    }
  };

  const tailleBouton = size === "sm" ? "sm" : "md";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {partageNatif && (
        <Button
          type="button"
          variant="primary"
          size={tailleBouton}
          onClick={partager}
          leftIcon={<Share2 className="w-4 h-4" aria-hidden="true" />}
          className="min-h-[44px]"
        >
          Partager
        </Button>
      )}
      <Button
        type="button"
        variant={partageNatif ? "outline" : "primary"}
        size={tailleBouton}
        onClick={copier}
        leftIcon={<Link2 className="w-4 h-4" aria-hidden="true" />}
        className="min-h-[44px]"
      >
        Copier le lien
      </Button>
    </div>
  );
}
