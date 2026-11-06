"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, AlertCircle, Info, Calendar } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { CompanyCampaignItem } from "@/lib/queries/campaigns";
import { reopenCampaignAction } from "@/lib/actions/campaigns";
import {
  destinationsOpenAfterReopen,
  isEndDateExtensionRequired,
  todayUtc,
  validateReopenEndDate,
} from "@/lib/utils/campaignReopenRules";

interface ReopenCampaignDialogProps {
  campaign: CompanyCampaignItem;
  isOpen: boolean;
  onClose: () => void;
}

const ALL_EXPIRED_MESSAGE =
  "Réouverture impossible : toutes les destinations sont expirées. Reportez au moins une date limite de destination.";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(`${dateStr}T00:00:00`)
    );
  } catch {
    return dateStr;
  }
}

/**
 * D7 / A12 / A12-bis / C3 / D5 — réouverture d'une campagne clôturée ou expirée.
 * Les règles affichées et contrôlées ici sont le miroir de campaignReopenRules ;
 * public.reopen_campaign (migration 32) et ses triggers restent l'autorité.
 */
export default function ReopenCampaignDialog({ campaign, isOpen, onClose }: ReopenCampaignDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const baseId = useId();

  const destinations = useMemo(() => campaign.destinations ?? [], [campaign.destinations]);
  const today = todayUtc();
  const endDateRequired = isEndDateExtensionRequired(campaign.end_date, today);
  const allDestinationsExpired =
    destinations.length > 0 &&
    destinations.every((d) => d.order_deadline_date && d.order_deadline_date < today);

  const [newEndDate, setNewEndDate] = useState("");
  const [newDeadlines, setNewDeadlines] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewEndDate("");
      setNewDeadlines({});
      setSubmitted(false);
      setServerError(null);
    }
  }, [isOpen, campaign.id]);

  // Validation en ligne (miroir des règles D5, C3, A12-bis)
  const endDateError = validateReopenEndDate(campaign.end_date, newEndDate || null, today);
  const deadlineErrors: Record<string, string> = {};
  for (const [destId, value] of Object.entries(newDeadlines)) {
    if (value && value < today) {
      deadlineErrors[destId] = "La date limite reportée doit être au moins égale à aujourd'hui.";
    }
  }
  const filledDeadlines = Object.fromEntries(
    Object.entries(newDeadlines).filter(([, value]) => Boolean(value))
  ) as Record<string, string>;
  const destinationsError = destinationsOpenAfterReopen(destinations, filledDeadlines, today)
    ? null
    : ALL_EXPIRED_MESSAGE;
  const hasErrors = Boolean(endDateError || destinationsError || Object.keys(deadlineErrors).length > 0);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (hasErrors) return;

    const payload = Object.entries(filledDeadlines)
      .filter(([destId, value]) => {
        const current = destinations.find((d) => d.id === destId)?.order_deadline_date ?? null;
        return value !== current;
      })
      .map(([destinationId, orderDeadlineDate]) => ({ destinationId, orderDeadlineDate }));

    startTransition(async () => {
      try {
        const res = await reopenCampaignAction(campaign.id, newEndDate || null, payload);
        if (res.success) {
          toast.success("Campagne rouverte", { description: res.message });
          onClose();
          router.refresh();
        } else {
          setServerError(res.error || "La réouverture de la campagne a échoué.");
        }
      } catch {
        setServerError("Erreur de connexion. Veuillez réessayer.");
      }
    });
  };

  const endDateFieldId = `${baseId}-end-date`;
  const rulesId = `${baseId}-rules`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => !isPending && onClose()}
      isDismissable={!isPending}
      showCloseButton={!isPending}
      size="lg"
      icon={<RotateCcw className="w-5 h-5" />}
      title="Rouvrir la campagne"
      description={campaign.title}
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleSubmit()}
            isLoading={isPending}
            loadingText="Réouverture..."
            disabled={isPending}
          >
            Rouvrir la campagne
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div
          id={rulesId}
          className="p-3.5 rounded-2xl bg-forest-50/70 border border-forest-100 text-xs text-forest-950 space-y-1.5"
        >
          <p className="font-bold flex items-center gap-1.5">
            <Info className="w-4 h-4 text-forest-700 shrink-0" aria-hidden="true" />
            Règles de réouverture
          </p>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed text-forest-900">
            <li>
              Si la date de fin générale est dépassée, une nouvelle date est obligatoire : au moins égale à
              aujourd&apos;hui et strictement postérieure à l&apos;ancienne.
            </li>
            <li>
              Si la date de fin générale est encore valide, il n&apos;est pas nécessaire de la prolonger.
            </li>
            <li>
              Si toutes les destinations sont expirées, reportez la date limite d&apos;au moins une destination
              (au moins égale à aujourd&apos;hui).
            </li>
            <li>
              Le volume de la campagne est revérifié : la production doit être récoltée et disposer d&apos;un
              volume suffisant.
            </li>
          </ul>
        </div>

        <FormField
          label="Nouvelle date de fin générale"
          htmlFor={endDateFieldId}
          required={endDateRequired}
          optional={!endDateRequired}
          description={
            endDateRequired
              ? `La date de fin actuelle (${formatDate(campaign.end_date)}) est dépassée : une nouvelle date est obligatoire.`
              : campaign.end_date
              ? `Date de fin actuelle : ${formatDate(campaign.end_date)} (encore valide). Laissez vide pour la conserver.`
              : "Aucune date de fin générale. Laissez vide pour conserver une campagne sans date de fin."
          }
          error={submitted ? endDateError : null}
        >
          <Input
            id={endDateFieldId}
            type="date"
            min={campaign.end_date && campaign.end_date >= today ? campaign.end_date : today}
            value={newEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
            required={endDateRequired}
            error={submitted && Boolean(endDateError)}
            aria-describedby={rulesId}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
        </FormField>

        {destinations.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-xs sm:text-sm font-semibold text-gray-800">
              Dates limites de commande par destination
              {allDestinationsExpired && <span className="text-rose-500 ml-1 font-bold">*</span>}
            </legend>
            <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
              {allDestinationsExpired
                ? "Toutes les destinations sont expirées : reportez la date limite d'au moins une destination."
                : "Facultatif : reportez la date limite des destinations que vous souhaitez rouvrir."}
            </p>
            <div className="space-y-2.5">
              {destinations.map((dest) => {
                const fieldId = `${baseId}-dest-${dest.id}`;
                const isExpired = Boolean(dest.order_deadline_date && dest.order_deadline_date < today);
                const fieldError = submitted ? deadlineErrors[dest.id] ?? null : null;
                return (
                  <div
                    key={dest.id}
                    className={`p-3 rounded-xl border ${
                      isExpired ? "bg-rose-50/40 border-rose-200/80" : "bg-white border-gray-200"
                    }`}
                  >
                    <FormField
                      label={`${dest.city_name}${dest.provinces?.name ? ` (${dest.provinces.name})` : ""}`}
                      htmlFor={fieldId}
                      optional
                      description={
                        dest.order_deadline_date
                          ? `Date limite actuelle : ${formatDate(dest.order_deadline_date)}${
                              isExpired ? " — expirée" : " — encore ouverte"
                            }`
                          : "Sans date limite (destination ouverte)"
                      }
                      error={fieldError}
                    >
                      <Input
                        id={fieldId}
                        type="date"
                        min={today}
                        value={newDeadlines[dest.id] ?? ""}
                        onChange={(e) =>
                          setNewDeadlines((prev) => ({ ...prev, [dest.id]: e.target.value }))
                        }
                        error={Boolean(fieldError)}
                        inputSize="sm"
                      />
                    </FormField>
                  </div>
                );
              })}
            </div>
            {submitted && destinationsError && (
              <p role="alert" className="flex items-start gap-1.5 text-xs text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                {destinationsError}
              </p>
            )}
          </fieldset>
        )}

        {serverError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Soumission par la touche Entrée */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Rouvrir
        </button>
      </form>
    </Dialog>
  );
}
