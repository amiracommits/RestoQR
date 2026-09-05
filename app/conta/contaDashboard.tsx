"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/utils/supabase/client";

export interface RestauranteConta {
  id: string;
  nombre: string;
  slug: string | null;
}

interface ContaDashboardProps {
  restaurantes: RestauranteConta[];
  contadorNombre: string;
}

interface FacturaConta {
  id: string;
  numero_factura: string | null;
  numero_pedido_amigable: number | null;
  total: number | null;
  impuesto_iva_normal: number | null;
  impuesto_iva_especial: number | null;
  forma_pago: string | null;
  nombre_cliente: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
  mesas:
    | { numero_mesa: string | null }[]
    | { numero_mesa: string | null }
    | null;
}

interface ReporteExcelRow {
  "Fecha cierre": string;
  "Fecha creacion": string;
  Restaurante: string;
  "Numero factura": string;
  "Numero pedido": string | number;
  Mesa: string;
  Cliente: string;
  "Forma pago": string;
  Estado: string;
  Total: number;
  "Impuesto normal": number;
  "Impuesto especial": number;
  "Impuesto total": number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);

const todayISO = () => new Date().toISOString().slice(0, 10);

const nextDayISO = (dateISO: string) => {
  const base = new Date(`${dateISO}T00:00:00`);
  base.setDate(base.getDate() + 1);
  return base.toISOString().slice(0, 10);
};

const startOfDayISO = (dateISO: string) => `${dateISO}T00:00:00`;

const getMesaNumero = (factura: FacturaConta) => {
  if (Array.isArray(factura.mesas)) {
    return factura.mesas[0]?.numero_mesa ?? "S/N";
  }

  return factura.mesas?.numero_mesa ?? "S/N";
};

const getImpuestoTotal = (factura: FacturaConta) =>
  Number(factura.impuesto_iva_normal ?? 0) +
  Number(factura.impuesto_iva_especial ?? 0);

