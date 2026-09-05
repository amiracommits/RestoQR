import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ContaDashboard, { RestauranteConta } from "./contaDashboard";

export const dynamic = "force-dynamic";

interface PerfilConta {
  rol: string | null;
}

export default async function ContaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfilData } = await supabase
    .from("perfiles_admin")
    .select("rol")
    .eq("id", user.id)
    .single();

  const perfil = perfilData as PerfilConta | null;
  const rol = perfil?.rol?.toLowerCase().trim();

  if (rol !== "conta") {
    redirect("/unauthorized");
  }

  const { data: restaurantesData, error: restaurantesError } = await supabase
    .from("restaurantes")
    .select("id, nombre, slug")
    .eq("is_conta_access", true)
    .order("nombre");

  if (restaurantesError) {
    console.error(
      "Error cargando restaurantes para contabilidad:",
      restaurantesError.message,
    );
  }

  return (
    <ContaDashboard
      restaurantes={(restaurantesData as RestauranteConta[]) ?? []}
      contadorNombre={user.email ?? "Contabilidad"}
    />
  );
}
