import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AccionesConfirmacion from "./AccionesConfirmacion";

type CierreCaja = {
  id: string;
  fecha_cierre: string;
  cantidad_facturas: number;
  total_facturado: number;
  total_isv_normal: number;
  total_isv_especial: number;
  total_isv: number;
  base_sin_impuesto: number;
};

type FacturaCerrada = {
  id: string;
  numero_factura: string | null;
  numero_pedido_amigable: number | null;
  total: number;
  forma_pago: "efectivo" | "tarjeta" | "transferencia" | null;
  impuesto_iva_normal: number | null;
  impuesto_iva_especial: number | null;
  updated_at: string;
  mesas: { numero_mesa: string | null }[] | null;
};

const normalizarFormaPago = (
  formaPago: string | null | undefined,
): "efectivo" | "tarjeta" | "transferencia" | "otro" => {
  const valor = (formaPago ?? "").trim().toLowerCase();
  if (!valor) return "otro";
  if (valor.includes("efectivo")) return "efectivo";
  if (valor.includes("tarjeta") || valor.includes("voucher")) return "tarjeta";
  if (valor.includes("transfer")) return "transferencia";
  return "otro";
};

export default async function ConfirmacionCierrePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cierre?: string }>;
}) {
  const { slug } = await params;
  const { cierre } = await searchParams;
  const supabase = await createClient();

  const { data: restaurante } = await supabase
    .from("restaurantes")
    .select("id, nombre, logo_url")
    .eq("slug", slug)
    .single();

  if (!restaurante) return notFound();

  let cierreCaja: CierreCaja | null = null;

  if (cierre) {
    const { data } = await supabase
      .from("cierres_caja")
      .select(
        "id, fecha_cierre, cantidad_facturas, total_facturado, total_isv_normal, total_isv_especial, total_isv, base_sin_impuesto",
      )
      .eq("id", cierre)
      .eq("restaurante_id", restaurante.id)
      .single();
    cierreCaja = (data as CierreCaja) ?? null;
  }

  if (!cierreCaja) {
    const { data } = await supabase
      .from("cierres_caja")
      .select(
        "id, fecha_cierre, cantidad_facturas, total_facturado, total_isv_normal, total_isv_especial, total_isv, base_sin_impuesto",
      )
      .eq("restaurante_id", restaurante.id)
      .order("fecha_cierre", { ascending: false })
      .limit(1)
      .single();

    cierreCaja = (data as CierreCaja) ?? null;
  }

  if (!cierreCaja) {
    return (
      <main className="min-h-screen bg-slate-900 p-6">
        <section className="mx-auto max-w-2xl rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6 text-center">
          <h1 className="text-xl font-black uppercase tracking-tight text-orange-300">
            Cierre ejecutado
          </h1>
          <p className="mt-3 text-sm text-slate-200">
            El cierre fue ejecutado, pero no se encontró el resumen para mostrar en esta vista.
          </p>
            <div className="mt-6">
            <Link
            href={`/caja/${slug}/cierre/reporte/${cierre ?? ""}`}
            target="_blank"
            className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-orange-500"
          >
            Generar reporte
          </Link>
          </div>
          <div className="mt-6">
            <Link
              href={`/caja/${slug}`}
              className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-orange-500"
            >
              Volver al Dashboard de Caja
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { data: facturasCerradas } = await supabase
    .from("facturas")
    .select(`
      id,
      numero_factura,
      numero_pedido_amigable,
      total,
      forma_pago,
      impuesto_iva_normal,
      impuesto_iva_especial,
      updated_at,
      mesas (numero_mesa)
    `)
    .eq("restaurante_id", restaurante.id)
    .eq("estado", "cerrada")
    .order("updated_at", { ascending: false })
    .limit(cierreCaja.cantidad_facturas);

  const facturas = ((facturasCerradas ?? []) as FacturaCerrada[]).reverse();
  const totalEfectivo = facturas.reduce(
    (acc, f) =>
      acc +
      (normalizarFormaPago(f.forma_pago) === "efectivo"
        ? Number(f.total ?? 0)
        : 0),
    0,
  );
  const totalTarjeta = facturas.reduce(
    (acc, f) =>
      acc +
      (normalizarFormaPago(f.forma_pago) === "tarjeta"
        ? Number(f.total ?? 0)
        : 0),
    0,
  );
  const totalTransferencia = facturas.reduce(
    (acc, f) =>
      acc +
      (normalizarFormaPago(f.forma_pago) === "transferencia"
        ? Number(f.total ?? 0)
        : 0),
    0,
  );

  return (
    <main className="min-h-screen bg-slate-900 p-6 print:bg-white print:p-4">
      <header className="mb-6 border-b border-slate-800 pb-4 print:border-black">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-slate-800/70 print:border-black print:bg-white">
              {restaurante.logo_url ? (
                <img
                  src={restaurante.logo_url}
                  alt={`Logo ${restaurante.nombre}`}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 print:text-black">
                  Logo
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-orange-500 print:text-black">
                {restaurante.nombre}
              </h1>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 print:text-black">
                Cierre de Caja Ejecutado Correctamente
              </p>
              <p className="mt-2 text-xs text-slate-400 print:text-black">
                Fecha: {new Date(cierreCaja.fecha_cierre).toLocaleString("es-HN")}
              </p>
            </div>
          </div>
          <Link
            href={`/caja/${slug}`}
            className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-slate-500 hover:text-white print:hidden"
          >
            Volver
          </Link>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/[0.07] bg-slate-800/70 p-4 print:border-black print:bg-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-black">
            Facturas cerradas
          </p>
          <p className="mt-2 text-2xl font-black text-white print:text-black">
            {cierreCaja.cantidad_facturas}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-slate-800/70 p-4 print:border-black print:bg-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-black">
            Base sin impuesto
          </p>
          <p className="mt-2 text-2xl font-black text-slate-100 print:text-black">
            L. {Number(cierreCaja.base_sin_impuesto ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-slate-800/70 p-4 print:border-black print:bg-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-black">
            ISV total
          </p>
          <p className="mt-2 text-2xl font-black text-slate-100 print:text-black">
            L. {Number(cierreCaja.total_isv ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 print:border-black print:bg-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-300 print:text-black">
            Total arqueo
          </p>
          <p className="mt-2 text-2xl font-black text-orange-300 print:text-black">
            L. {Number(cierreCaja.total_facturado ?? 0).toFixed(2)}
          </p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 print:border-black print:bg-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 print:text-black">
            Total en efectivo
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-300 print:text-black">
            L. {totalEfectivo.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 print:border-black print:bg-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300 print:text-black">
            Total en tarjeta
          </p>
          <p className="mt-2 text-2xl font-black text-sky-300 print:text-black">
            L. {totalTarjeta.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 print:border-black print:bg-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300 print:text-black">
            Total en transferencia
          </p>
          <p className="mt-2 text-2xl font-black text-violet-300 print:text-black">
            L. {totalTransferencia.toFixed(2)}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/70 print:border-black print:bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400 print:bg-white print:text-black">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Mesa</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 text-right">ISV 15%</th>
                <th className="px-4 py-3 text-right">ISV 18%</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/70 print:divide-black">
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 print:text-black">
                    No se encontraron facturas asociadas al cierre.
                  </td>
                </tr>
              ) : (
                facturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-slate-700/30 print:hover:bg-transparent">
                    <td className="px-4 py-3 text-slate-300 print:text-black">
                      {new Date(factura.updated_at).toLocaleString("es-HN")}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-100 print:text-black">
                      {factura.numero_factura || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 print:text-black">
                      #{factura.numero_pedido_amigable ?? "S/N"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 print:text-black">
                      {factura.mesas?.[0]?.numero_mesa ?? "S/N"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 capitalize print:text-black">
                      {factura.forma_pago ?? "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 print:text-black">
                      L. {Number(factura.impuesto_iva_normal ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 print:text-black">
                      L. {Number(factura.impuesto_iva_especial ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-300 print:text-black">
                      L. {Number(factura.total ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AccionesConfirmacion slug={slug} />
    </main>
  );
}
