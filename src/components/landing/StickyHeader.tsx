"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

export default function StickyHeader() {
  const [visible, setVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;

          // Détermine si on est tout en haut
          setAtTop(currentY < 8);

          if (currentY < lastScrollY.current || currentY < 60) {
            // Scroll vers le haut → on affiche
            setVisible(true);
          } else if (currentY > lastScrollY.current && currentY > 60) {
            // Scroll vers le bas → on cache
            setVisible(false);
          }

          lastScrollY.current = currentY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={[
        "w-full border-b border-forest-100/80 bg-white/85 backdrop-blur-md z-50",
        "fixed top-0 left-0 right-0",
        "transition-transform duration-300 ease-in-out",
        !atTop ? "shadow-sm" : "",
        visible ? "translate-y-0" : "-translate-y-full",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Logo Radiza */}
        <div className="flex items-center">
          {/* Compact sur mobile (< sm), horizontal sur tablette+ */}
          <Link
            href="/"
            className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 rounded-lg"
            aria-label="Accueil Radiza"
          >
            <span className="sm:hidden">
              <BrandLogo variant="compact" height={36} priority />
            </span>
            <span className="hidden sm:inline-flex">
              <BrandLogo variant="horizontal" height={38} priority />
            </span>
          </Link>
        </div>

        {/* Deux CTA principaux */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-forest-900 hover:text-forest-950 hover:bg-forest-100/70 border border-transparent transition-all min-h-[40px] sm:min-h-[44px]"
          >
            <LogIn className="w-4 h-4 text-forest-700" />
            <span>Se connecter</span>
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all min-h-[40px] sm:min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Créer un compte</span>
            <span className="sm:hidden">Créer</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
