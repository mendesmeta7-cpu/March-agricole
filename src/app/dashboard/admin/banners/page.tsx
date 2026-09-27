import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllFeedBannersAdmin } from "@/lib/queries/feedBanners";
import AdminBannersView from "@/components/admin/AdminBannersView";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBannersPage() {
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

  const banners = await getAllFeedBannersAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Bannières du Flux"
        description="Créez et organisez les visuels du carrousel dynamique d'accueil avec vos visuels Cloudinary."
        badge={<Badge variant="forest">Contenu du Flux</Badge>}
      />

      <AdminBannersView banners={banners} />
    </div>
  );
}
