"use client";

import AppSidebar from "@/components/dashboard/AppSidebar";
import ResellerHeader from "@/components/reseller/ResellerHeader";
import ResellerBottomNav from "@/components/reseller/ResellerBottomNav";

interface ResellerDashboardLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  businessName?: string;
  locationInfo?: string;
  unreadNotificationsCount?: number;
}

export default function ResellerDashboardLayout({
  children,
  userName,
  userEmail,
  businessName,
  locationInfo,
  unreadNotificationsCount = 0,
}: ResellerDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f9faf9] flex flex-col lg:flex-row antialiased text-gray-900">
      {/* 1. Sidebar Desktop permanente (écrans >= lg) avec les 6 destinations */}
      <aside className="hidden lg:flex lg:flex-shrink-0 sticky top-0 h-screen z-30">
        <AppSidebar
          role="reseller"
          entityName={businessName}
          userName={userName}
          userEmail={userEmail}
          unreadNotificationsCount={unreadNotificationsCount}
        />
      </aside>

      {/* 2. Zone principale d'application */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header moderne & compact */}
        <ResellerHeader
          userName={userName}
          businessName={businessName}
          locationInfo={locationInfo}
          unreadNotificationsCount={unreadNotificationsCount}
        />

        {/* Contenu principal avec padding compensatoire pour la Bottom Navigation */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* 3. Navigation Inférieure Fixe Mobile & Tablette (6 entrées strictes) */}
      <ResellerBottomNav unreadNotificationsCount={unreadNotificationsCount} />
    </div>
  );
}
