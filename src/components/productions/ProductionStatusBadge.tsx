import { ProductionStatus } from "@/lib/queries/productions";
import { Clock, Sprout, CheckCircle2, Ban, FileEdit } from "lucide-react";

interface ProductionStatusBadgeProps {
  status: ProductionStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  ProductionStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  draft: {
    label: "Brouillon",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    icon: FileEdit,
  },
  planned: {
    label: "Planifiée",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: Clock,
  },
  growing: {
    label: "En culture",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: Sprout,
  },
  harvested: {
    label: "Récoltée",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Annulée",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    icon: Ban,
  },
};

export default function ProductionStatusBadge({
  status,
  size = "sm",
}: ProductionStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
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
