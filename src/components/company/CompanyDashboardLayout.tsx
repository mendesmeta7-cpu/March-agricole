"use client";

import { useState } from "react";
import CompanySidebar from "@/components/company/CompanySidebar";
import CompanyHeader from "@/components/company/CompanyHeader";
import CompanyBottomNav from "@/components/company/CompanyBottomNav";
import Drawer from "@/components/ui/Drawer";

export interface CompanyDashboardLayoutProps {
  children: React.ReactNode;
  entityName?: string;
  userName?: string;
  userEmail?: string;
  locationInfo?: string;
  logoUrl?: string | null;
  unreadNotificationsCount?: number;
  pendingOrdersCount?: number;
}

export default function CompanyDashboardLayout({
  children,
  entityName,
  userName,
  userEmail,
  locationInfo,
  logoUrl,
  unreadNotificationsCount = 0,
  pendingOrdersCount = 0,
}: CompanyDashboardLayoutProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f9faf9] flex flex-col lg:flex-row antialiased text-gray-900">
      {/* 1. Sidebar Desktop permanente (écrans >= lg) avec les 8 sections officielles */}
      <aside className="hidden lg:flex lg:flex-shrink-0 sticky top-0 h-screen z-30">
        <CompanySidebar
          entityName={entityName}
          userName={userName}
          userEmail={userEmail}
          locationInfo={locationInfo}
          logoUrl={logoUrl}
          unreadNotificationsCount={unreadNotificationsCount}
          pendingOrdersCount={pendingOrdersCount}
        />
      </aside>

      {/* 2. Tiroir latéral mobile & tablette (composant Drawer R1) pour la navigation complète */}
      <Drawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        side="left"
        size="sm"
        showCloseButton={false}
        className="p-0 max-w-[288px] w-full"
        bodyClassName="p-0 overflow-hidden h-full"
      >
        <CompanySidebar
          entityName={entityName}
          userName={userName}
          userEmail={userEmail}
          locationInfo={locationInfo}
          logoUrl={logoUrl}
          unreadNotificationsCount={unreadNotificationsCount}
          pendingOrdersCount={pendingOrdersCount}
          onClose={() => setMobileDrawerOpen(false)}
        />
      </Drawer>

      {/* 3. Zone principale d'application */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header professionnel avec logo, salutation réelle, cloche et profil */}
        <CompanyHeader
          entityName={entityName}
          userName={userName}
          locationInfo={locationInfo}
          unreadNotificationsCount={unreadNotificationsCount}
          logoUrl={logoUrl}
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
        />

        {/* Contenu principal avec compensation d'espacement pour la Bottom Navigation */}
        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl w-full mx-auto pb-28 lg:pb-12">
          {children}
        </main>
      </div>

      {/* 4. Navigation mobile inférieure fluide avec tiroir 'Plus' */}
      <CompanyBottomNav
        unreadNotificationsCount={unreadNotificationsCount}
        pendingOrdersCount={pendingOrdersCount}
        entityName={entityName}
        userName={userName}
        userEmail={userEmail}
        logoUrl={logoUrl}
      />
    </div>
  );
}
