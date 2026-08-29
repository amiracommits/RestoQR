import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DinDashboard, {
  CategoriaMenuDin,
  FacturaActiva,
  MesaDin,
  RestauranteDin,
} from "./DinDashboard";

export const dynamic = "force-dynamic";

interface PerfilMesero {
  rol: string;
  restaurante_id: string | null;
  nombre_usuario?: string | null;
}

export default async function DinPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfilData } = await supabase
    .from("perfiles_admin")
    .select("rol, restaurante_id, nombre_usuario")
    .eq("id", user.id)
    .single();

  const perfil = perfilData as PerfilMesero | null;
  const rol = perfil?.rol?.toLowerCase().trim();

  if (!perfil?.restaurante_id || rol !== "meseros") {
    redirect("/unauthorized");
  }

  const { data: restauranteData } = await supabase
    .from("restaurantes")
    .select("id, nombre, slug, logo_url")
    .eq("id", perfil.restaurante_id)
    .single();

  if (!restauranteData) redirect("/unauthorized");

  const restaurante = restauranteData as RestauranteDin;

  const { data: facturasData, error: facturasError } = await supabase
    .from("facturas")
    .select(`
      id,
      total,
      estado,
      numero_pedido_amigable,
      created_at,
      mesa_id,
      mesas (id, numero_mesa),
      detalle_facturas (
        id,
        cantidad,
        precio_unitario,
        subtotal,
        notas,
        productos (nombre)
      )
    `)
    .eq("restaurante_id", perfil.restaurante_id)
    .eq("estado", "generada")
    .order("created_at", { ascending: false });

  if (facturasError) {
    console.error("Error cargando facturas activas para DIN:", facturasError.message);
  }

  const { data: mesasData, error: mesasError } = await supabase
    .from("mesas")
    .select("id, numero_mesa, estado")
    .eq("restaurante_id", perfil.restaurante_id)
    .order("numero_mesa");

  if (mesasError) {
    console.error("Error cargando mesas para DIN:", mesasError.message);
  }

  const { data: productosData, error: productosError } = await supabase
    .from("productos")
    .select(`
      id,
      nombre,
      precio,
      descripcion,
      categorias (id, nombre, orden)
    `)
    .eq("restaurante_id", perfil.restaurante_id)
    .eq("disponible", true)
    .order("nombre");

  if (productosError) {
    console.error("Error cargando menu para DIN:", productosError.message);
  }

  const categoriasMap = new Map<string, CategoriaMenuDin>();

  for (const producto of productosData ?? []) {
    const categoria = Array.isArray(producto.categorias)
      ? producto.categorias[0]
      : producto.categorias;

    if (!categoria?.id) continue;

    if (!categoriasMap.has(categoria.id)) {
      categoriasMap.set(categoria.id, {
        id: categoria.id,
        nombre: categoria.nombre,
        orden: categoria.orden ?? 0,
        items: [],
      });
    }

    categoriasMap.get(categoria.id)?.items.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio ?? 0),
      descripcion: producto.descripcion,
    });
  }

  const menu = Array.from(categoriasMap.values()).sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
  );

  return (
    <DinDashboard
      restaurante={restaurante}
      meseroNombre={perfil.nombre_usuario || user.email || "Mesero"}
      facturas={(facturasData as unknown as FacturaActiva[]) || []}
      mesas={(mesasData as MesaDin[]) || []}
      menu={menu}
    />
  );
}
