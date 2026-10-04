"use client";

import React from "react";
import { CompanyProductItem } from "@/lib/queries/products";
import EditProductDrawer from "@/components/products/EditProductDrawer";

export interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productItem: CompanyProductItem | null;
  onToggleStatus?: (item: CompanyProductItem) => void;
  onDelete?: (item: CompanyProductItem) => void;
  onSuccess?: () => void;
}

export default function EditProductModal({
  isOpen,
  onClose,
  productItem,
  onToggleStatus = () => {},
  onDelete = () => {},
  onSuccess,
}: EditProductModalProps) {
  return (
    <EditProductDrawer
      isOpen={isOpen}
      onClose={onClose}
      productItem={productItem}
      onToggleStatus={onToggleStatus}
      onDelete={onDelete}
      onSuccess={onSuccess}
    />
  );
}
