"use client";

import { useState } from "react";
import { updateCompanyProfileAction, CompanyActionResult } from "@/lib/actions/company";
import SubmitButton from "@/components/SubmitButton";
import { X, Upload, Building2, AlertCircle, CheckCircle2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

interface EditCompanyProfileModalProps {
  company: {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    logo_url: string | null;
  };
}

export default function EditCompanyProfileModal({ company }: EditCompanyProfileModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logo_url);
  const [state, setState] = useState<CompanyActionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setState({ error: "L'image ne doit pas dépasser 5 Mo." });
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setState(null);

    const formData = new FormData(e.currentTarget);
    formData.append("companyId", company.id);

    try {
      const result = await updateCompanyProfileAction(null, formData);
      if (result.error) {
        setState({ error: result.error });
      } else {
        setState({ success: true });
        router.refresh();
        setTimeout(() => {
          setIsOpen(false);
        }, 1000);
      }
    } catch (err: any) {
      setState({ error: err?.message || "Erreur lors de l'enregistrement." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-forest-50 border border-forest-200 text-forest-800 hover:bg-forest-100 transition-all shadow-2xs"
      >
        <Edit className="w-3.5 h-3.5" />
        Modifier le profil & logo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Modifier l&apos;Exploitation</h3>
                  <p className="text-xs text-gray-500">{company.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {state?.error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            {state?.success && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Profil et logo mis à jour avec succès !</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">
                  Logo officiel de l&apos;exploitation
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choisir une image...</span>
                      <input
                        type="file"
                        name="logo"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Formats acceptés : JPG, PNG, WebP (Max 5 Mo).
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">
                  Description de l&apos;activité
                </label>
                <textarea
                  name="description"
                  defaultValue={company.description || ""}
                  rows={3}
                  placeholder="Présentez vos cultures, exploitations et filières..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 text-xs focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Adresse et Ville */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">
                    Ville / Territoire
                  </label>
                  <input
                    type="text"
                    name="city"
                    defaultValue={company.city || ""}
                    placeholder="Ex: Kinshasa"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={company.phone || ""}
                    placeholder="Ex: +243 990 000 000"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">
                  Adresse physique
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={company.address || ""}
                  placeholder="Ex: Route nationale 1, Plateau de Bateke"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">
                  Email de contact
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={company.email || ""}
                  placeholder="contact@ferme.cd"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 text-xs focus:ring-2 focus:ring-forest-600 focus:border-transparent outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors"
                >
                  Annuler
                </button>
                <SubmitButton
                  className="px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs font-semibold shadow-xs"
                  loadingText="Enregistrement..."
                  disabled={isSubmitting}
                >
                  Enregistrer les modifications
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
