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
      detalle_pedidos(cantidad, notas, productos(nombre, bar_only))
    `,
    )
    .eq("restaurante_id", restaurante.id)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });

  const nombresUsuarios = new Map<string, string>();
  if ((pedidosIniciales ?? []).length > 0) {
    // El RPC une pedidos.usuario_id con perfiles_admin.id y valida el
    // restaurante del solicitante antes de devolver únicamente los nombres.
    const { data: usuariosPedidos, error: usuariosError } = await supabase.rpc(
      "obtener_usuarios_comandas",
      { p_restaurante_id: restaurante.id },
    );
    if (usuariosError) {
      console.error("No se pudieron cargar los usuarios de las comandas:", usuariosError.message);
    }
    for (const usuarioPedido of usuariosPedidos ?? []) {
      if (usuarioPedido.nombre_usuario?.trim()) {
        nombresUsuarios.set(usuarioPedido.pedido_id, usuarioPedido.nombre_usuario.trim());
      }
    }
  }
  // Recuperar los autores que el RPC no resolvió, por ejemplo si todavía no
  // se ha instalado la función SQL. Esta consulta conserva las políticas RLS.
  const usuariosSinNombre = [
    ...new Set<string>(
      (pedidosIniciales ?? [])
        .filter((pedido) => pedido.usuario_id && !nombresUsuarios.has(pedido.id))
        .map((pedido) => pedido.usuario_id as string),
    ),
  ];
  if (usuariosSinNombre.length > 0) {
    const { data: autores, error: autoresError } = await supabase
      .from("perfiles_admin")
      .select("id, nombre_usuario")
      .in("id", usuariosSinNombre);

    if (autoresError) {
      console.error("No se pudieron consultar los autores de las comandas:", autoresError.message);
    }

    const nombresPorUsuario = new Map<string, string>();
    for (const autor of autores ?? []) {
      if (autor.nombre_usuario?.trim()) {
        nombresPorUsuario.set(autor.id, autor.nombre_usuario.trim());
      }
    }
    for (const pedido of pedidosIniciales ?? []) {
      const nombre = nombresPorUsuario.get(pedido.usuario_id);
      if (!nombresUsuarios.has(pedido.id) && nombre) {
        nombresUsuarios.set(pedido.id, nombre);
      }
    }
  }
  const pedidosConUsuario = (pedidosIniciales ?? []).map((pedido) => ({
    ...pedido,
    usuario_nombre: nombresUsuarios.get(pedido.id) ?? null,
  }));

  return (
    <main className="min-h-screen bg-[#0F172A] text-white p-6 md:p-10">
      <KitchenDashboard
        restaurante={restaurante}
        pedidosIniciales={pedidosConUsuario}
      />
    </main>
  );
}
