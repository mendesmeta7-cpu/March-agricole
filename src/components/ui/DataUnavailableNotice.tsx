"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import Alert from "./Alert";
import Button from "./Button";

export interface DataUnavailableNoticeProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Signale une donnée indisponible au sein d'une page qui reste utilisable.
 * « Réessayer » relance les lectures du serveur sans recharger toute la page.
 */
export default function DataUnavailableNotice({
  title,
  children,
  className,
}: DataUnavailableNoticeProps) {
  const router = useRouter();
  const [isRetrying, startRetry] = useTransition();

  return (
    <Alert
      variant="warning"
      title={title}
      className={className}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={isRetrying}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={() => startRetry(() => router.refresh())}
        >
          Réessayer
        </Button>
      }
    >
      {children}
    </Alert>
  );
}
