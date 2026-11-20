"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import QRCode from "qrcode";
import { Copy, Check, ShieldCheck, AlertCircle } from "lucide-react";
import { formatQuantityWithUnit } from "@/lib/utils/numberFormat";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  qrCodeToken: string;
  companyName?: string;
  productName?: string;
  quantity?: number;
  totalQuantity?: number;
  unit?: string;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  orderNumber,
  qrCodeToken,
  companyName,
  productName,
  quantity,
  totalQuantity,
  unit,
}: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const displayQty = quantity !== undefined ? quantity : totalQuantity;

  useEffect(() => {
    if (isOpen && canvasRef.current && qrCodeToken) {
      setRenderError(null);
      QRCode.toCanvas(
        canvasRef.current,
        qrCodeToken,
        {
          width: 240,
          margin: 1.5,
          color: {
            dark: "#143a22", // forest-900
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
        },
        (error) => {
          if (error) {
            console.error("Erreur génération QR Code:", error);
            setRenderError("Impossible de générer le QR Code.");
          }
        }
      );
    }
  }, [isOpen, qrCodeToken]);


  if (!isOpen) return null;

  const handleCopyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Lot UX/UI 5B : surface partagée Dialog (focus, Échap, verrouillage compté du défilement).
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      isDismissable={true}
      showCloseButton={true}
      title={"QR Code de Livraison"}
      description={"Pour retrait & vérification"}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors shadow-2xs"
          >
            Fermer
          </button>
        </>
      }
    >
        {/* Corps de la modal */}
        <div className="text-center space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            Présentez ce QR code à la société{" "}
            {companyName ? <strong className="text-gray-900">« {companyName} »</strong> : "agricole"}{" "}
            pour retrouver rapidement votre commande lors de la remise.
          </p>

          {/* Cadre QR Code */}
          <div className="p-4 bg-white rounded-2xl border-2 border-forest-100 shadow-sm inline-block mx-auto relative group">
            <canvas ref={canvasRef} className="rounded-lg max-w-full h-auto mx-auto" />
            {renderError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{renderError}</span>
              </div>
            )}
          </div>

          {/* Numéro de commande lisible */}
          <div className="space-y-1 pt-1">
            <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 block">
              Numéro de commande lisible
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-base font-extrabold text-forest-950 bg-forest-50 px-3 py-1.5 rounded-xl border border-forest-200/80 select-all">
                {orderNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                title="Copier le numéro"
                aria-label={copied ? "Numéro de commande copié" : "Copier le numéro de commande"}
                className="p-2 text-gray-500 hover:text-forest-800 hover:bg-forest-50 rounded-xl border border-gray-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {(productName || displayQty !== undefined) && (
            <div className="text-xs text-gray-600 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
              {productName && <span className="font-bold text-gray-900 block">{productName}</span>}
              {displayQty !== undefined && (
                <span className="text-gray-500 block text-xs mt-0.5">
                  Volume : <strong className="text-forest-900">{formatQuantityWithUnit(displayQty, unit || "tonne")}</strong>
                </span>
              )}
            </div>
          )}

          {/* Note de sécurité */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-forest-600" />
            <span>Jeton sécurisé vérifié exclusivement par la société vendeuse</span>
          </div>
        </div>
    </Dialog>
  );
}
