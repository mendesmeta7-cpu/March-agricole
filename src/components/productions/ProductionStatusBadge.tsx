import { ProductionStatus } from "@/lib/queries/productions";
import { Clock, Sprout, CheckCircle2, Ban, FileEdit, Megaphone } from "lucide-react";

interface ProductionStatusBadgeProps {
  status: ProductionStatus;
  size?: "sm" | "md";
  className?: string;
}

const STATUS_CONFIG: Record<
  ProductionStatus,
  { label: string; bg: string; text: string; border: string; dot: string; icon: any }
> = {
  draft: {
    label: "Brouillon",
    bg: "bg-gray-100/90",
    text: "text-gray-700",
    border: "border-gray-200",
    dot: "bg-gray-400",
    icon: FileEdit,
  },
  planned: {
    label: "Planifiée",
    bg: "bg-blue-50/90",
    text: "text-blue-700",
    border: "border-blue-200/80",
    dot: "bg-blue-500",
    icon: Clock,
  },
  growing: {
    label: "En culture",
    bg: "bg-emerald-50/95",
    text: "text-emerald-800",
    border: "border-emerald-200/90",
    dot: "bg-emerald-500",
    icon: Sprout,
  },
  harvested: {
    label: "Récoltée",
    bg: "bg-amber-50/95",
    text: "text-amber-800",
    border: "border-amber-200/90",
    dot: "bg-amber-500",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Annulée",
    bg: "bg-rose-50/90",
    text: "text-rose-700",
    border: "border-rose-200/80",
    dot: "bg-rose-400",
    icon: Ban,
  },
};

export default function ProductionStatusBadge({
  status,
  size = "sm",
  className = "",
}: ProductionStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  const Icon = config.icon;

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2.5 py-0.5 gap-1.5 font-semibold"
      : "text-xs px-3 py-1 gap-2 font-bold";

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs backdrop-blur-xs ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Badge distinctif signalant qu'une campagne commerciale est active sur cette production
 */
export function CampaignActiveBadge({
  size = "sm",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const sizeClasses =
    size === "sm"
      ? "text-[10px] px-2 py-0.5 gap-1 font-bold"
      : "text-xs px-2.5 py-1 gap-1.5 font-bold";

  return (
    <span
      className={`inline-flex items-center rounded-full bg-forest-800/90 text-emerald-200 border border-emerald-500/40 shadow-xs backdrop-blur-md ${sizeClasses} ${className}`}
      title="Cette production est associée à une offre commerciale active ouverte aux commandes."
    >
      <Megaphone className={size === "sm" ? "w-3 h-3 text-emerald-300" : "w-3.5 h-3.5 text-emerald-300"} />
      <span>Campagne active</span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
    </span>
  );
}
