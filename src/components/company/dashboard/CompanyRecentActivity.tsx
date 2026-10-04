"use client";

import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  ArrowRight,
  Package,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { DemandItem } from "@/lib/queries/demands";
import { OrderDetail, OrderStatus } from "@/lib/queries/orders";

export interface CompanyRecentActivityProps {
  recentDemands: DemandItem[];
  recentOrders: OrderDetail[];
}

export default function CompanyRecentActivity({
  recentDemands,
  recentOrders,
}: CompanyRecentActivityProps) {
  // Helper pour formater les statuts de commande
  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning" size="sm">En attente</Badge>;
      case "confirmed":
        return <Badge variant="forest" size="sm">Confirmée</Badge>;
      case "preparing":
        return <Badge variant="earth" size="sm">En préparation</Badge>;
      case "ready":
        return <Badge variant="forest" size="sm">Prête</Badge>;
      case "delivered":
        return <Badge variant="success" size="sm">Livrée</Badge>;
      case "cancelled":
        return <Badge variant="danger" size="sm">Annulée</Badge>;
      default:
        return <Badge size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Dernières Demandes du Marché */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-950">
                  Dernières Demandes du Marché
                </h3>
                <p className="text-xs text-gray-500">
                  Besoins récemment exprimés par les acheteurs.
                </p>
              </div>
            </div>

            <Link href="/dashboard/company/demands">
              <Button variant="ghost" size="sm" className="text-xs text-forest-700">
                Tout voir &rarr;
              </Button>
            </Link>
          </div>

          {recentDemands.length === 0 ? (
            <EmptyState
              title="Aucune demande récente"
              description="Les demandes formulées par les revendeurs s'afficheront ici."
              icon={<TrendingUp className="w-6 h-6 text-gray-400" />}
              className="py-8 bg-gray-50/40"
            />
          ) : (
            <div className="space-y-3 mt-4">
              {recentDemands.slice(0, 4).map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-2xl border border-gray-100 hover:border-forest-200/80 bg-gray-50/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-gray-950 truncate">
                          {d.product?.name || "Produit"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          ({d.province?.name || "Province"})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span className="font-extrabold text-forest-800">
                          {d.quantity} {d.unit}
                        </span>
                        <span>&bull;</span>
                        <span>
                          {new Intl.DateTimeFormat("fr-FR", {
                            day: "numeric",
                            month: "short",
                          }).format(new Date(d.created_at))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link href={`/dashboard/company/demands/${d.id}`}>
                    <Button variant="outline" size="sm" className="text-xs shrink-0">
                      <span>Consulter</span>
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
          <span>{recentDemands.length} demande(s) active(s) répertoriée(s)</span>
          <Link
            href="/dashboard/company/demands"
            className="font-semibold text-forest-700 hover:text-forest-800"
          >
            Explorer la demande &rarr;
          </Link>
        </div>
      </div>

      {/* 2. Dernières Commandes Reçues */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-7 shadow-xs flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-950">
                  Dernières Commandes Fermes
                </h3>
                <p className="text-xs text-gray-500">
                  Engagements confirmés avec stocks réservés.
                </p>
              </div>
            </div>

            <Link href="/dashboard/company/orders">
              <Button variant="ghost" size="sm" className="text-xs text-forest-700">
                Tout voir &rarr;
              </Button>
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState
              title="Aucune commande enregistrée"
              description="Les commandes passées par les revendeurs lors de vos campagnes s'afficheront ici."
              icon={<ShoppingBag className="w-6 h-6 text-gray-400" />}
              className="py-8 bg-gray-50/40"
            />
          ) : (
            <div className="space-y-3 mt-4">
              {recentOrders.slice(0, 4).map((order) => {
                const formattedAmount = new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: order.currency || "USD",
                }).format(order.total_amount);

                return (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-2xl border border-gray-100 hover:border-purple-200/80 bg-gray-50/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 font-bold text-xs">
                        #
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-gray-950 truncate">
                            {order.order_number}
                          </span>
                          {getOrderStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                          <span className="truncate">
                            {order.reseller?.business_name || "Revendeur"}
                          </span>
                          <span>&bull;</span>
                          <span className="font-bold text-gray-900">
                            {formattedAmount}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link href={`/dashboard/company/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="text-xs shrink-0">
                        <span>Détails</span>
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
          <span>{recentOrders.length} commande(s) enregistrée(s) au total</span>
          <Link
            href="/dashboard/company/orders"
            className="font-semibold text-purple-700 hover:text-purple-800"
          >
            Gestion des commandes &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
