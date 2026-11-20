"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { PhotoForUpload } from "./usePhotoForUpload";

export interface PhotoUploadFeedbackProps {
  photo: Pick<PhotoForUpload, "error" | "isPreparing" | "photo" | "feedbackId">;
  /** Envoi en cours ; à défaut, l'état du formulaire parent (useFormStatus). */
  isSending?: boolean;
}

/** Message d'un champ photo : erreur, préparation ou envoi. Placé sous le champ. */
export default function PhotoUploadFeedback({ photo, isSending }: PhotoUploadFeedbackProps) {
  const { pending } = useFormStatus();

  if (photo.error) {
    return (
      <p id={photo.feedbackId} role="alert" className="text-xs font-medium text-rose-700">
        {photo.error}
      </p>
    );
  }

  const sending = (isSending ?? pending) && photo.photo !== null;
  const status = photo.isPreparing
    ? "Préparation de la photo…"
    : sending
      ? "Envoi de la photo…"
      : null;
  if (!status) return null;

  return (
    <p
      id={photo.feedbackId}
      role="status"
      className="flex items-center gap-1.5 text-xs font-semibold text-forest-800"
    >
      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
      {status}
    </p>
  );
}
