import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ejecutarCierreCaja } from "../actions";

type FacturaPagada = {
  id: string;
  numero_factura: string | null;
  numero_pedido_amigable: number | null;
  total: number;
  forma_pago: "efectivo" | "tarjeta" | "transferencia" | null;
  impuesto_iva_normal: number | null;
  impuesto_iva_especial: number | null;
  created_at: string;
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


export default async function CierreCajaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurante, error: restauranteError } = await supabase
    .from("restaurantes")
    .select("id, nombre, logo_url, slug")
    .eq("slug", slug)
    .single();

  if (restauranteError || !restaurante) return notFound();

  const { data: facturasPagadas, error: facturasError } = await supabase
    .from("facturas")
    .select(`
      id,
      numero_factura,
      numero_pedido_amigable,
      total,
      forma_pago,
      impuesto_iva_normal,
      impuesto_iva_especial,
      created_at,
      mesas (numero_mesa)
    `)
    .eq("restaurante_id", restaurante.id)
    .eq("estado", "pagada")
    .order("created_at", { ascending: true });

  if (facturasError) {
    return (
      <main className="min-h-screen bg-slate-900 p-6 text-slate-200">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Error al cargar facturas pagadas: {facturasError.message}
        </p>
      </main>
    );
  }

  const facturas = (facturasPagadas ?? []) as FacturaPagada[];

  const totalFacturado = facturas.reduce((acc, f) => acc + Number(f.total ?? 0), 0);
  const totalISVNormal = facturas.reduce(
    (acc, f) => acc + Number(f.impuesto_iva_normal ?? 0),
    0,
  );
  const totalISVEspecial = facturas.reduce(
    (acc, f) => acc + Number(f.impuesto_iva_especial ?? 0),
    0,
  );
  const totalISV = totalISVNormal + totalISVEspecial;
  const baseSinImpuesto = totalFacturado - totalISV;
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
    <main className="min-h-screen bg-slate-900 p-6">
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-slate-800/70">
            {restaurante.logo_url ? (
              <img
                src={restaurante.logo_url}
                alt={`Logo ${restaurante.nombre}`}
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Logo
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-orange-500">
              {restaurante.nombre}
            </h1>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
              Arqueo y Cierre de Caja
            </p>
          </div>
        </div>
        <Link
          href={`/caja/${slug}`}
          className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
        >
          Volver a Caja
        </Link>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/[0.07] bg-slate-800/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Facturas pagadas
          </p>
          <p className="mt-2 text-2xl font-black text-white">{facturas.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-slate-800/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Base sin impuesto
          </p>
          <p className="mt-2 text-2xl font-black text-slate-100">L. {baseSinImpuesto.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-slate-800/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            ISV total
          </p>
          <p className="mt-2 text-2xl font-black text-slate-100">L. {totalISV.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-300">
            Total arqueo
          </p>
          <p className="mt-2 text-2xl font-black text-orange-300">L. {totalFacturado.toFixed(2)}</p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            Total en efectivo
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-300">L. {totalEfectivo.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
            Total en tarjeta
          </p>
          <p className="mt-2 text-2xl font-black text-sky-300">L. {totalTarjeta.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300">
            Total en transferencia
          </p>
          <p className="mt-2 text-2xl font-black text-violet-300">
            L. {totalTransferencia.toFixed(2)}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/70">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Mesa</th>
                <th className="px-4 py-3 text-right">ISV 15%</th>
                <th className="px-4 py-3 text-right">ISV 18%</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/70">
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No hay facturas pagadas para cerrar.
                  </td>
                </tr>
              ) : (
                facturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(factura.created_at).toLocaleString("es-HN")}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-100">
                      {factura.numero_factura || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      #{factura.numero_pedido_amigable ?? "S/N"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {factura.mesas?.[0]?.numero_mesa ?? "S/N"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      L. {Number(factura.impuesto_iva_normal ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      L. {Number(factura.impuesto_iva_especial ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-300">
                      L. {Number(factura.total ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 flex flex-col items-stretch justify-end gap-3 sm:flex-row">
        <Link
          href={`/caja/${slug}`}
          className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold uppercase tracking-wider text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
        >
          Cancelar
        </Link>
        <form action={ejecutarCierreCaja}>
          <input type="hidden" name="restaurante_id" value={restaurante.id} />
          <input type="hidden" name="slug" value={slug} />
          <button
            type="submit"
            disabled={facturas.length === 0}
            className={`w-full rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors sm:w-auto ${
              facturas.length === 0
                ? "cursor-not-allowed bg-orange-500/40"
                : "bg-orange-600 hover:bg-orange-500"
            }`}
          >
            Cerrar Caja
          </button>
        </form>
      </section>
    </main>
  );
}
