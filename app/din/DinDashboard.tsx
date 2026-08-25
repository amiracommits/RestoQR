"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightOnRectangleIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/utils/supabase/client";

export interface DetalleFacturaActiva {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas?: string | null;
  productos: {
    nombre: string;
  };
}

export interface FacturaActiva {
  id: string;
  total: number;
  estado: string;
  numero_pedido_amigable: number | null;
  created_at: string;
  mesa_id: string;
  mesas: {
    id: string;
    numero_mesa: string;
  } | null;
  detalle_facturas: DetalleFacturaActiva[];
}

export interface RestauranteDin {
  id: string;
  nombre: string;
  slug: string;
  logo_url?: string | null;
}

export interface ProductoMenuDin {
  id: string;
  nombre: string;
  precio: number;
  descripcion?: string | null;
}

export interface CategoriaMenuDin {
  id: string;
  nombre: string;
  orden?: number | null;
  items: ProductoMenuDin[];
}

interface DinDashboardProps {
  restaurante: RestauranteDin;
  facturas: FacturaActiva[];
  menu: CategoriaMenuDin[];
}

interface ProductoSeleccionado {
  producto: ProductoMenuDin;
  cantidad: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
  }).format(value);

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function DinDashboard({
  restaurante,
  facturas,
  menu,
}: DinDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [facturaSeleccionada, setFacturaSeleccionada] =
    useState<FacturaActiva | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [categoriaSeleccionadaId, setCategoriaSeleccionadaId] = useState(
    menu[0]?.id ?? "",
  );
  const [seleccionados, setSeleccionados] = useState<
    Record<string, ProductoSeleccionado>
  >({});
  const [facturasExpandidas, setFacturasExpandidas] = useState<
    Record<string, boolean>
  >({});
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const totalActivo = useMemo(
    () => facturas.reduce((acc, factura) => acc + Number(factura.total ?? 0), 0),
    [facturas],
  );

  const categoriaSeleccionada = useMemo(
    () =>
      menu.find((categoria) => categoria.id === categoriaSeleccionadaId) ??
      menu[0],
    [categoriaSeleccionadaId, menu],
  );

  const productosSeleccionados = useMemo(
    () => Object.values(seleccionados),
    [seleccionados],
  );

  const totalAAgregar = useMemo(
    () =>
      productosSeleccionados.reduce(
        (acc, item) => acc + Number(item.producto.precio ?? 0) * item.cantidad,
        0,
      ),
    [productosSeleccionados],
  );

  const cantidadAAgregar = useMemo(
    () =>
      productosSeleccionados.reduce((acc, item) => acc + item.cantidad, 0),
    [productosSeleccionados],
  );

  const totalFacturaProcesada = useMemo(
    () => Number(facturaSeleccionada?.total ?? 0) + totalAAgregar,
    [facturaSeleccionada?.total, totalAAgregar],
  );

  const abrirModal = (factura: FacturaActiva) => {
    setFacturaSeleccionada(factura);
    setSeleccionados({});
    setResumenAbierto(false);
    setErrorModal(null);
    setModalAbierto(true);
    if (!categoriaSeleccionadaId && menu[0]?.id) {
      setCategoriaSeleccionadaId(menu[0].id);
    }
  };

  const toggleFacturaExpandida = (facturaId: string) => {
    setFacturasExpandidas((current) => ({
      ...current,
      [facturaId]: !current[facturaId],
    }));
  };

  const handleLogout = async () => {
    const channels = supabase.getChannels();
    channels.forEach((ch) => supabase.removeChannel(ch));
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const cambiarCantidad = (producto: ProductoMenuDin, delta: number) => {
    setSeleccionados((current) => {
      const actual = current[producto.id]?.cantidad ?? 0;
      const siguiente = Math.max(0, actual + delta);
      const copia = { ...current };

      if (siguiente === 0) {
        delete copia[producto.id];
      } else {
        copia[producto.id] = { producto, cantidad: siguiente };
      }

      return copia;
    });
  };

  const insertarProductos = async () => {
    if (!facturaSeleccionada || productosSeleccionados.length === 0) return;

    setGuardando(true);
    setErrorModal(null);

    try {
      const { error } = await supabase.rpc("agregar_productos_factura_mesero", {
        p_factura_id: facturaSeleccionada.id,
        p_items: productosSeleccionados.map((item) => ({
          producto_id: item.producto.id,
          cantidad: item.cantidad,
        })),
      });

      if (error) throw error;

      setSeleccionados({});
      setResumenAbierto(false);
      setModalAbierto(false);
      setFacturaSeleccionada(null);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron agregar los productos a la factura.";
      setErrorModal(message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f0f0f] px-4 pb-8 pt-5 text-neutral-100">
      <header className="sticky top-0 z-10 -mx-4 border-b border-white/[0.07] bg-[#0f0f0f]/95 px-4 pb-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
              {restaurante.logo_url ? (
                <img
                  src={restaurante.logo_url}
                  alt={`Logo ${restaurante.nombre}`}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <span className="text-[10px] font-black uppercase text-neutral-600">
                  DIN
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-100">
                {restaurante.nombre}
              </p>
              <h1 className="text-xl font-black tracking-tight">Mesero</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-3 text-xs font-black uppercase tracking-wide text-neutral-300 transition-colors hover:border-red-400/40 hover:text-red-300"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Terminar sesion</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.07] bg-[#1a1a1a] p-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
              Cuentas
            </p>
            <p className="mt-1 text-2xl font-black">{facturas.length}</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#1a1a1a] p-3">
            <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
              Activo
            </p>
            <p className="mt-1 text-lg font-black">{formatCurrency(totalActivo)}</p>
          </div>
        </div>
      </header>

      <section className="mt-5 space-y-4">
        {facturas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#1a1a1a] px-5 py-12 text-center">
            <p className="text-base font-semibold text-neutral-200">
              No hay facturas activas
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Las cuentas abiertas del restaurante apareceran aqui.
            </p>
          </div>
        ) : (
          facturas.map((factura) => {
            const expandida = facturasExpandidas[factura.id] ?? false;
            const detallesVisibles = expandida
              ? factura.detalle_facturas
              : factura.detalle_facturas.slice(0, 4);
            const productosOcultos = Math.max(
              factura.detalle_facturas.length - 4,
              0,
            );

            return (
              <article
                key={factura.id}
                className="rounded-2xl border border-white/[0.08] bg-[#1a1a1a] p-4 shadow-xl shadow-black/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">
                      Mesa {factura.mesas?.numero_mesa ?? "S/N"}
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      Pedido #{factura.numero_pedido_amigable ?? "S/N"}
                    </h2>
                  </div>
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase text-emerald-300">
                    Activa
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {detallesVisibles.map((detalle) => (
                    <div
                      key={detalle.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 text-neutral-300">
                        {detalle.cantidad}x {detalle.productos.nombre}
                      </span>
                      <span className="shrink-0 font-semibold text-neutral-100">
                        {formatCurrency(Number(detalle.subtotal ?? 0))}
                      </span>
                    </div>
                  ))}
                  {productosOcultos > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleFacturaExpandida(factura.id)}
                      className="text-left text-xs font-bold uppercase tracking-wide text-orange-300 transition-colors active:text-orange-200"
                    >
                      {expandida
                        ? "Ver menos"
                        : `+${productosOcultos} productos mas`}
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-end justify-between border-t border-white/[0.07] pt-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                      Hora
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-300">
                      {formatTime(factura.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                      Total
                    </p>
                    <p className="mt-1 text-2xl font-black text-orange-400">
                      {formatCurrency(Number(factura.total ?? 0))}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => abrirModal(factura)}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 text-sm font-black uppercase tracking-wide text-orange-200 transition-colors active:bg-orange-500/20"
                >
                  <PlusIcon className="h-5 w-5" />
                  Agregar producto
                </button>
              </article>
            );
          })
        )}
      </section>

      {modalAbierto && facturaSeleccionada && (
        <div className="fixed inset-0 z-30 bg-black/70 p-0 backdrop-blur-sm sm:px-3 sm:py-4">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden bg-[#141414] shadow-2xl shadow-black sm:rounded-2xl sm:border sm:border-white/[0.08]">
            <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">
                    Mesa {facturaSeleccionada.mesas?.numero_mesa ?? "S/N"}
                  </p>
                  <h2 className="truncate text-lg font-black">
                    Agregar productos a factura
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResumenAbierto(false);
                    setModalAbierto(false);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-neutral-300"
                  aria-label="Cerrar modal"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] md:grid-cols-[220px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_auto]">
              <aside className="min-w-0 border-b border-white/[0.08] p-3 md:row-span-2 md:border-b-0 md:border-r">
                <div className="flex max-w-full gap-2 overflow-x-auto md:block md:space-y-2 md:overflow-visible">
                  {menu.map((categoria) => (
                    <button
                      key={categoria.id}
                      type="button"
                      onClick={() => setCategoriaSeleccionadaId(categoria.id)}
                      className={`h-11 shrink-0 rounded-xl px-4 text-left text-sm font-bold transition-colors md:w-full ${
                        categoriaSeleccionada?.id === categoria.id
                          ? "bg-white text-neutral-950"
                          : "border border-white/[0.08] text-neutral-300"
                      }`}
                    >
                      {categoria.nombre}
                    </button>
                  ))}
                </div>
              </aside>

              <section className="min-h-0 min-w-0 overflow-y-auto p-3 md:p-4">
                {categoriaSeleccionada ? (
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {categoriaSeleccionada.items.map((producto) => {
                      const cantidad = seleccionados[producto.id]?.cantidad ?? 0;

                      return (
                        <article
                          key={producto.id}
                          onClick={() => cambiarCantidad(producto, 1)}
                          className={`rounded-xl border p-3 transition-colors active:scale-[0.99] ${
                            cantidad > 0
                              ? "border-orange-400/50 bg-orange-500/10"
                              : "border-white/[0.08] bg-white/[0.03]"
                          }`}
                        >
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-black">
                              {producto.nombre}
                            </h3>
                            {producto.descripcion && (
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">
                                {producto.descripcion}
                              </p>
                            )}
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <p className="text-base font-black text-orange-400">
                                {formatCurrency(Number(producto.precio ?? 0))}
                              </p>
                              <div className="grid grid-cols-[36px_34px_36px] items-center rounded-xl border border-white/[0.08] bg-black/20">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    cambiarCantidad(producto, -1);
                                  }}
                                  className="flex h-9 items-center justify-center text-neutral-300 disabled:text-neutral-700"
                                  disabled={cantidad === 0}
                                  aria-label={`Restar ${producto.nombre}`}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </button>
                                <span className="text-center text-sm font-black">
                                  {cantidad}
                                </span>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    cambiarCantidad(producto, 1);
                                  }}
                                  className="flex h-9 items-center justify-center text-orange-300"
                                  aria-label={`Agregar ${producto.nombre}`}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/[0.12] p-8 text-center text-sm text-neutral-500">
                    No hay productos disponibles para este restaurante.
                  </div>
                )}
              </section>

              <div className="min-w-0 shrink-0 border-t border-white/[0.08] bg-[#111] p-3 md:col-start-2 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                      Seleccionados
                    </p>
                    <p className="mt-1 truncate text-sm font-black text-yellow-300">
                      {cantidadAAgregar} items nuevos · {formatCurrency(totalAAgregar)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResumenAbierto(true)}
                    disabled={productosSeleccionados.length === 0}
                    className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#E85D26] px-5 text-center text-sm font-black uppercase tracking-wide text-white transition-colors active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                  >
                    Ver resumen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {resumenAbierto && facturaSeleccionada && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
          <div className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-white/[0.08] bg-[#141414] shadow-2xl shadow-black sm:mx-auto sm:max-w-md sm:rounded-2xl sm:border">
            <div className="shrink-0 border-b border-white/[0.08] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-yellow-300">
                    Resumen
                  </p>
                  <h2 className="truncate text-lg font-black">
                    Revisar productos
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setResumenAbierto(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-neutral-300"
                  aria-label="Cerrar resumen"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">Factura actual</span>
                  <span className="font-bold text-neutral-100">
                    {formatCurrency(Number(facturaSeleccionada.total ?? 0))}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-neutral-400">Items nuevos</span>
                  <span className="font-black text-yellow-300">
                    {cantidadAAgregar}
                  </span>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {productosSeleccionados.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-neutral-500">
                  Selecciona productos y cantidades.
                </p>
              ) : (
                productosSeleccionados.map((item) => (
                  <article
                    key={item.producto.id}
                    className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-black text-yellow-300">
                          {item.producto.nombre}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-neutral-400">
                          {formatCurrency(item.producto.precio)} c/u
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-yellow-300">
                        {formatCurrency(item.producto.precio * item.cantidad)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                        Cantidad
                      </span>
                      <div className="grid grid-cols-[42px_42px_42px] items-center rounded-xl border border-white/[0.08] bg-black/20">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.producto, -1)}
                          className="flex h-10 items-center justify-center text-neutral-300"
                          aria-label={`Restar ${item.producto.nombre}`}
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="text-center text-base font-black text-neutral-100">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.producto, 1)}
                          className="flex h-10 items-center justify-center text-yellow-300"
                          aria-label={`Agregar ${item.producto.nombre}`}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="shrink-0 border-t border-white/[0.08] bg-[#111] px-4 py-4">
              {errorModal && (
                <p className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                  {errorModal}
                </p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-neutral-400">A agregar</span>
                  <span className="text-lg font-black text-yellow-300">
                    {formatCurrency(totalAAgregar)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-neutral-400">Total factura</span>
                  <span className="text-xl font-black text-neutral-100">
                    {formatCurrency(totalFacturaProcesada)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={insertarProductos}
                disabled={guardando || productosSeleccionados.length === 0}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-[#E85D26] px-4 text-center text-sm font-black uppercase tracking-wide text-white transition-colors active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
              >
                {guardando ? "PROCESANDO..." : "CONFIRMAR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
