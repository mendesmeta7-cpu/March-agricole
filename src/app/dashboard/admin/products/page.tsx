import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAdminCatalogProducts } from "@/lib/queries/products";
import AdminProductsView from "@/components/admin/AdminProductsView";

export default async function AdminProductsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/admin/products");
  }

  // Vérification de rôle admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  // Chargement des données réelles du catalogue officiel
  const products = await getAdminCatalogProducts();

  return <AdminProductsView initialProducts={products} />;
}
