import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllFeedCategoriesAdmin } from "@/lib/queries/feedCategories";
import AdminCategoriesView from "@/components/admin/AdminCategoriesView";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Vérification rôle admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const categories = await getAllFeedCategoriesAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Catégories du Flux"
        description="Associez des visuels illustratifs haute définition aux filtres de catégories du Flux revendeur."
        badge={<Badge variant="forest">Contenu du Flux</Badge>}
      />

      <AdminCategoriesView categories={categories} />
    </div>
  );
}
