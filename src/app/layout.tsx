import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Radiza — Plateforme Agricole B2B",
  description: "Infrastructure numérique B2B de mise en relation et de distribution de produits agricoles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="antialiased font-sans flex flex-col min-h-screen text-gray-900 bg-gray-50 overflow-x-hidden">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
