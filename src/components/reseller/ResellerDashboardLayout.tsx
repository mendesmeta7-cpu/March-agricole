"use client";

import { useState } from "react";
import ResellerSidebar from "@/components/reseller/ResellerSidebar";
import ResellerHeader from "@/components/reseller/ResellerHeader";
import ResellerBottomNav from "@/components/reseller/ResellerBottomNav";
import Drawer from "@/components/ui/Drawer";

interface ResellerDashboardLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  businessName?: string;
  locationInfo?: string;
  unreadNotificationsCount?: number;
  avatarUrl?: string | null;
}

export default function ResellerDashboardLayout({
  children,
  userName,
  userEmail,
  businessName,
  locationInfo,
  unreadNotificationsCount = 0,
  avatarUrl,
}: ResellerDashboardLayoutProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f9faf9] flex flex-col lg:flex-row antialiased text-gray-900">
      {/* 1. Sidebar Desktop permanente (écrans >= lg) avec les 6 destinations obligatoires */}
      <aside className="hidden lg:flex lg:flex-shrink-0 sticky top-0 h-screen z-30">
        <ResellerSidebar
          businessName={businessName}
          userName={userName}
          userEmail={userEmail}
          locationInfo={locationInfo}
          logoUrl={avatarUrl}
          unreadNotificationsCount={unreadNotificationsCount}
        />
      </aside>

      {/* 2. Tiroir latéral de navigation pour mobile & tablette (composant Drawer R1) */}
      <Drawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        side="left"
        size="sm"
        showCloseButton={false}
        className="p-0 max-w-[288px] w-full"
        bodyClassName="p-0 overflow-hidden h-full"
      >
        <ResellerSidebar
          businessName={businessName}
          userName={userName}
          userEmail={userEmail}
          locationInfo={locationInfo}
          logoUrl={avatarUrl}
          unreadNotificationsCount={unreadNotificationsCount}
          onClose={() => setMobileDrawerOpen(false)}
        />
      </Drawer>

      {/* 3. Zone principale d'application */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header moderne avec logo, salutation, cloche réelle, profil et menu */}
        <ResellerHeader
          userName={userName}
          businessName={businessName}
          locationInfo={locationInfo}
          unreadNotificationsCount={unreadNotificationsCount}
          avatarUrl={avatarUrl}
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
        />

        {/* Contenu principal avec padding compensatoire généreux pour la Bottom Navigation */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl w-full mx-auto pb-28 lg:pb-12">
          {children}
        </main>
      </div>

      {/* 4. Navigation Inférieure Fixe Mobile & Tablette (6 entrées strictes avec labels intégraux) */}
      <ResellerBottomNav unreadNotificationsCount={unreadNotificationsCount} />
    </div>
  );
}
