import { useState, useRef, useTransition, useMemo } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Province } from "@/lib/queries/geography";
import { createProductionDemandAction } from "@/lib/actions/demands";
import Select from "@/components/ui/Select";
import { TrendingUp, AlertCircle, MapPin, Scale, Calendar, Building2, FileText, Info, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { formatQuantityWithUnit } from "@/lib/utils/numberFormat";

interface ProductionDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  production: {
    id: string;
    title: string;
    unit: string;
    expected_quantity: number;
    status: string;
    company_name?: string;
    product_name?: string;
    main_image_url?: string;
  };
  provinces: Province[];
  defaultProvinceId?: string;
  onSuccess?: (message: string) => void;
}

export default function ProductionDemandModal({
  isOpen,
  onClose,
  production,
  provinces,
  defaultProvinceId,
  onSuccess,
}: ProductionDemandModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [quantity, setQuantity] = useState("");
  const [provinceId, setProvinceId] = useState(defaultProvinceId || provinces[0]?.id || "");
  const [city, setCity] = useState("");
  const [targetPeriodStart, setTargetPeriodStart] = useState("");
  const [notes, setNotes] = useState("");

  const provinceOptions = useMemo(() => {
    return provinces.map((p) => ({
      value: p.id,
      label: p.name,
    }));
  }, [provinces]);


  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(formRef.current || undefined);
    formData.set("production_id", production.id);

    startTransition(async () => {
      const res = await createProductionDemandAction(formData);

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage("Votre demande d'approvisionnement a été transmise à la société avec succès !");
        onSuccess?.(res.message || "Demande transmise avec succès !");
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    });
  };

  const statusLabels: Record<string, { label: string; bg: string }> = {
    growing: { label: "En cours de culture", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    harvested: { label: "Récoltée / Disponible", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  };

  const currentStatusBadge = statusLabels[production.status] || {
    label: production.status,
    bg: "bg-gray-50 text-gray-700 border-gray-200",
  };

  // Lot UX/UI 5B : surface partagée Drawer (focus, Échap, verrouillage compté du défilement).
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      isDismissable={!isPending}
      showCloseButton={!isPending}
      icon={<TrendingUp className="w-5 h-5" />}
      title={"Faire une demande sur cette production"}
      description={"Signalez à la société votre intention d'achat sur cette récolte."}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-all"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="production-demand-form"
            disabled={isPending || !quantity}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Transmission...
              </>
            ) : (
              <>
                <TrendingUp className="w-3.5 h-3.5" />
                Envoyer ma demande
              </>
            )}
          </button>
        </>
      }
    >
        {/* Info Production */}
        <div className="px-4 py-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-center gap-3.5">
          {production.main_image_url ? (
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-200">
              <Image
                src={production.main_image_url}
                alt={production.title}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
              🌱
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-900 truncate">{production.title}</h3>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${currentStatusBadge.bg}`}>
                {currentStatusBadge.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
              {production.company_name && (
                <span className="flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 text-gray-400" /> {production.company_name}
                </span>
              )}
              <span>•</span>
              <span>Volume total : {formatQuantityWithUnit(production.expected_quantity, production.unit)}</span>
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form id="production-demand-form" ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="flex-1 leading-relaxed font-semibold">{successMessage}</div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-[11px] flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div className="leading-relaxed">
              Votre demande sera transmise à la société pour l&apos;aider à planifier sa logistique et ses futures campagnes commerciales.
            </div>
          </div>

          {/* Quantité souhaitée */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">
              Volume / Quantité souhaitée ({production.unit}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="quantity"
                required
                min="0.01"
                step="any"
                placeholder="Ex: 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full pl-9 pr-14 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all font-semibold"
              />
              <Scale className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                {production.unit}
              </span>
            </div>
          </div>

          {/* Province de livraison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Province de destination <span className="text-rose-500">*</span>
              </label>
              <Select
                name="province_id"
                required
                value={provinceId}
                onChange={(e) => setProvinceId(e.target.value)}
                options={provinceOptions}
                searchable={provinces.length > 5}
                searchPlaceholder="Rechercher une province..."
                leftIcon={<MapPin className="w-4 h-4 text-gray-400" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-800">
                Ville / Localité exacte (optionnel)
              </label>
              <input
                type="text"
                name="city"
                placeholder="Ex: Lubumbashi Centre"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          {/* Date / Période d'approvisionnement souhaitée */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">
              Période de livraison souhaitée (optionnel)
            </label>
            <div className="relative">
              <input
                type="date"
                name="target_period_start"
                value={targetPeriodStart}
                onChange={(e) => setTargetPeriodStart(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Notes / Précisions */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-800">
              Notes ou spécifications pour la société (optionnel)
            </label>
            <div className="relative">
              <textarea
                name="notes"
                rows={3}
                placeholder="Ex: Nous disposons de nos propres camions frigorifiques et cherchons un approvisionnement régulier..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all resize-none"
              />
              <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
        </form>
    </Drawer>
  );
}
