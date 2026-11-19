"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { lookupOrderForDeliveryAction, LookupDeliveryOrderResult } from "@/lib/actions/orders";
import dynamic from "next/dynamic";
import DeliveryConfirmationModal from "./DeliveryConfirmationModal";
import { Camera, Search, AlertCircle, QrCode, Sparkles, HelpCircle, ChevronDown } from "lucide-react";

// PERF-03 : html5-qrcode n'est chargé qu'à l'ouverture du scanner (jamais côté serveur).
const QRScannerModal = dynamic(() => import("./QRScannerModal"), { ssr: false });

interface CompanyOrderLookupWidgetProps {
  /** Appelé avec le numéro de la commande dont la livraison vient d'être confirmée. */
  onDeliveryUpdated?: (orderNumber: string) => void;
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
  const [mounted, setMounted] = useState(false);
  const [aideOuverte, setAideOuverte] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePerformLookup = (identifier: string) => {
    let clean = identifier.trim();
    if (!clean) return;

    // Si une URL a été scannée (ex: https://.../orders/CMD-1234), extraire le token ou numéro
    if (clean.includes("/") || clean.includes("?")) {
      try {
        const urlObj = new URL(clean);
        const pathSegments = urlObj.pathname.split("/").filter(Boolean);
        if (pathSegments.length > 0) {
          clean = pathSegments[pathSegments.length - 1];
        }
      } catch {
        const parts = clean.split("?")[0].split("/").filter(Boolean);
        if (parts.length > 0) {
          clean = parts[parts.length - 1];
        }
      }
    }

    setLookupError(null);

    startTransition(async () => {
      const res = await lookupOrderForDeliveryAction(clean);

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
      <div className="bg-gradient-to-br from-forest-900 via-forest-950 to-forest-900 rounded-3xl p-3.5 sm:p-5 text-white shadow-xl relative overflow-hidden border border-forest-800/60">
        {/* Décoration d'arrière-plan */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-forest-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-5">
          {/* Titre et bouton d'aide sur une ligne ; texte d'aide replié, au contenu inchangé
              (Lot 6B, correctif NAV-06, arbitrage E). Scanner et saisie du numéro inchangés. */}
          <div className="flex items-center justify-between gap-3 min-w-0 md:max-w-md">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-forest-200">
                <QrCode className="w-3 h-3" aria-hidden="true" />
                Récupération Rapide & Retrait
              </div>
              <h3 className="text-sm sm:text-lg font-black text-white tracking-tight">
                Retrouver une commande reçue
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setAideOuverte((v) => !v)}
              aria-expanded={aideOuverte}
              aria-controls="aide-recuperation-commande"
              className="inline-flex items-center gap-1 min-h-11 sm:min-h-9 px-3 rounded-xl text-xs font-semibold text-forest-100 bg-forest-800/70 border border-forest-700/60 hover:bg-forest-800 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Aide</span>
              <ChevronDown
                className={`w-3.5 h-3.5 motion-safe:transition-transform ${aideOuverte ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Actions : Bouton Scanner Desktop + Saisie Manuelle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {/* Bouton Caméra Desktop (intégré dans la bannière sur écrans >= sm) */}
            <button
              type="button"
              onClick={() => {
                setLookupError(null);
                setIsScannerOpen(true);
              }}
              aria-label="Scanner un QR code"
              className="hidden sm:flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-forest-950 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] rounded-2xl transition-all shadow-md shrink-0 border border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <Camera className="w-4 h-4 text-forest-950 group-hover:rotate-6 transition-transform shrink-0" />
              <span className="font-bold">Scanner un QR</span>
            </button>

            <span className="hidden sm:inline text-xs text-forest-300/80 text-center font-medium sm:px-1">ou</span>

            {/* Champ de recherche par numéro */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5 w-full sm:w-72">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchNumber}
                  onChange={(e) => {
                    setSearchNumber(e.target.value);
                    if (lookupError) setLookupError(null);
                  }}
                  placeholder="N° de commande (ex: CMD-...)"
                  className="w-full pl-3.5 pr-8 py-2.5 text-xs rounded-2xl bg-forest-800/90 border border-forest-700 text-white placeholder:text-forest-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/80 font-mono"
                />
                {searchNumber && (
                  <button
                    type="button"
                    onClick={() => setSearchNumber("")}
                    aria-label="Effacer le numéro saisi"
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
                aria-label="Rechercher la commande"
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

        {/* Texte d'aide, replié par défaut (contenu inchangé) */}
        <p
          id="aide-recuperation-commande"
          hidden={!aideOuverte}
          className="relative z-10 mt-2.5 text-xs text-forest-200/80 leading-relaxed max-w-2xl"
        >
          Scannez le QR code présenté par le revendeur ou saisissez le numéro de commande pour vérifier et confirmer la livraison.
        </p>

        {/* Message d'erreur neutre si introuvable */}
        {lookupError && (
          <div className="mt-3.5 p-3 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
            <span>{lookupError}</span>
          </div>
        )}
      </div>

      {/* Modal Scanner Caméra */}
      {isScannerOpen && (
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
      )}

      {/* Modal Détails & Confirmation de Livraison */}
      <DeliveryConfirmationModal
        order={foundOrder}
        isOpen={isConfirmationOpen}
        onClose={() => {
          setIsConfirmationOpen(false);
          setFoundOrder(null);
        }}
        onDeliveryConfirmed={(orderNumber) => {
          setFoundOrder((prev) =>
            prev ? { ...prev, status: "delivered", delivered_at: new Date().toISOString() } : prev
          );
          onDeliveryUpdated?.(orderNumber);
        }}
      />

      {/* Bouton Caméra Mobile Fixe Flottant — Rendu directement dans document.body via Portal pour garantir une fixation 100% stable au viewport sur iOS et Android, sans interférence de conteneur overflow-hidden */}
      {mounted &&
        !isScannerOpen &&
        createPortal(
          <button
            type="button"
            onClick={() => {
              setLookupError(null);
              setIsScannerOpen(true);
            }}
            aria-label="Scanner un QR code"
            className="sm:hidden fixed right-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 px-4 py-3 text-xs font-bold text-forest-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 rounded-full transition-all shadow-2xl flex items-center justify-center gap-2 shrink-0 border border-emerald-300/80 ring-2 ring-forest-950/20 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <Camera className="w-4 h-4 text-forest-950 group-hover:rotate-6 transition-transform shrink-0" />
            <span className="font-bold">Scanner un QR</span>
          </button>,
          document.body
        )}
    </>
  );
}

