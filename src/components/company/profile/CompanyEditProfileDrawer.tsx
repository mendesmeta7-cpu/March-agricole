"use client";

import { useState, useEffect } from "react";
import Drawer from "@/components/ui/Drawer";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { updateCompanyProfileAction } from "@/lib/actions/company";
import { usePhotoForUpload } from "@/components/ui/usePhotoForUpload";
import PhotoUploadFeedback from "@/components/ui/PhotoUploadFeedback";
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
  // Logo : transparence conservée, photo préparée sous 900 Ko.
  const logo = usePhotoForUpload({ keepTransparency: true });
  const clearLogo = logo.clear;

  // États du formulaire
  const [name, setName] = useState(company.name || "");
  const [description, setDescription] = useState(company.description || "");
  const [phone, setPhone] = useState(company.phone || "");
  const [email, setEmail] = useState(company.email || "");
  const [city, setCity] = useState(company.city || "");
  const [address, setAddress] = useState(company.address || "");

  // Gestion du logo
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logo_url);
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
      clearLogo();
      setRemoveLogo(false);
      setErrorMessage(null);
    }
  }, [isOpen, company, clearLogo]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { file, error } = await logo.onInputChange(e);
    if (file) {
      setRemoveLogo(false);
      setLogoPreview(URL.createObjectURL(file));
    } else if (error && !removeLogo) {
      setLogoPreview(company.logo_url);
    }
  };

  const handleRemoveLogo = () => {
    clearLogo();
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logo.isPreparing) return;
    setErrorMessage(null);

    if (!name || name.trim().length < 2) {
      setErrorMessage("La raison sociale de la société est obligatoire (minimum 2 caractères).");
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
      } else if (logo.photo) {
        formData.append("logo", logo.photo, logo.photo.name);
      }

      const res = await updateCompanyProfileAction(null, formData);

      if (res?.error) {
        setErrorMessage(res.error);
        toast.error("Erreur d'enregistrement", { description: res.error });
        return;
      }

      toast.success("Profil mis à jour", {
        description: "Les informations de votre société ont été modifiées avec succès.",
      });

      onClose();
      router.refresh();
    } catch (err: any) {
      console.error("Erreur sauvegarde profil société :", err);
      setErrorMessage("Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Modifier le profil de la société"
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
            disabled={logo.isPreparing}
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
                Logo officiel de la société
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
                ref={logo.inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="drawer-logo-upload"
                aria-invalid={logo.error ? true : undefined}
                aria-describedby={logo.error || logo.isPreparing ? logo.feedbackId : undefined}
              />
              {/* Sous-lot P : vrai bouton (focalisable, Entrée et Espace) qui ouvre le champ masqué */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 font-semibold"
                leftIcon={<Upload className="w-4 h-4 text-forest-700" aria-hidden="true" />}
                onClick={() => logo.inputRef.current?.click()}
                aria-describedby={logo.error || logo.isPreparing ? logo.feedbackId : undefined}
              >
                {logoPreview ? "Changer l'image" : "Sélectionner une image"}
              </Button>
              <p className="text-xs text-gray-500">
                Formats acceptés : JPG, PNG, WebP (Max 5 Mo).
              </p>
              <PhotoUploadFeedback photo={logo} isSending={isSubmitting} />
            </div>
          </div>
        </div>

        {/* 2. Dénomination de l'exploitation */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider pb-1 border-b border-gray-100">
            Dénomination & Présentation
          </h4>

          <FormField
            label="Raison sociale / Nom de la société"
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
