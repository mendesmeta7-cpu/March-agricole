import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Rubrique parente affichée dans le fil d'Ariane (libellé identique au menu, ADR-055). */
export interface BreadcrumbItem {
  href: string;
  label: string;
}

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  /**
   * Fil d'Ariane (Lot UX/UI 6B, fiche NAV-02) : rubriques parentes, de la plus haute à la plus
   * proche. La page courante (le titre) termine le fil sans lien.
   */
  breadcrumb?: BreadcrumbItem[];
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Page courante, sans lien, qui termine le fil. */
  current: string;
  className?: string;
}

/**
 * Fil d'Ariane commun (Lot UX/UI 6B, NAV-02) : rubriques parentes avec lien, puis la page courante.
 * Exporté au Lot 7 pour les profils Société et Revendeur, qui ont leur propre carte d'en-tête (PRO-03).
 */
export function Breadcrumb({ items, current, className }: BreadcrumbProps) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Fil d'Ariane" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs sm:text-sm text-gray-600">
        {items.map((item) => (
          <li key={item.href} className="flex items-center gap-1.5 min-w-0">
            {/* Zone tactile de 44 px sous 640 px sans agrandir le dessin (marges négatives) */}
            <Link
              href={item.href}
              className="inline-flex items-center max-sm:min-h-11 max-sm:-my-3 font-medium hover:text-forest-800 hover:underline underline-offset-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-1"
            >
              {item.label}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-hidden="true" />
          </li>
        ))}
        <li aria-current="page" className="min-w-0 truncate font-semibold text-gray-900">
          {current}
        </li>
      </ol>
    </nav>
  );
}

/**
 * En-tête commun des pages connectées (Lot UX/UI 6B, NAV-02) : fil d'Ariane, titre (seul h1 de
 * la page), description courte, badge et action principale. Le bandeau sombre reste réservé au
 * tableau de bord.
 */
export default function PageHeader({
  title,
  description,
  badge,
  action,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <div className="pb-4 sm:pb-6 border-b border-gray-200/80 mb-4 sm:mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb items={breadcrumb} current={title} className="mb-2 sm:mb-3" />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-950 leading-snug">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-xs sm:text-sm text-gray-600 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0 w-full sm:w-auto flex items-center">{action}</div>}
      </div>
    </div>
  );
}
