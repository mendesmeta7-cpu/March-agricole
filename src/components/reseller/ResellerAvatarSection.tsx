"use client";

import { useState, useRef } from "react";
import {
  updateResellerAvatarAction,
  deleteResellerAvatarAction,
  ActionResponse,
} from "@/lib/actions/resellerProfile";
import { User, Camera, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ResellerAvatarSectionProps {
  currentAvatarUrl?: string | null;
  userName?: string;
}

export default function ResellerAvatarSection({
  currentAvatarUrl,
  userName,
}: ResellerAvatarSectionProps) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    if (!userName) return "RP";
    const parts = userName.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res: ActionResponse = await updateResellerAvatarAction(null, formData);
      if (res.success && res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
        setMessage({ type: "success", text: res.message || "Photo mise à jour !" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: res.error || "Erreur lors de l'upload." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erreur de connexion." });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm("Voulez-vous vraiment supprimer votre photo de profil ?")) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const res = await deleteResellerAvatarAction();
      if (res.success) {
        setAvatarUrl(null);
        setMessage({ type: "success", text: "Photo de profil supprimée." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: res.error || "Erreur lors de la suppression." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erreur de connexion." });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/90 shadow-2xs">
      <div className="flex items-center gap-4">
        {/* Avatar affiché avec loader */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-forest-100 text-forest-800 border-2 border-forest-200/80 flex items-center justify-center font-bold text-lg sm:text-xl shadow-xs overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName || "Avatar"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{getInitials()}</span>
          )}

          {(isUploading || isDeleting) && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white backdrop-blur-2xs">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base">
            Photo de Profil
          </h3>
          <p className="text-xs text-gray-500">
            Image au format JPG, PNG ou WebP. Hébergée et optimisée sur Cloudinary.
          </p>

          {message && (
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-medium pt-1 ${
                message.type === "success" ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 sm:pt-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          id="reseller-avatar-upload"
          disabled={isUploading || isDeleting}
        />

        <label
          htmlFor="reseller-avatar-upload"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest-50 hover:bg-forest-100 text-forest-800 text-xs font-semibold border border-forest-200/80 cursor-pointer transition-colors shadow-2xs select-none"
        >
          <Camera className="w-3.5 h-3.5 text-forest-700" />
          <span>{avatarUrl ? "Modifier la photo" : "Ajouter une photo"}</span>
        </label>

        {avatarUrl && (
          <button
            type="button"
            onClick={handleDeleteAvatar}
            disabled={isUploading || isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs font-semibold border border-gray-200/80 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Supprimer la photo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Supprimer</span>
          </button>
        )}
      </div>
    </div>
  );
}
