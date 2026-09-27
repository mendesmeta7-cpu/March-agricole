"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Megaphone } from "lucide-react";

interface FeedHighlightBannerProps {
  campaignsCount?: number;
}

export default function FeedHighlightBanner({
  campaignsCount = 0,
}: FeedHighlightBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-800 via-forest-700 to-forest-900 text-white shadow-sm p-5 sm:p-7">
      {/* Motifs géométriques subtils en arrière-plan */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-forest-600/30 blur-2xl pointer-events-none" />
      <div className="absolute right-12 top-2 w-32 h-32 rounded-full bg-emerald-400/15 blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-semibold text-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Récoltes & Disponibilités réelles</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            {campaignsCount > 0
              ? `${campaignsCount} offre${campaignsCount > 1 ? "s" : ""} commerciale${campaignsCount > 1 ? "s" : ""}`
              : "Productions & Cultures"}
          </h2>

          <p className="text-xs sm:text-sm text-forest-100/90 leading-relaxed">
            {campaignsCount > 0
              ? "Commandez directement auprès des exploitations agricoles partenaires avec réservation immédiate de vos volumes."
              : "Découvrez les productions en culture et récoltées, et transmettez vos expressions de besoin aux producteurs."}
          </p>
        </div>

        <div className="flex-shrink-0 pt-1 sm:pt-0">
          <Link
            href="/dashboard/reseller/campaigns"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-forest-900 font-bold text-xs sm:text-sm hover:bg-forest-50 active:scale-97 transition-all shadow-md group"
          >
            <Megaphone className="w-4 h-4 text-forest-700" />
            <span>Voir les offres</span>
            <ArrowRight className="w-4 h-4 text-forest-700 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
