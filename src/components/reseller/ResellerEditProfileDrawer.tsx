"use client";

import { useState } from "react";
import Drawer from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import {
  updateResellerGeneralProfileAction,
  UpdateResellerGeneralProfileInput,
} from "@/lib/actions/resellerProfile";
import { Store, User, Phone, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useRouter } from "next/navigation";

interface ResellerEditProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentFullName: string;
  currentBusinessName?: string | null;
  currentResellerType: string;
  currentPhone?: string | null;
  userEmail?: string;
}

const RESELLER_TYPE_OPTIONS = [
  { value: "wholesaler", label: "Grossiste (Achats en gros volumes)" },
  { value: "semi_wholesaler", label: "Demi-grossiste (Distribution intermédiaire)" },
  { value: "retailer", label: "Détaillant (Vente directe au consommateur)" },
  { value: "processor", label: "Transformateur agro-alimentaire (Matière première)" },
];

export default function ResellerEditProfileDrawer({
  isOpen,
  onClose,
  currentFullName,
  currentBusinessName = "",
  currentResellerType = "wholesaler",
  currentPhone = "",
  userEmail,
}: ResellerEditProfileDrawerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(currentFullName);
  const [businessName, setBusinessName] = useState(currentBusinessName || "");
  const [resellerType, setResellerType] = useState<
    "wholesaler" | "semi_wholesaler" | "retailer" | "processor"
  >(
    (currentResellerType as any) || "wholesaler"
  );
  const [phone, setPhone] = useState(currentPhone || "");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName || fullName.trim().length < 2) {
      setErrorMessage("Le nom complet du titulaire est obligatoire (minimum 2 caractères).");
      return;
    }

    setIsLoading(true);

    try {
      const res = await updateResellerGeneralProfileAction({
        full_name: fullName.trim(),
        business_name: businessName.trim() || undefined,
        reseller_type: resellerType,
        phone: phone.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Une erreur est survenue lors de la mise à jour.");
        toast.error("Erreur", { description: res.error || "Impossible de mettre à jour le profil." });
        return;
      }

      toast.success("Profil mis à jour", {
        description: "Vos informations d'acheteur professionnel ont été enregistrées.",
      });

      onClose();
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Modifier mon Profil"
      description="Mettez à jour vos coordonnées personnelles et votre raison sociale."
      icon={<Store className="w-5 h-5 text-forest-700" />}
      size="md"
      side="right"
      isDismissable={!isLoading}
      showCloseButton={!isLoading}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={isLoading || !fullName.trim()}
          >
            Enregistrer les modifications
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <Alert variant="error" title="Erreur de validation">
            {errorMessage}
          </Alert>
        )}

        {/* 1. Titulaire du compte (obligatoire) */}
        <FormField
          label="Nom complet du titulaire"
          htmlFor="edit-fullname"
          required
          description="Votre nom et prénom tels qu'ils apparaîtront sur les bons de commande."
        >
          <Input
            id="edit-fullname"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ex : Joseph Kabongo"
            leftIcon={<User className="w-4 h-4" />}
            required
            disabled={isLoading}
          />
        </FormField>

        {/* 2. Dénomination commerciale */}
        <FormField
          label="Dénomination Commerciale / Établissement"
          htmlFor="edit-business-name"
          optional
          description="Nom de votre boutique, entrepôt ou société de distribution."
        >
          <Input
            id="edit-business-name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ex : Établissements Kabongo & Fils"
            leftIcon={<Store className="w-4 h-4" />}
            disabled={isLoading}
          />
        </FormField>

        {/* 3. Typologie d'achat */}
        <FormField
          label="Typologie d'Acheteur"
          htmlFor="edit-reseller-type"
          required
          description="Définit votre mode d'approvisionnement auprès des producteurs agricoles."
        >
          <Select
            id="edit-reseller-type"
            value={resellerType}
            onChange={(e) =>
              setResellerType(
                e.target.value as "wholesaler" | "semi_wholesaler" | "retailer" | "processor"
              )
            }
            options={RESELLER_TYPE_OPTIONS}
            disabled={isLoading}
          />
        </FormField>

        {/* 4. Téléphone de contact */}
        <FormField
          label="Numéro de Téléphone"
          htmlFor="edit-phone"
          optional
          description="Utilisé par les exploitants et transporteurs pour coordonner les arrivages."
        >
          <Input
            id="edit-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ex : +243 81 234 5678"
            leftIcon={<Phone className="w-4 h-4" />}
            disabled={isLoading}
          />
        </FormField>

        {/* Information non modifiable liée au compte */}
        {userEmail && (
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Adresse Email de Connexion
            </span>
            <div className="flex items-center justify-between text-xs text-gray-700">
              <span className="font-medium text-gray-900">{userEmail}</span>
              <span className="text-[10px] text-gray-400 bg-gray-200/60 px-2 py-0.5 rounded-md font-mono">
                Liée à Supabase Auth
              </span>
            </div>
            <p className="text-[11px] text-gray-500 pt-0.5">
              L&apos;adresse email est gérée par votre compte d&apos;authentification et ne peut être modifiée ici.
            </p>
          </div>
        )}
      </form>
    </Drawer>
  );
}
