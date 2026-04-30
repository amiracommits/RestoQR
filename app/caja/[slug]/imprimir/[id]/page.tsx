// app/caja/[slug]/imprimir/[id]/page.tsx
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

export default async function PaginaImpresion({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Traemos la factura con la nueva metadata tributaria de DEI
  const { data: factura } = await supabase
    .from("facturas")
    .select(`
      *,
      numero_factura,
      nombre_cliente,
      rtn_cliente,
      created_at,
      total,
      mesas (numero_mesa),
      restaurantes (
        razon_social,
        rtn,
        direccion,
        telefono,
        email_facturacion,
        cai,
        logo_url
      ),
      detalle_facturas (
        cantidad,
        precio_unitario,
        subtotal,
        productos (nombre)
      )
    `)
    .eq("id", id)
    .single();

  if (!factura) return notFound();

  return (
    <div className="bg-white min-h-screen p-4 flex justify-center">
      {/* Estilo específico para papel térmico de 80mm y tipografía monoespaciada */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { margin: 0; padding: 0; background: white; }
          @page { size: 80mm auto; margin: 0; }
        }
        .ticket-container { 
          width: 80mm; 
          font-family: 'Courier New', Courier, monospace; 
          line-height: 1.2;
        }
      `}}/>

      <div className="ticket-container text-black text-[11px]">
        {/* --- ENCABEZADO TRIBUTARIO --- */}
        <div className="text-center space-y-1 mb-4">
          {/* 1. Logo del Restaurante */}
          {factura.restaurantes?.logo_url && (
            <div className="flex justify-center mb-2">
              <img 
                src={factura.restaurantes.logo_url} 
                alt="Logo" 
                className="w-20 h-20 object-contain"
              />
            </div>
          )}

          {/* 2. Nombre del Contribuyente (Razón Social) */}
          <h1 className="text-sm font-black uppercase">
            {factura.restaurantes?.razon_social}
          </h1>

          {/* 3. RTN Emisor */}
          <p className="font-bold">RTN: {factura.restaurantes?.rtn}</p>

          {/* 4. Dirección */}
          <p className="px-2">{factura.restaurantes?.direccion}</p>

          {/* 5. Teléfono */}
          <p>Teléfono: {factura.restaurantes?.telefono}</p>

          {/* 6. Correo Electrónico */}
          <p>{factura.restaurantes?.email_facturacion}</p>

          {/* 7. Código CAI (con ajuste de línea para 40 caracteres) */}
          <div className="mt-2 py-1 border-y border-dashed border-black">
            <p className="font-bold text-[10px]">CAI:</p>
            <p className="text-[9px] break-all uppercase">{factura.restaurantes?.cai}</p>
          </div>

          {/* 8. Número de Factura Serializado */}
          <p className="text-sm font-black mt-2">
            FACTURA: {factura.numero_factura || '000-000-00-00000000'}
          </p>
        </div>

        {/* --- DATOS DEL CLIENTE Y MESA --- */}
        <div className="space-y-1 mb-3 text-[10px]">
          <p>FECHA: {new Date(factura.created_at).toLocaleString('es-HN')}</p>
          <p>MESA: {factura.mesas?.numero_mesa}</p>
          <p className="uppercase">CLIENTE: {factura.nombre_cliente || 'CLIENTE FINAL'}</p>
          {factura.rtn_cliente && <p>RTN CLIENTE: {factura.rtn_cliente}</p>}
        </div>

        <div className="border-t border-black my-2"></div>

        {/* --- DETALLE DE PRODUCTOS --- */}
        <table className="w-full text-left mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1">DESC.</th>
              <th className="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {factura.detalle_facturas.map((det: any, i: number) => (
              <tr key={i} className="align-top">
                <td className="py-1 pr-2">
                  {det.cantidad}x {det.productos?.nombre}
                </td>
                <td className="text-right py-1">
                  L. {det.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* --- TOTALES --- */}
        <div className="border-t-2 border-black pt-2 space-y-1">
          <div className="flex justify-between font-black text-sm">
            <span>TOTAL A PAGAR</span>
            <span>L. {factura.total.toFixed(2)}</span>
          </div>
        </div>

        {/* --- PIE DE PÁGINA --- */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-[9px] uppercase">
            Original: Cliente / Copia: Emisor
          </p>
          <p className="italic font-bold">*** ¡GRACIAS POR SU VISITA! ***</p>
        </div>

        {/* Script automático para impresión */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.onload = function() {
            window.print();
            // window.close(); // Opcional: cierra la pestaña tras imprimir
          }
        `}} />
      </div>
    </div>
  );
}
