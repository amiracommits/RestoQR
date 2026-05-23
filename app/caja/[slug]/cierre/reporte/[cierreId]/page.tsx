import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

export default async function ReporteCierrePage({
  params,
}: {
  params: Promise<{ slug: string; cierreId: string }>;
}) {
  const { slug, cierreId } = await params;
  const supabase = await createClient();

  const { data: restaurante } = await supabase
    .from("restaurantes")
    .select("id, nombre, logo_url")
    .eq("slug", slug)
    .single();

  if (!restaurante) return notFound();

  const { data: cierre } = await supabase
    .from("cierres_caja")
    .select("*")
    .eq("id", cierreId)
    .eq("restaurante_id", restaurante.id)
    .single();

  if (!cierre) return notFound();

  const { data: facturas } = await supabase
    .from("facturas")
    .select(`
      id, numero_factura, numero_pedido_amigable, total, forma_pago,
      impuesto_iva_normal, impuesto_iva_especial, updated_at, mesas(numero_mesa)
    `)
    .eq("restaurante_id", restaurante.id)
    .eq("estado", "cerrada")
    .order("updated_at", { ascending: false })
    .limit(cierre.cantidad_facturas);

  return (
    <div className="bg-white min-h-screen p-4">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { @page { size: A4; margin: 10mm; } }
      `}} />
      {/* Renderiza aquí el mismo contenido de arqueo */}
      <h1>Reporte de Cierre - {restaurante.nombre}</h1>
      {/* ...totales + tabla... */}
      <script dangerouslySetInnerHTML={{ __html: `window.onload = () => window.print();` }} />
    </div>
  );
}