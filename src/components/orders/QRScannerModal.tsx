"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Html5Qrcode } from "html5-qrcode";
import { AlertCircle, RefreshCw, Keyboard, Sparkles } from "lucide-react";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  onSwitchToManual: () => void;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  onSwitchToManual,
}: QRScannerModalProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "html5-qr-reader-container";

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      setCameraError(null);
      setIsScanning(false);

      const initScanner = async () => {
        try {
          // Attendre que le DOM soit monté
          await new Promise((resolve) => setTimeout(resolve, 150));
          if (!isMounted) return;

          const html5QrCode = new Html5Qrcode(readerElementId);
          scannerRef.current = html5QrCode;

          const config = {
            fps: 15,
            qrbox: { width: 230, height: 230 },
            aspectRatio: 1.0,
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              // Détection réussie
              if (html5QrCode.isScanning) {
                html5QrCode
                  .stop()
                  .then(() => {
                    html5QrCode.clear();
                  })
                  .catch(() => {});
              }
              onScanSuccess(decodedText);
            },
            () => {
              // Ignorer les erreurs frame par frame lors de la recherche
            }
          );

          if (isMounted) {
            setIsScanning(true);
          }
        } catch (err: any) {
          console.error("Erreur initialisation caméra:", err);
          if (isMounted) {
            let msg = "Impossible d'accéder à la caméra de votre appareil.";
            if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
              msg = "Autorisation caméra refusée. Veuillez autoriser l'accès dans les paramètres du navigateur ou saisir le numéro manuellement.";
            } else if (err?.name === "NotFoundError") {
              msg = "Aucune caméra détectée sur votre appareil.";
            }
            setCameraError(msg);
          }
        }
      };

      initScanner();
    }

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current
              .stop()
              .then(() => scannerRef.current?.clear())
              .catch(() => {});
          } else {
            scannerRef.current.clear();
          }
        } catch {}
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScanSuccess]);


  if (!isOpen) return null;

  // Lot UX/UI 5B : surface partagée Dialog (focus, Échap, verrouillage compté du défilement).
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      isDismissable={true}
      showCloseButton={true}
      title={"Scanner le QR Code"}
      description={"Pointez l'objectif vers le QR du revendeur"}
      fullScreenOnMobile
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSwitchToManual();
            }}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-forest-900 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Keyboard className="w-3.5 h-3.5" />
            Saisie manuelle
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-200/60 transition-colors"
          >
            Fermer
          </button>
        </>
      }
    >
        {/* Viewfinder zone */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          {cameraError ? (
            <div className="p-5 text-center space-y-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 w-full">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-amber-950">Accès caméra non disponible</h4>
              <p className="text-xs text-amber-800 leading-relaxed max-w-xs mx-auto">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToManual();
                }}
                className="px-4 py-2 text-xs font-bold text-forest-900 bg-white hover:bg-amber-100 border border-amber-300 rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5"
              >
                <Keyboard className="w-4 h-4" />
                Saisir le N° de commande
              </button>
            </div>
          ) : (
            <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-forest-600 shadow-inner">
              <div id={readerElementId} className="w-full h-full object-cover" />

              {/* Cadre de visée animé */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-forest-400/80 rounded-xl relative shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-forest-400 to-transparent animate-pulse" />
                    <div className="absolute top-2 left-2 text-[11px] font-mono text-forest-300 bg-black/60 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Scan actif
                    </div>
                  </div>
                </div>
              )}

              {!isScanning && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 space-y-2 bg-black/80">
                  <RefreshCw className="w-6 h-6 animate-spin text-forest-400" />
                  <span className="text-xs font-medium">Démarrage de la caméra...</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 text-center max-w-xs leading-relaxed">
            Cadrez le QR code affiché sur l&apos;écran du revendeur. La recherche de commande démarrera automatiquement dès détection.
          </p>
        </div>
    </Dialog>
  );
}
