// app/caja/[slug]/page.tsx
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import CajaDashboard from "./cajaDashboard";
import { Factura } from "./types"; // 👈 Importamos el tipo

export default async function CajaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // 👈 Importante: En Next 15 es un Promise
  const supabase = await createClient();


  // 1. Traer el restaurante con una consulta limpia
  const { data: restaurante, error: resError } = await supabase
    .from("restaurantes")
    .select("*")
    .eq("slug", slug)
    .single();

  if (resError || !restaurante) {
    return <div>Error: Restaurante no encontrado o sin permisos RLS.</div>;
  }


// 💰 CONSULTA A FACTURAS (Unificadas por mesa)
  const { data: facturas, error } = await supabase
    .from("facturas")
    .select(`
      *,
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
    .eq("restaurante_id", restaurante.id)
    .eq("estado", "generada") // 👈 Solo mostramos lo que está por cobrar
    .order("created_at", { ascending: false });

  if (error) console.error("❌ ERROR FACTURAS:", error.message);

  return (
    <CajaDashboard 
      restaurante={restaurante} 
      facturasIniciales={(facturas as Factura[]) || []} 
    />
  );


}
