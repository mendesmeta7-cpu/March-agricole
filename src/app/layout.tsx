import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marché Agricole B2B — Plateforme de Mise en Relation",
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
        {children}
      </body>
    </html>
  );
}
