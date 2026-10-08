"use client";

import { useState, useRef, useEffect } from "react";
import Drawer from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { updateCompanyProfileAction } from "@/lib/actions/company";
import {
  Building2,
  Upload,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Camera,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CompanyEditProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  company: {
    id: string;
    name: string;
    slug?: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    logo_url: string | null;
  };
}

export default function CompanyEditProfileDrawer({
  isOpen,
  onClose,
  company,
}: CompanyEditProfileDrawerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États du formulaire
  const [name, setName] = useState(company.name || "");
  const [description, setDescription] = useState(company.description || "");
  const [phone, setPhone] = useState(company.phone || "");
  const [email, setEmail] = useState(company.email || "");
  const [city, setCity] = useState(company.city || "");
  const [address, setAddress] = useState(company.address || "");

  // Gestion du logo
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logo_url);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronisation avec les props
  useEffect(() => {
    if (isOpen) {
      setName(company.name || "");
      setDescription(company.description || "");
      setPhone(company.phone || "");
      setEmail(company.email || "");
      setCity(company.city || "");
      setAddress(company.address || "");
      setLogoPreview(company.logo_url);
      setLogoFile(null);
      setRemoveLogo(false);
      setErrorMessage(null);
    }
  }, [isOpen, company]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Le fichier sélectionné dépasse 5 Mo. Veuillez choisir une image plus légère.");
      return;
    }

    setLogoFile(file);
    setRemoveLogo(false);
    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
    setErrorMessage(null);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name || name.trim().length < 2) {
      setErrorMessage("La raison sociale de l'entreprise est obligatoire (minimum 2 caractères).");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("companyId", company.id);
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("phone", phone.trim());
      formData.append("email", email.trim());
      formData.append("city", city.trim());
      formData.append("address", address.trim());

      if (removeLogo) {
        formData.append("removeLogo", "true");
      } else if (logoFile) {
        formData.append("logo", logoFile);
      }

      const res = await updateCompanyProfileAction(null, formData);

      if (res?.error) {
        setErrorMessage(res.error);
        toast.error("Erreur d'enregistrement", { description: res.error });
        return;
      }

      toast.success("Profil mis à jour", {
        description: "Les informations de votre exploitation agricole ont été modifiées avec succès.",
      });

      onClose();
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || "Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Modifier le profil de l'exploitation"
      description="Renseignements légaux, coordonnées et identité visuelle"
      icon={<Building2 className="w-5 h-5 text-forest-700" />}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Enregistrer les modifications
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <Alert
            variant="error"
            title="Erreur de validation"
            icon={<AlertCircle className="w-4 h-4" />}
          >
            {errorMessage}
          </Alert>
        )}

        {/* 1. Logo officiel de l'exploitation */}
        <div className="p-4 sm:p-5 rounded-2xl bg-forest-50/50 border border-forest-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-forest-700" />
                Logo officiel de l&apos;exploitation
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Image affichée sur votre profil et vos documents officiels
              </p>
            </div>
            {logoPreview && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-2 border-forest-200/80 shadow-xs flex items-center justify-center overflow-hidden shrink-0 relative">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt={name || "Logo"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-9 h-9 text-forest-300" />
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="drawer-logo-upload"
              />
              <label
                htmlFor="drawer-logo-upload"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer shadow-2xs transition-all"
              >
                <Upload className="w-4 h-4 text-forest-700" />
                <span>{logoPreview ? "Changer l'image" : "Sélectionner une image"}</span>
              </label>
              <p className="text-[11px] text-gray-500">
                Formats acceptés : JPG, PNG, WebP (Max 5 Mo).
              </p>
            </div>
          </div>
        </div>

        {/* 2. Dénomination de l'exploitation */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-1 border-b border-gray-100">
            Dénomination & Présentation
          </h4>

          <FormField
            label="Raison sociale / Nom de l'exploitation"
            required
            description="Le nom officiel sous lequel votre société est enregistrée"
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ferme Agro-Pastorale de Maluku"
              leftIcon={<Building2 className="w-4 h-4" />}
            />
          </FormField>

          <FormField
            label="Présentation de l'activité & Filières"
            optional
            description="Décrivez vos cultures, cheptels, méthodes et vocations agricoles"
          >
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Notre exploitation cultive du maïs grain, du manioc et des légumes de plein champ selon des normes éco-responsables..."
            />
          </FormField>
        </div>

        {/* 3. Coordonnées directes */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-1 border-b border-gray-100">
            Coordonnées du Siège
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Téléphone professionnel" optional>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: +243 810 000 000"
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </FormField>

            <FormField label="Email de contact" optional>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: contact@ferme.cd"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </FormField>
          </div>
        </div>

        {/* 4. Implantation physique */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-1 border-b border-gray-100">
            Localisation & Adresse
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Ville ou Territoire" optional>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Kinshasa"
                leftIcon={<MapPin className="w-4 h-4" />}
              />
            </FormField>

            <FormField label="Adresse physique précise" optional>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Route nationale 1, Plateau de Bateke"
              />
            </FormField>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
