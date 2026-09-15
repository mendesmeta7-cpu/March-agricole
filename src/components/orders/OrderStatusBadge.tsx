import { OrderStatus } from "@/lib/queries/orders";
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  CheckCheck,
  XCircle,
} from "lucide-react";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
}

export default function OrderStatusBadge({
  status,
  size = "md",
}: OrderStatusBadgeProps) {
  const configMap: Record<
    OrderStatus,
    { label: string; icon: React.ReactNode; className: string }
  > = {
    pending: {
      label: "En attente de confirmation",
      icon: <Clock className="w-3.5 h-3.5" />,
      className: "bg-amber-50 text-amber-800 border-amber-200/80",
    },
    confirmed: {
      label: "Confirmée par l'exploitation",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      className: "bg-blue-50 text-blue-800 border-blue-200/80",
    },
    preparing: {
      label: "En cours de préparation",
      icon: <Package className="w-3.5 h-3.5" />,
      className: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
    },
    ready: {
      label: "Prête pour retrait / expédition",
      icon: <Truck className="w-3.5 h-3.5" />,
      className: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    },
    delivered: {
      label: "Livrée / Réceptionnée",
      icon: <CheckCheck className="w-3.5 h-3.5" />,
      className: "bg-forest-50 text-forest-900 border-forest-200/80",
    },
    cancelled: {
      label: "Annulée",
      icon: <XCircle className="w-3.5 h-3.5" />,
      className: "bg-rose-50 text-rose-800 border-rose-200/80",
    },
  };

  const current = configMap[status] || configMap.pending;
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg border ${padding} ${current.className}`}
    >
      {current.icon}
      {current.label}
    </span>
  );
}
