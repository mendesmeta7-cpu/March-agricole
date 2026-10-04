"use client";

import React from "react";
import { CatalogProduct } from "@/lib/queries/products";
import AddProductDrawer from "@/components/products/AddProductDrawer";

export interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts: CatalogProduct[];
  onSuccess?: () => void;
}

export default function AddProductModal({
  isOpen,
  onClose,
  catalogProducts,
  onSuccess,
}: AddProductModalProps) {
  return (
    <AddProductDrawer
      isOpen={isOpen}
      onClose={onClose}
      catalogProducts={catalogProducts}
      onSuccess={onSuccess}
    />
  );
}
