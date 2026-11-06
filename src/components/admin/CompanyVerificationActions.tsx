"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { setCompanyVerificationAction } from "@/lib/actions/admin/companies";

type VerificationStatus = "pending" | "verified" | "rejected";

interface CompanyVerificationActionsProps {
  companyId: string;
  companyName: string;
  status: VerificationStatus;
}

const ACTION_CONFIG: Record<
  VerificationStatus,
  {
    label: string;
    title: string;
    description: (name: string) => string;
    confirmText: string;
    variant: "success" | "destructive" | "warning";
    buttonVariant: "success" | "destructive" | "outline";
    icon: ReactNode;
  }
> = {
  verified: {
    label: "Vérifier",
    title: "Vérifier cette entreprise ?",
    description: (name) =>
      `« ${name} » recevra le badge d'entreprise vérifiée, affiché sur son profil public. L'opération est journalisée.`,
    confirmText: "Confirmer la vérification",
    variant: "success",
    buttonVariant: "success",
    icon: <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  rejected: {
    label: "Rejeter",
    title: "Rejeter la vérification ?",
    description: (name) =>
      `« ${name} » ne portera pas le badge d'entreprise vérifiée. Son compte reste actif. L'opération est journalisée.`,
    confirmText: "Confirmer le rejet",
    variant: "destructive",
    buttonVariant: "destructive",
    icon: <XCircle className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  pending: {
    label: "Remettre en attente",
    title: "Remettre en attente ?",
    description: (name) =>
      `Le statut de vérification de « ${name} » repassera à « En attente ». Le badge éventuel ne sera plus affiché. L'opération est journalisée.`,
    confirmText: "Remettre en attente",
    variant: "warning",
    buttonVariant: "outline",
    icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
  },
};

const AVAILABLE_TARGETS: Record<VerificationStatus, VerificationStatus[]> = {
  pending: ["verified", "rejected"],
  verified: ["pending", "rejected"],
  rejected: ["verified", "pending"],
};

export default function CompanyVerificationActions({
  companyId,
  companyName,
  status,
}: CompanyVerificationActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [target, setTarget] = useState<VerificationStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  const targets = AVAILABLE_TARGETS[status] ?? AVAILABLE_TARGETS.pending;
  const config = target ? ACTION_CONFIG[target] : null;

  const handleConfirm = () => {
    if (!target) return;
    const nextStatus = target;
    startTransition(async () => {
      try {
        const res = await setCompanyVerificationAction(companyId, nextStatus);
        if (res.success) {
          toast.success(res.message || "Statut de vérification mis à jour.");
          setTarget(null);
          router.refresh();
        } else {
          toast.error(res.error || "La mise à jour de la vérification a échoué.");
        }
      } catch {
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {targets.map((next) => {
          const action = ACTION_CONFIG[next];
          return (
            <Button
              key={next}
              type="button"
              size="xs"
              variant={action.buttonVariant}
              leftIcon={action.icon}
              disabled={isPending}
              onClick={() => setTarget(next)}
              aria-label={`${action.label} : ${companyName}`}
            >
              {action.label}
            </Button>
          );
        })}
      </div>

      {config && (
        <ConfirmDialog
          isOpen={target !== null}
          onClose={() => {
            if (!isPending) setTarget(null);
          }}
          onConfirm={handleConfirm}
          title={config.title}
          description={config.description(companyName)}
          confirmText={config.confirmText}
          variant={config.variant}
          isLoading={isPending}
        />
      )}
    </>
  );
}
