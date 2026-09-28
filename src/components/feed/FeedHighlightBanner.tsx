"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Megaphone, ChevronLeft, ChevronRight } from "lucide-react";
import { FeedBannerItem } from "@/lib/queries/feedBanners";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinaryUrl";

interface FeedHighlightBannerProps {
  campaignsCount?: number;
  banners?: FeedBannerItem[];
}

export default function FeedHighlightBanner({
  campaignsCount = 0,
  banners = [],
}: FeedHighlightBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const activeBanners = banners.filter((b) => b.is_active);
  const totalSlides = activeBanners.length;

  // Défilement automatique toutes les 5 secondes (crossfade fluide)
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(interval);
  }, [totalSlides, isPaused]);

  const handleNext = () => {
    if (totalSlides > 1) {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }
  };

  const handlePrev = () => {
    if (totalSlides > 1) {
      setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    }
  };

  // Support swipe tactile mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  // 1. Fallback si aucune bannière administrée n'est active en base :
  // Affichage de la grande bannière verte officielle initiale
  if (totalSlides === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-800 via-forest-700 to-forest-900 text-white shadow-sm p-5 sm:p-7">
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

  // 2. Carrousel dynamique avec les bannières Cloudinary administrées
  return (
    <div
      className="relative overflow-hidden rounded-3xl text-white shadow-sm group/carousel select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Conteneur principal avec hauteur fixe adaptative */}
      <div className="relative w-full h-[190px] sm:h-[220px]">
        {activeBanners.map((banner, index) => {
          const isActive = index === currentIndex;
          const optimizedBg = getOptimizedCloudinaryUrl(banner.image_url, {
            width: 1400,
            crop: "limit",
            quality: "auto",
            format: "auto",
          });

          return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Image d'arrière-plan Cloudinary — absolute pour ne pas pousser le texte hors du conteneur */}
              <img
                src={optimizedBg}
                alt={banner.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
              />

              {/* Overlay sombre dégradé élégant pour lisibilité parfaite */}
              <div className="absolute inset-0 bg-gradient-to-r from-forest-950/90 via-forest-900/75 to-transparent sm:to-black/30" />

              {/* Contenu textuel */}
              <div className="relative z-10 h-full p-5 sm:p-7 flex flex-col justify-between">
                <div className="space-y-1.5 max-w-lg">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-semibold text-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                    <span>À la une</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                    {banner.title}
                  </h2>

                  {banner.subtitle && (
                    <p className="text-xs sm:text-sm text-forest-100/90 leading-relaxed line-clamp-2 sm:line-clamp-3">
                      {banner.subtitle}
                    </p>
                  )}
                </div>

                {banner.button_label && banner.button_label.trim() !== "" && (
                  <div className="pt-3">
                    {banner.button_url && /^https?:\/\//i.test(banner.button_url) ? (
                      <a
                        href={banner.button_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-forest-900 font-bold text-xs sm:text-sm hover:bg-forest-50 active:scale-97 transition-all shadow-md group"
                      >
                        <Megaphone className="w-4 h-4 text-forest-700" />
                        <span>{banner.button_label}</span>
                        <ArrowRight className="w-4 h-4 text-forest-700 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    ) : (
                      <Link
                        href={banner.button_url || "/dashboard/reseller/campaigns"}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-forest-900 font-bold text-xs sm:text-sm hover:bg-forest-50 active:scale-97 transition-all shadow-md group"
                      >
                        <Megaphone className="w-4 h-4 text-forest-700" />
                        <span>{banner.button_label}</span>
                        <ArrowRight className="w-4 h-4 text-forest-700 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Flèches de navigation manuelles discrètes */}
      {totalSlides > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer hidden sm:flex"
            aria-label="Bannière précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer hidden sm:flex"
            aria-label="Bannière suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicateurs de pagination discrets (● ○ ○) */}
      {totalSlides > 1 && (
        <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-full backdrop-blur-xs">
          {activeBanners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all duration-300 cursor-pointer ${
                i === currentIndex
                  ? "w-4 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
              }`}
              aria-label={`Aller au slide ${i + 1}`}
              aria-current={i === currentIndex ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
