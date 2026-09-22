"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, QrCode, Copy, Check, ShieldCheck, AlertCircle } from "lucide-react";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-forest-900/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-forest-800 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">QR Code de Livraison</h3>
              <p className="text-[11px] text-gray-500">Pour retrait & vérification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps de la modal */}
        <div className="p-6 text-center space-y-4">
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
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
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
                <span className="text-gray-500 block text-[11px] mt-0.5">
                  Volume : <strong className="text-forest-900">{displayQty.toLocaleString("fr-FR")} {unit || "tonne"}</strong>
                </span>
              )}
            </div>
          )}

          {/* Note de sécurité */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-forest-600" />
            <span>Jeton sécurisé vérifié exclusivement par la société vendeuse</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors shadow-2xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
