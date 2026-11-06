import { BadgeCheck, Clock, Eye, EyeOff, XCircle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { VERIFICATION_LABELS } from "@/components/admin/adminFormat";

export function CompanyVerificationBadge({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <Badge variant="success" size="sm" icon={<BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />}>
        {VERIFICATION_LABELS.verified}
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="danger" size="sm" icon={<XCircle className="w-3.5 h-3.5" aria-hidden="true" />}>
        {VERIFICATION_LABELS.rejected}
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size="sm" icon={<Clock className="w-3.5 h-3.5" aria-hidden="true" />}>
      {VERIFICATION_LABELS.pending}
    </Badge>
  );
}

export function ActiveStateBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge variant="forest" size="sm">
      Active
    </Badge>
  ) : (
    <Badge variant="neutral" size="sm">
      Désactivée
    </Badge>
  );
}

export function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return isPublic ? (
    <Badge variant="forest" size="sm" icon={<Eye className="w-3.5 h-3.5" aria-hidden="true" />}>
      Publique
    </Badge>
  ) : (
    <Badge variant="neutral" size="sm" icon={<EyeOff className="w-3.5 h-3.5" aria-hidden="true" />}>
      Privée
    </Badge>
  );
}
