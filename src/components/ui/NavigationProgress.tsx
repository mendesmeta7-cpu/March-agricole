"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isInternalNavigation } from "@/lib/utils/navigationProgress";

type Phase = "hidden" | "start" | "growing" | "finishing";

/** Filet de sécurité : un lien sans changement d'URL ne laisse pas la barre affichée. */
const SAFETY_TIMEOUT_MS = 10000;
const FINISH_DURATION_MS = 200;

const PHASE_STYLES: Record<Exclude<Phase, "hidden">, { transform: string; transition: string }> = {
  start: { transform: "scaleX(0.1)", transition: "none" },
  growing: { transform: "scaleX(0.85)", transition: "transform 8s cubic-bezier(0.1, 0.7, 0.2, 1)" },
  finishing: { transform: "scaleX(1)", transition: `transform ${FINISH_DURATION_MS}ms ease-out` },
};

/** Fine barre affichée dès le clic sur un lien interne, jusqu'à l'arrivée sur la page. */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlKey = `${pathname}?${searchParams.toString()}`;
  const previousUrlKey = useRef(urlKey);
  const [phase, setPhase] = useState<Phase>("hidden");

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const internal = isInternalNavigation(
        {
          href: anchor.getAttribute("href"),
          target: anchor.getAttribute("target"),
          hasDownload: anchor.hasAttribute("download"),
          button: event.button,
          hasModifierKey: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
        },
        window.location.href
      );
      if (internal) setPhase("start");
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (previousUrlKey.current === urlKey) return;
    previousUrlKey.current = urlKey;
    setPhase((current) => (current === "hidden" ? current : "finishing"));
  }, [urlKey]);

  useEffect(() => {
    if (phase === "start") {
      const frame = requestAnimationFrame(() => setPhase("growing"));
      return () => cancelAnimationFrame(frame);
    }
    if (phase === "growing") {
      const timer = window.setTimeout(() => setPhase("hidden"), SAFETY_TIMEOUT_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "finishing") {
      const timer = window.setTimeout(() => setPhase("hidden"), FINISH_DURATION_MS);
      return () => window.clearTimeout(timer);
    }
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      data-navigation-progress
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[100] h-0.5 pointer-events-none"
    >
      <div className="h-full origin-left bg-forest-600" style={PHASE_STYLES[phase]} />
    </div>
  );
}
