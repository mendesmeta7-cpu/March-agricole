import { DemandStatus } from "@/lib/queries/demands";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

interface DemandStatusBadgeProps {
  status: DemandStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  DemandStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  active: {
    label: "Active",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: Clock,
  },
  converted: {
    label: "Convertie en commande",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Annulée",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: XCircle,
  },
  expired: {
    label: "Expirée",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    icon: AlertCircle,
  },
};

export default function DemandStatusBadge({
  status,
  size = "sm",
}: DemandStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const Icon = config.icon;

  const sizeClasses =
    size === "sm"
      ? "text-xs px-2.5 py-0.5 gap-1.5"
      : "text-sm px-3 py-1 gap-2";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <Icon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {config.label}
    </span>
  );
}
