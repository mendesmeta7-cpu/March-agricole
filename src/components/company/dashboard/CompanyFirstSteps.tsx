import Link from "next/link";
import { CheckCircle2, Circle, AlertCircle, ArrowRight } from "lucide-react";
import { buttonClassName } from "@/components/ui/Button";

/**
 * Premiers pas de la société (Lot UX/UI 6B, fiche NAV-05, décision D2).
 *
 * Trois étapes, dans l'ordre des règles existantes (un produit du catalogue, une production,
 * puis une campagne), calculées à partir des données réellement lues côté serveur :
 * - `done: true`  → l'étape est faite ;
 * - `done: false` → l'étape reste à faire ;
 * - `done: null`  → la lecture a échoué : l'état est « indisponible », jamais « à faire ».
 * Le bloc disparaît quand les trois étapes sont faites.
 */
export interface FirstStep {
  key: "product" | "production" | "campaign";
  label: string;
  actionLabel: string;
  href: string;
  done: boolean | null;
}

export default function CompanyFirstSteps({ steps }: { steps: FirstStep[] }) {
  if (steps.every((s) => s.done === true)) return null;

  const doneCount = steps.filter((s) => s.done === true).length;
  // Prochaine action : la première étape à faire (une étape indisponible n'est pas proposée)
  const next = steps.find((s) => s.done === false);

  return (
    <section
      aria-labelledby="premiers-pas-titre"
      className="rounded-3xl border border-forest-200/80 bg-white p-4 sm:p-6 shadow-xs space-y-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="premiers-pas-titre" className="text-base sm:text-lg font-bold text-gray-950">
          Premiers pas sur Radiza
        </h2>
        <p className="text-xs font-semibold text-gray-600">
          {doneCount} étape{doneCount > 1 ? "s" : ""} sur {steps.length} terminée{doneCount > 1 ? "s" : ""}
        </p>
      </div>

      <ol className="space-y-2">
        {steps.map((step, index) => {
          const isNext = next?.key === step.key;
          return (
            <li
              key={step.key}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl border p-3 ${
                isNext ? "border-forest-300 bg-forest-50/70" : "border-gray-200/80 bg-gray-50/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {step.done === true ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" aria-hidden="true" />
                ) : step.done === null ? (
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-700" aria-hidden="true" />
                ) : (
                  <Circle className="w-5 h-5 shrink-0 text-gray-400" aria-hidden="true" />
                )}
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">
                    {index + 1}. {step.label}
                  </span>
                  <span
                    className={`ml-1.5 text-xs font-semibold ${
                      step.done === true
                        ? "text-emerald-800"
                        : step.done === null
                        ? "text-amber-800"
                        : "text-gray-600"
                    }`}
                  >
                    {step.done === true ? "Fait" : step.done === null ? "État indisponible" : "À faire"}
                  </span>
                </p>
              </div>
              {isNext && (
                <Link
                  href={step.href}
                  className={buttonClassName({ variant: "primary", size: "sm", className: "shrink-0 gap-1.5 self-start sm:self-auto" })}
                >
                  {step.actionLabel}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
