"use client";

import { useState, useTransition } from "react";
import { Province } from "@/lib/queries/geography";
import { updateResellerLocationAction } from "@/lib/actions/resellers";
import {
  MapPin,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Building,
} from "lucide-react";

interface ResellerLocationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  provinces: Province[];
  currentProvinceId?: string;
  currentCity?: string;
  currentAddress?: string;
}

export default function ResellerLocationEditModal({
  isOpen,
  onClose,
  provinces,
  currentProvinceId = "",
  currentCity = "",
  currentAddress = "",
}: ResellerLocationEditModalProps) {
  const [provinceId, setProvinceId] = useState(currentProvinceId);
  const [city, setCity] = useState(currentCity);
  const [address, setAddress] = useState(currentAddress);
  const [confirmed, setConfirmed] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentProvince = provinces.find((p) => p.id === provinceId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!provinceId) {
      setErrorMessage("Veuillez sélectionner une province.");
      return;
    }

    if (!confirmed) {
      setErrorMessage("Veuillez cocher la confirmation d'impact sur vos futures commandes.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateResellerLocationAction({
          province_id: provinceId,
          city,
          delivery_address: address,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Une erreur est survenue.");
          return;
        }

        setSuccessMessage(res.message || "Territoire d'opération mis à jour.");
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err: any) {
        setErrorMessage(err.message || "Erreur de connexion.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* En-tête */}
        <div className="px-6 py-5 bg-gradient-to-r from-earth-900 to-earth-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Modifier le Territoire d&apos;Opération</h2>
              <span className="text-xs text-earth-200">
                Paramétrage de votre région pivot d&apos;achat
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sélection de la province pivot */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-900">
              Province de Rattachement Principale *
            </label>
            <select
              value={provinceId}
              onChange={(e) => setProvinceId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-earth-500 outline-hidden"
            >
              <option value="">Sélectionnez votre province</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Ville / Commune principale
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Matadi, Lemba..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 outline-hidden focus:ring-2 focus:ring-earth-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Adresse habituelle
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Marché Central..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 outline-hidden focus:ring-2 focus:ring-earth-500"
              />
            </div>
          </div>

          {/* Avertissement contractuel et confirmation obligatoire */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-2.5 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Règle d&apos;intégrité historique et d&apos;éligibilité</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Modifier votre province de rattachement mettra immédiatement à jour les offres commerciales auxquelles vous pouvez commander. Vos <strong>commandes déjà passées</strong> restent scellées avec leur destination et leur historique d&apos;origine.
            </p>

            <label className="flex items-start gap-2.5 pt-1 cursor-pointer font-semibold text-amber-950">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-earth-700 focus:ring-earth-500"
              />
              <span className="text-xs">
                Je confirme vouloir modifier mon territoire d&apos;opération vers {currentProvince?.name || "cette province"}.
              </span>
            </label>
          </div>

          {/* Boutons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isPending || !confirmed || !provinceId}
              className="px-5 py-2.5 rounded-xl bg-earth-800 hover:bg-earth-900 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Mise à jour..." : "Enregistrer la modification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
