"use client";

import React from "react";
import { ProductionItem } from "@/lib/queries/productions";
import { CompanyProductItem } from "@/lib/queries/products";
import ProductionDrawer from "./ProductionDrawer";

interface ProductionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProducts: CompanyProductItem[];
  editingProduction?: ProductionItem | null;
  onSuccess?: (message: string) => void;
}

/**
 * Wrapper rétrocompatible assurant la continuité de l'interface
 * tout en exploitant le tiroir moderne ProductionDrawer R1.
 */
export default function ProductionFormModal({
  isOpen,
  onClose,
  companyProducts,
  editingProduction,
  onSuccess,
}: ProductionFormModalProps) {
  return (
    <ProductionDrawer
      isOpen={isOpen}
      onClose={onClose}
      companyProducts={companyProducts}
      editingProduction={editingProduction}
      onSuccess={onSuccess}
    />
  );
}
