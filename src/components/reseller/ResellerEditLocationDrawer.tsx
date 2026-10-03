"use client";

import { useState, useTransition } from "react";
import Drawer from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Checkbox from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { Province } from "@/lib/queries/geography";
import { updateResellerLocationAction } from "@/lib/actions/resellers";
import { MapPin, AlertTriangle, Building, Home } from "lucide-react";
import { useRouter } from "next/navigation";

interface ResellerEditLocationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  provinces: Province[];
  currentProvinceId?: string;
  currentCity?: string;
  currentAddress?: string;
}

export default function ResellerEditLocationDrawer({
  isOpen,
  onClose,
  provinces,
  currentProvinceId = "",
  currentCity = "",
  currentAddress = "",
}: ResellerEditLocationDrawerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [provinceId, setProvinceId] = useState(currentProvinceId);
  const [city, setCity] = useState(currentCity);
  const [address, setAddress] = useState(currentAddress);
  const [confirmed, setConfirmed] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedProvince = provinces.find((p) => p.id === provinceId);

  const provinceOptions = provinces.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.code})`,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!provinceId) {
      setErrorMessage("Veuillez sélectionner une province valide.");
      return;
    }

    if (!confirmed) {
      setErrorMessage(
        "Veuillez cocher la confirmation d'impact sur votre éligibilité aux commandes."
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateResellerLocationAction({
          province_id: provinceId,
          city: city.trim() || undefined,
          delivery_address: address.trim() || undefined,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Une erreur est survenue lors de la mise à jour.");
          toast.error("Erreur", { description: res.error || "Mise à jour impossible." });
          return;
        }

        toast.success("Territoire d'opération mis à jour", {
          description: `Votre région pivot est désormais : ${selectedProvince?.name || "enregistrée"}.`,
        });

        onClose();
        router.refresh();
      } catch (err: any) {
        setErrorMessage(err.message || "Erreur de connexion.");
      }
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier le Territoire Pivot"
      description="Définissez votre région de livraison principale et vos points de chute habituels."
      icon={<MapPin className="w-5 h-5 text-earth-700" />}
      size="md"
      side="right"
      isDismissable={!isPending}
      showCloseButton={!isPending}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="earth"
            size="md"
            onClick={handleSubmit}
            isLoading={isPending}
            disabled={isPending || !provinceId || !confirmed}
          >
            Enregistrer le territoire
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <Alert variant="error" title="Validation requise">
            {errorMessage}
          </Alert>
        )}

        {/* 1. Sélection de la province de rattachement */}
        <FormField
          label="Province de Rattachement Principale"
          htmlFor="edit-loc-province"
          required
          description="Conditionne l'accès direct aux offres des producteurs desservant cette région."
        >
          <Select
            id="edit-loc-province"
            value={provinceId}
            onChange={(e) => {
              setProvinceId(e.target.value);
              setConfirmed(false); // Réinitialiser la confirmation si changement
            }}
            options={provinceOptions}
            placeholder="Sélectionnez votre province"
            disabled={isPending}
          />
        </FormField>

        {/* 2. Ville / Commune */}
        <FormField
          label="Ville / Commune ou Marché"
          htmlFor="edit-loc-city"
          optional
          description="Ville où vous effectuez principalement vos réceptions ou votre négoce."
        >
          <Input
            id="edit-loc-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex : Matadi, Kinshasa, Lubumbashi..."
            leftIcon={<Building className="w-4 h-4" />}
            disabled={isPending}
          />
        </FormField>

        {/* 3. Adresse habituelle de livraison */}
        <FormField
          label="Adresse ou Dépôt Habituel de Retrait"
          htmlFor="edit-loc-address"
          optional
          description="Précision utile pour les exploitants lors de la préparation des dépôts de retrait."
        >
          <Textarea
            id="edit-loc-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex : Entrepôt B3, Marché Central, Avenue Kasa-Vubu..."
            rows={3}
            disabled={isPending}
          />
        </FormField>

        {/* 4. Avertissement contractuel et règle régionale */}
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 space-y-3 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Règle d&apos;intégrité historique et d&apos;éligibilité</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Modifier votre province de rattachement mettra immédiatement à jour le catalogue
            d&apos;offres commerciales que vous pouvez commander. Vos <strong>commandes déjà passées</strong>{" "}
            restent strictement scellées avec leur destination, leurs prix et leur historique d&apos;origine.
          </p>

          <div className="pt-1 border-t border-amber-200/60">
            <Checkbox
              id="confirm-location-change"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={isPending || !provinceId}
              label={
                <span className="text-xs font-semibold text-amber-950">
                  Je confirme vouloir rattacher mon compte à{" "}
                  <strong className="underline">
                    {selectedProvince?.name || "cette province"}
                  </strong>
                  .
                </span>
              }
            />
          </div>
        </div>
      </form>
    </Drawer>
  );
}
