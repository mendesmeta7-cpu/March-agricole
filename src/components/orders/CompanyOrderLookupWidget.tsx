"use client";

import { useState, useTransition } from "react";
import { lookupOrderForDeliveryAction, LookupDeliveryOrderResult } from "@/lib/actions/orders";
import QRScannerModal from "./QRScannerModal";
import DeliveryConfirmationModal from "./DeliveryConfirmationModal";
import { Camera, Search, AlertCircle, QrCode, Sparkles } from "lucide-react";

interface CompanyOrderLookupWidgetProps {
  onDeliveryUpdated?: () => void;
}

export default function CompanyOrderLookupWidget({
  onDeliveryUpdated,
}: CompanyOrderLookupWidgetProps) {
  const [searchNumber, setSearchNumber] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [foundOrder, setFoundOrder] = useState<LookupDeliveryOrderResult | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePerformLookup = (identifier: string) => {
    if (!identifier.trim()) return;
    setLookupError(null);

    startTransition(async () => {
      const res = await lookupOrderForDeliveryAction(identifier);

      if (!res.success || !res.data) {
        setLookupError(res.error || "Commande introuvable.");
        return;
      }

      setFoundOrder(res.data);
      setIsConfirmationOpen(true);
      setSearchNumber("");
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePerformLookup(searchNumber);
  };

  const handleScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);
    handlePerformLookup(decodedText);
  };

  return (
    <>
      <div className="bg-gradient-to-br from-forest-900 via-forest-950 to-forest-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden border border-forest-800/60">
        {/* Décoration d'arrière-plan */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-forest-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Titre & Description */}
          <div className="space-y-1 max-w-md">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-forest-800/80 border border-forest-700/60 text-[10px] font-bold uppercase tracking-wider text-forest-200">
              <QrCode className="w-3 h-3" />
              Récupération Rapide & Retrait
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              Retrouver une commande reçue
            </h3>
            <p className="text-xs text-forest-200/80 leading-relaxed">
              Scannez le QR code présenté par le revendeur ou saisissez le numéro de commande pour vérifier et confirmer la livraison.
            </p>
          </div>

          {/* Actions : Bouton Scanner Mobile + Saisie Manuelle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {/* Bouton Caméra Scanner */}
            <button
              type="button"
              onClick={() => {
                setLookupError(null);
                setIsScannerOpen(true);
              }}
              className="px-4 py-2.5 text-xs font-bold text-forest-950 bg-emerald-400 hover:bg-emerald-300 active:scale-98 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0 group"
            >
              <Camera className="w-4 h-4 text-forest-950 group-hover:rotate-6 transition-transform" />
              <span>Scanner un QR</span>
            </button>

            <span className="text-[11px] text-forest-300/80 text-center font-medium sm:px-1">ou</span>

            {/* Champ de recherche par numéro */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5 flex-1 sm:w-72">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchNumber}
                  onChange={(e) => {
                    setSearchNumber(e.target.value);
                    if (lookupError) setLookupError(null);
                  }}
                  placeholder="N° de commande (ex: CMD-...)"
                  className="w-full pl-3.5 pr-8 py-2.5 text-xs rounded-2xl bg-forest-800/90 border border-forest-700 text-white placeholder:text-forest-400/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/80 font-mono"
                />
                {searchNumber && (
                  <button
                    type="button"
                    onClick={() => setSearchNumber("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forest-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending || !searchNumber.trim()}
                className="px-3.5 py-2.5 text-xs font-bold text-white bg-forest-800 hover:bg-forest-700 disabled:opacity-40 rounded-2xl border border-forest-600/80 transition-all shadow-xs flex items-center justify-center shrink-0"
                title="Rechercher la commande"
              >
                {isPending ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Message d'erreur neutre si introuvable */}
        {lookupError && (
          <div className="mt-3.5 p-3 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
            <span>{lookupError}</span>
          </div>
        )}
      </div>

      {/* Modal Scanner Caméra */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        onSwitchToManual={() => {
          setIsScannerOpen(false);
          const inputEl = document.querySelector<HTMLInputElement>("input[placeholder*='CMD-']");
          inputEl?.focus();
        }}
      />

      {/* Modal Détails & Confirmation de Livraison */}
      <DeliveryConfirmationModal
        order={foundOrder}
        isOpen={isConfirmationOpen}
        onClose={() => {
          setIsConfirmationOpen(false);
          setFoundOrder(null);
        }}
        onDeliveryConfirmed={() => {
          onDeliveryUpdated?.();
        }}
      />
    </>
  );
}
