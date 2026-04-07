// app/cocina/[slug]/page.tsx
import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import KitchenDashboard from "./KitchenDashboard";

export const dynamic = "force-dynamic";

export default async function CocinaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Validar Sesión
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Obtener data de usuario para parche de seguridad detectado por el usuario tukumita
  const { data: perfil } = await supabase
    .from("perfiles_admin")
    .select("restaurante_id, rol")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");

  // 1. Traer el restaurante con una consulta limpia
  const { data: restaurante, error: resError } = await supabase
    .from("restaurantes")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!restaurante) return notFound(); // Si no hay restaurante, ni siquiera intenta renderizar

  // 🔥 4. VALIDACIÓN DE SEGURIDAD (Autorización Multi-tenant)
  // Si no es el administrador global y el ID del restaurante no coincide... ¡AFUERA!
  if (
    perfil.rol !== "super_admin" &&
    perfil.restaurante_id !== restaurante.id
  ) {
    console.error(
      `Intento de acceso no autorizado: Usuario ${user.email} trató de entrar a ${slug}`,
    );
    redirect("/unauthorized"); // O una página de "Acceso Denegado"
  }

  // 5. Cargar pedidos iniciales
  const { data: pedidosIniciales } = await supabase
    .from("pedidos")
    .select(
      `
      *,
      mesas(numero_mesa),
      detalle_pedidos(cantidad, notas, productos(nombre))
    `,
    )
    .eq("restaurante_id", restaurante.id)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen bg-[#0F172A] text-white p-6 md:p-10">
      <KitchenDashboard
        restaurante={restaurante}
        pedidosIniciales={pedidosIniciales || []}
      />
    </main>
  );
}
