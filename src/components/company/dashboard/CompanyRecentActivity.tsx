"use client";

import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  ChevronRight,
  ArrowRight,
  MapPin,
  Calendar,
} from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import type { DemandItem } from "@/lib/queries/demands";
import type { OrderDetail } from "@/lib/queries/orders";

export interface CompanyRecentActivityProps {
  recentDemands: DemandItem[];
  recentOrders: OrderDetail[];
}

export default function CompanyRecentActivity({
  recentDemands,
  recentOrders,
}: CompanyRecentActivityProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── 1. Dernières Demandes du Marché ────────────────────────── */}
      <section className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs flex flex-col justify-between space-y-5">
        <div>
          {/* Header carte */}
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-900 ring-4 ring-blue-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-950">
                  Dernières Demandes du Marché
                </h3>
                <p className="text-xs text-gray-500">
                  Besoins d&apos;approvisionnement exprimés par les revendeurs.
                </p>
              </div>
            </div>

            <Link href="/dashboard/company/demands">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-forest-700 hover:text-forest-800 hover:bg-forest-50/60"
              >
                <span>Tout voir</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </Link>
          </div>

          {/* Contenu */}
          {recentDemands.length === 0 ? (
            <div className="py-8">
              <EmptyState
                title="Aucune demande récente"
                description="Les opportunités d'achat formulées par les revendeurs apparaîtront ici dès leur publication."
                icon={<TrendingUp className="w-6 h-6 text-gray-400" />}
                className="bg-gray-50/40 rounded-2xl border border-gray-100 py-8"
              />
            </div>
          ) : (
            <div className="space-y-2.5 mt-4">
              {recentDemands.slice(0, 4).map((d) => (
                <div
                  key={d.id}
                  className="group p-3.5 rounded-2xl border border-gray-200/60 hover:border-forest-200 bg-gray-50/40 hover:bg-white hover:shadow-2xs transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-forest-100/80 text-forest-900 group-hover:bg-forest-200/80 flex items-center justify-center shrink-0 transition-colors">
                      <Package className="w-4 h-4 stroke-[2.2]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-950 truncate group-hover:text-forest-900 transition-colors">
                          {d.product?.name || "Produit agricole"}
                        </span>
                        {d.province?.name && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                            <MapPin className="w-2.5 h-2.5" />
                            {d.province.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="font-extrabold text-forest-900">
                          {d.quantity.toLocaleString("fr-FR")} {d.unit}
                        </span>
                        <span className="text-gray-300">&bull;</span>
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "numeric",
                            month: "short",
                          }).format(new Date(d.created_at))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link href={`/dashboard/company/demands/${d.id}`} className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 px-3 rounded-xl border-gray-200 hover:border-forest-600 hover:text-forest-900"
                    >
                      <span>Consulter</span>
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer carte */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>{recentDemands.length} opportunité(s) de marché active(s)</span>
          <Link
            href="/dashboard/company/demands"
            className="font-bold text-forest-700 hover:text-forest-800 inline-flex items-center gap-1 group"
          >
            <span>Analyse territoriale</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ── 2. Dernières Commandes Fermes ───────────────────────────── */}
      <section className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs flex flex-col justify-between space-y-5">
        <div>
          {/* Header carte */}
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-900 ring-4 ring-purple-50 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-950">
                  Dernières Commandes Reçues
                </h3>
                <p className="text-xs text-gray-500">
                  Engagements fermes passés sur vos offres commerciales.
                </p>
              </div>
            </div>

            <Link href="/dashboard/company/orders">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-forest-700 hover:text-forest-800 hover:bg-forest-50/60"
              >
                <span>Tout voir</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </Link>
          </div>

          {/* Contenu */}
          {recentOrders.length === 0 ? (
            <div className="py-8">
              <EmptyState
                title="Aucune commande enregistrée"
                description="Les commandes réservées par les revendeurs lors de vos campagnes de vente apparaîtront ici."
                icon={<ShoppingBag className="w-6 h-6 text-gray-400" />}
                className="bg-gray-50/40 rounded-2xl border border-gray-100 py-8"
              />
            </div>
          ) : (
            <div className="space-y-2.5 mt-4">
              {recentOrders.slice(0, 4).map((order) => {
                const formattedAmount = new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: order.currency || "USD",
                }).format(order.total_amount);

                return (
                  <div
                    key={order.id}
                    className="group p-3.5 rounded-2xl border border-gray-200/60 hover:border-purple-200 bg-gray-50/40 hover:bg-white hover:shadow-2xs transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-900 group-hover:bg-purple-200/80 flex items-center justify-center shrink-0 font-bold text-xs transition-colors">
                        #
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-950 truncate">
                            {order.order_number}
                          </span>
                          <OrderStatusBadge status={order.status} size="sm" compact />
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span className="font-semibold text-gray-900 truncate">
                            {order.reseller?.business_name || "Revendeur"}
                          </span>
                          <span className="text-gray-300">&bull;</span>
                          <span className="font-bold text-forest-900">
                            {formattedAmount}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link href={`/dashboard/company/orders/${order.id}`} className="shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 px-3 rounded-xl border-gray-200 hover:border-purple-600 hover:text-purple-900"
                      >
                        <span>Détails</span>
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer carte */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>{recentOrders.length} commande(s) répertoriée(s)</span>
          <Link
            href="/dashboard/company/orders"
            className="font-bold text-forest-700 hover:text-forest-800 inline-flex items-center gap-1 group"
          >
            <span>Suivi des commandes</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