export default function ContaDashboard({
  restaurantes,
  contadorNombre,
}: ContaDashboardProps) {
  const supabase = createClient();
  const [restauranteId, setRestauranteId] = useState(restaurantes[0]?.id ?? "");
  const [fechaInicio, setFechaInicio] = useState(todayISO());
  const [fechaFin, setFechaFin] = useState(todayISO());
  const [facturas, setFacturas] = useState<FacturaConta[]>([]);
  const [reporteGenerado, setReporteGenerado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restauranteSeleccionado = useMemo(
    () =>
      restaurantes.find((restaurante) => restaurante.id === restauranteId) ??
      null,
    [restauranteId, restaurantes],
  );

  const resumen = useMemo(
    () =>
      facturas.reduce(
        (acc, factura) => {
          acc.total += Number(factura.total ?? 0);
          acc.impuestoTotal += getImpuestoTotal(factura);
          return acc;
        },
        {
          cantidad: facturas.length,
          total: 0,
          impuestoTotal: 0,
        },
      ),
    [facturas],
  );

  const generarReporte = async () => {
    if (!restauranteId || !fechaInicio || !fechaFin) {
      setError("Debe seleccionar restaurante y rango de fechas.");
      return;
    }

    const fromDate = fechaInicio <= fechaFin ? fechaInicio : fechaFin;
    const toDate = fechaInicio <= fechaFin ? fechaFin : fechaInicio;

    setCargando(true);
    setError(null);
    setReporteGenerado(false);

    const { data, error: facturasError } = await supabase
      .from("facturas")
      .select(
        `
        id,
        numero_factura,
        numero_pedido_amigable,
        total,
        impuesto_iva_normal,
        impuesto_iva_especial,
        forma_pago,
        nombre_cliente,
        estado,
        created_at,
        updated_at,
        mesas (numero_mesa)
      `,
      )
      .eq("restaurante_id", restauranteId)
      .eq("estado", "cerrada")
      .gte("updated_at", startOfDayISO(fromDate))
      .lt("updated_at", startOfDayISO(nextDayISO(toDate)))
      .order("updated_at", { ascending: false });

    if (facturasError) {
      console.error("Error generando reporte contable:", facturasError);
      setError(facturasError.message);
      setFacturas([]);
    } else {
      setFacturas((data as unknown as FacturaConta[]) ?? []);
      setFechaInicio(fromDate);
      setFechaFin(toDate);
    }

    setReporteGenerado(true);
    setCargando(false);
  };

  const exportarExcel = async () => {
    if (facturas.length === 0 || !restauranteSeleccionado) return;

    setExportando(true);

    try {
      const XLSX = await import("xlsx");
      const impuestoNormal = facturas.reduce(
        (acc, factura) => acc + Number(factura.impuesto_iva_normal ?? 0),
        0,
      );
      const impuestoEspecial = facturas.reduce(
        (acc, factura) => acc + Number(factura.impuesto_iva_especial ?? 0),
        0,
      );

      const rows: ReporteExcelRow[] = facturas.map((factura) => ({
        "Fecha cierre": new Date(factura.updated_at).toLocaleString("es-HN"),
        "Fecha creacion": new Date(factura.created_at).toLocaleString("es-HN"),
        Restaurante: restauranteSeleccionado.nombre,
        "Numero factura": factura.numero_factura ?? "N/A",
        "Numero pedido": factura.numero_pedido_amigable ?? "S/N",
        Mesa: getMesaNumero(factura),
        Cliente: factura.nombre_cliente || "CLIENTE FINAL",
        "Forma pago": factura.forma_pago ?? "No definido",
        Estado: factura.estado,
        Total: Number(factura.total ?? 0),
        "Impuesto normal": Number(factura.impuesto_iva_normal ?? 0),
        "Impuesto especial": Number(factura.impuesto_iva_especial ?? 0),
        "Impuesto total": getImpuestoTotal(factura),
      }));

      rows.push({
        "Fecha cierre": "",
        "Fecha creacion": "",
        Restaurante: "TOTAL",
        "Numero factura": "",
        "Numero pedido": "",
        Mesa: "",
        Cliente: "",
        "Forma pago": "",
        Estado: "",
        Total: resumen.total,
        "Impuesto normal": impuestoNormal,
        "Impuesto especial": impuestoEspecial,
        "Impuesto total": resumen.impuestoTotal,
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 28 },
        { wch: 20 },
        { wch: 14 },
        { wch: 10 },
        { wch: 24 },
        { wch: 16 },
        { wch: 12 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
      ];

      const resumenSheet = XLSX.utils.json_to_sheet([
        {
          Restaurante: restauranteSeleccionado.nombre,
          "Fecha 1": fechaInicio,
          "Fecha 2": fechaFin,
          "Count facturas": resumen.cantidad,
          "Sum total": resumen.total,
          "Sum impuesto_total": resumen.impuestoTotal,
        },
      ]);
      resumenSheet["!cols"] = [
        { wch: 28 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 20 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Facturas cerradas");
      XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen");
      XLSX.writeFile(
        workbook,
        `reporte-conta-${restauranteSeleccionado.slug ?? restauranteId}-${fechaInicio}-${fechaFin}.xlsx`,
      );
    } catch (exportError) {
      console.error("Error exportando reporte contable:", exportError);
      setError("No se pudo exportar el archivo XLSX.");
    } finally {
      setExportando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#101214] px-4 py-6 text-neutral-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-white/[0.08] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
              Contabilidad
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Reporte de facturas cerradas
            </h1>
            <p className="mt-1 text-sm text-neutral-400">{contadorNombre}</p>
          </div>
        </header>

        <section className="rounded-lg border border-white/[0.08] bg-[#181b1f] p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,1.3fr)_minmax(160px,0.7fr)_minmax(160px,0.7fr)_auto] lg:items-end">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Restaurante
              </span>
              <select
                value={restauranteId}
                onChange={(event) => setRestauranteId(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-white/[0.12] bg-[#0f1114] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
              >
                {restaurantes.length === 0 ? (
                  <option value="">Sin restaurantes habilitados</option>
                ) : (
                  restaurantes.map((restaurante) => (
                    <option key={restaurante.id} value={restaurante.id}>
                      {restaurante.nombre}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Fecha 1
              </span>
              <input
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-white/[0.12] bg-[#0f1114] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Fecha 2
              </span>
              <input
                type="date"
                value={fechaFin}
                onChange={(event) => setFechaFin(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-white/[0.12] bg-[#0f1114] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
              />
            </label>

            <button
              type="button"
              onClick={generarReporte}
              disabled={cargando || restaurantes.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-500 px-5 text-sm font-semibold text-[#08110d] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              <DocumentMagnifyingGlassIcon className="h-5 w-5" />
              {cargando ? "Generando..." : "Generar reporte"}
            </button>
          </div>

          {error ? (
            <p className="mt-3 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </section>

        {reporteGenerado ? (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-white/[0.08] bg-[#181b1f] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Total facturas
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {resumen.cantidad}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-[#181b1f] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Sum total
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {formatCurrency(resumen.total)}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-[#181b1f] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Sum impuesto total
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {formatCurrency(resumen.impuestoTotal)}
                </p>
              </div>
            </section>

            <section className="rounded-lg border border-white/[0.08] bg-[#181b1f]">
              <div className="flex flex-col gap-3 border-b border-white/[0.08] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {restauranteSeleccionado?.nombre ?? "Restaurante"}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    {fechaInicio} a {fechaFin}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportarExcel}
                  disabled={facturas.length === 0 || exportando}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-400/40 px-4 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-neutral-500"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  {exportando ? "Exportando..." : "Exportar XLSX"}
                </button>
              </div>

              {facturas.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-base font-medium text-neutral-200">
                    No hay facturas cerradas para los filtros aplicados.
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Cambie el restaurante o el rango de fechas.
                  </p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-[1180px] w-full text-left text-sm">
                    <thead className="bg-[#121519] text-xs uppercase tracking-wider text-neutral-500">
                      <tr>
                        <th className="px-4 py-3">Fecha cierre</th>
                        <th className="px-4 py-3">Factura</th>
                        <th className="px-4 py-3">Pedido</th>
                        <th className="px-4 py-3">Mesa</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Pago</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">ISV normal</th>
                        <th className="px-4 py-3 text-right">ISV especial</th>
                        <th className="px-4 py-3 text-right">Impuesto total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {facturas.map((factura) => (
                        <tr key={factura.id} className="hover:bg-white/[0.03]">
                          <td className="whitespace-nowrap px-4 py-3 text-neutral-300">
                            {new Date(factura.updated_at).toLocaleString(
                              "es-HN",
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-neutral-100">
                            {factura.numero_factura || "N/A"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-neutral-300">
                            #{factura.numero_pedido_amigable ?? "S/N"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-neutral-300">
                            {getMesaNumero(factura)}
                          </td>
                          <td className="px-4 py-3 text-neutral-300">
                            {factura.nombre_cliente || "CLIENTE FINAL"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 capitalize text-neutral-300">
                            {(factura.forma_pago || "No definido").toLowerCase()}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-white">
                            {formatCurrency(Number(factura.total ?? 0))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-neutral-300">
                            {formatCurrency(
                              Number(factura.impuesto_iva_normal ?? 0),
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-neutral-300">
                            {formatCurrency(
                              Number(factura.impuesto_iva_especial ?? 0),
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-200">
                            {formatCurrency(getImpuestoTotal(factura))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-dashed border-white/[0.14] bg-[#15181c] px-4 py-12 text-center">
            <p className="text-base font-medium text-neutral-200">
              Genere el reporte para ver las facturas cerradas.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
