"use client";

import { useState, useEffect } from "react";
import AppSidebar from "@/components/dashboard/AppSidebar";
import AppHeader from "@/components/dashboard/AppHeader";
import { X } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "company" | "reseller" | "admin";
  entityName?: string;
  userName?: string;
  userEmail?: string;
  locationInfo?: string;
}

export default function DashboardLayout({
  children,
  role,
  entityName,
  userName,
  userEmail,
  locationInfo,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verrouillage du scroll sur le body lorsque le menu mobile est ouvert
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Fermeture du menu avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row antialiased">
      {/* 1. Sidebar Desktop permanente (écrans >= lg) */}
      <aside className="hidden lg:flex lg:flex-shrink-0 sticky top-0 h-screen z-30">
        <AppSidebar
          role={role}
          entityName={entityName}
          userName={userName}
          userEmail={userEmail}
        />
      </aside>

      {/* 2. Tiroir Mobile (Drawer) avec backdrop overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop avec flou */}
          <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Tiroir coulissant */}
          <div className="relative flex-1 flex flex-col max-w-[280px] xs:max-w-xs w-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200 h-full">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-3.5 right-3.5 p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 z-20 transition-colors"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>

            <AppSidebar
              role={role}
              entityName={entityName}
              userName={userName}
              userEmail={userEmail}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 3. Zone principale de contenu */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          role={role}
          entityName={entityName}
          userName={userName}
          locationInfo={locationInfo}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
