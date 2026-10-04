"use client";

import Link from "next/link";
import {
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  PlusCircle,
  Megaphone,
  User,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export interface CompanyDashboardHeaderProps {
  companyName: string;
  userName?: string;
  verificationStatus: "verified" | "pending_verification" | "unverified";
  locationInfo?: string;
  logoUrl?: string | null;
}

export default function CompanyDashboardHeader({
  companyName,
  userName,
  verificationStatus,
  locationInfo,
  logoUrl,
}: CompanyDashboardHeaderProps) {
  // Formatage déterministe de la date courante en français
  const todayFormatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const capitalizedDate =
    todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <div className="bg-white rounded-3xl border border-forest-100 p-5 sm:p-7 shadow-xs relative overflow-hidden">
      {/* Halo végétal décoratif discret */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-forest-50/60 to-transparent rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
        {/* Identité de l'exploitation & Salutation */}
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-forest-100 border border-forest-200/80 flex items-center justify-center text-forest-800 shrink-0 shadow-xs overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-7 h-7 sm:w-8 sm:h-8" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight truncate">
                {companyName}
              </h1>
              {verificationStatus === "verified" ? (
                <Badge
                  variant="success"
                  size="sm"
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Exploitation Vérifiée
                </Badge>
              ) : (
                <Badge
                  variant="warning"
                  size="sm"
                  icon={<Clock className="w-3.5 h-3.5" />}
                >
                  Vérification en cours
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-4 mt-1.5 text-xs text-gray-600 flex-wrap">
              <span className="inline-flex items-center gap-1 font-medium text-forest-900">
                <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                <span>{locationInfo || "RDC"}</span>
              </span>

              <span className="inline-flex items-center gap-1 text-gray-500">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{capitalizedDate}</span>
              </span>

              {userName && (
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">Gérant : {userName}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Raccourcis d'actions rapides métier */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <Link href="/dashboard/company/productions">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
            >
              <PlusCircle className="w-4 h-4 mr-1.5 text-forest-700" />
              <span>Gérer Productions</span>
            </Button>
          </Link>

          <Link href="/dashboard/company/campaigns">
            <Button
              variant="primary"
              size="sm"
              className="w-full sm:w-auto shadow-2xs"
            >
              <Megaphone className="w-4 h-4 mr-1.5" />
              <span>Campagnes de Vente</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
