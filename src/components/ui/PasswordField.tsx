"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Élément décoratif placé dans le champ, à gauche (icône de cadenas). */
  leftAddon?: React.ReactNode;
}

/**
 * Champ de mot de passe avec bouton « Afficher / Masquer » (Lot UX/UI 5B, fiche AUT-01), sur le
 * modèle de la page de réinitialisation : cible de 44 px, nom accessible qui suit l'état, état
 * annoncé (`aria-pressed`). Le champ reste non contrôlé : sa valeur n'est jamais conservée par l'état.
 */
export default function PasswordField({ className, leftAddon, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {leftAddon}
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(className, "min-h-[44px] pr-12")}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 w-11 flex items-center justify-center rounded-r-xl text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
      >
        {visible ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
