"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  checkPhotoSource,
  compressPhotoForUpload,
  DEFAULT_MAX_SOURCE_BYTES,
  PHOTO_COMPRESSION_ERROR_MESSAGE,
} from "@/lib/utils/compressImage";

export interface PhotoForUploadOptions {
  /** Taille maximale de l'image choisie : 5 Mo par défaut, 8 Mo pour une bannière. */
  maxSourceBytes?: number;
  /** Conserve la transparence (logo, catégorie, produit du catalogue). */
  keepTransparency?: boolean;
}

export interface PhotoChoice {
  file: File | null;
  error: string | null;
}

export interface PhotoForUpload {
  /** À poser sur le champ fichier : il est vidé quand la photo est refusée ou retirée. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Photo prête à l'envoi (compressée si nécessaire), ou null. */
  photo: File | null;
  /** Aperçu de la photo prête, libéré automatiquement. */
  previewUrl: string | null;
  isPreparing: boolean;
  error: string | null;
  /** Identifiant du message, pour relier le champ à son erreur (aria-describedby). */
  feedbackId: string;
  choose: (file: File | null | undefined) => Promise<PhotoChoice>;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => Promise<PhotoChoice>;
  clear: () => void;
  /** Place la photo prête dans le formulaire envoyé ; l'original n'est jamais envoyé. */
  applyTo: (formData: FormData, field: string) => void;
}

/** Préparation commune des photos : contrôle, compression, état, annulation et message. */
export function usePhotoForUpload(options: PhotoForUploadOptions = {}): PhotoForUpload {
  const { maxSourceBytes = DEFAULT_MAX_SOURCE_BYTES, keepTransparency = false } = options;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef(0);
  const feedbackId = useId();
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const reset = useCallback((message: string | null) => {
    setPhoto(null);
    setPreviewUrl(null);
    setIsPreparing(false);
    setError(message);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const clear = useCallback(() => {
    requestRef.current += 1;
    reset(null);
  }, [reset]);

  const choose = useCallback(
    async (file: File | null | undefined): Promise<PhotoChoice> => {
      if (!file) return { file: null, error: null };
      const requestId = ++requestRef.current;

      const sourceError = checkPhotoSource(file, maxSourceBytes);
      if (sourceError) {
        reset(sourceError);
        return { file: null, error: sourceError };
      }

      setPhoto(null);
      setError(null);
      setIsPreparing(true);
      try {
        const ready = await compressPhotoForUpload(file, { keepTransparency });
        if (requestId !== requestRef.current) return { file: null, error: null };
        setPhoto(ready);
        setPreviewUrl(URL.createObjectURL(ready));
        setIsPreparing(false);
        return { file: ready, error: null };
      } catch (err) {
        console.error("Préparation de la photo impossible :", err);
        if (requestId !== requestRef.current) return { file: null, error: null };
        reset(PHOTO_COMPRESSION_ERROR_MESSAGE);
        return { file: null, error: PHOTO_COMPRESSION_ERROR_MESSAGE };
      }
    },
    [keepTransparency, maxSourceBytes, reset]
  );

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => choose(event.target.files?.[0]),
    [choose]
  );

  const applyTo = useCallback(
    (formData: FormData, field: string) => {
      if (photo) {
        formData.set(field, photo, photo.name);
        return;
      }
      const raw = formData.get(field);
      if (raw instanceof File && raw.size > 0) formData.delete(field);
    },
    [photo]
  );

  return {
    inputRef,
    photo,
    previewUrl,
    isPreparing,
    error,
    feedbackId,
    choose,
    onInputChange,
    clear,
    applyTo,
  };
}
