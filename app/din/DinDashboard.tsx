"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightOnRectangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/utils/supabase/client";
import PedidoEditor, { type UnidadPedido } from "./PedidoEditor";

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
    localidades?: { nombre: string } | { nombre: string }[] | null;
  } | null;
  detalle_facturas: DetalleFacturaActiva[];
}

export interface RestauranteDin {
  id: string;
  nombre: string;
  slug: string;
  is_caja_abierta?: boolean | null;
  logo_url?: string | null;
}

export interface MesaDin {
  id: string;
  numero_mesa: string;
  estado?: string | null;
  localidades?: { nombre: string } | { nombre: string }[] | null;
}

export interface ProductoMenuDin {
  id: string;
  nombre: string;
  precio: number;
  descripcion?: string | null;
  es_complemento?: boolean;
  es_plato_compuesto?: boolean;
  cant_complementos?: number;
  admite_flavors?: boolean;
  bar_only?: boolean;
  productos_flavors?: ProductoFlavorDin[];
}

export interface ProductoFlavorDin {
  id: string;
  nombre: string;
  orden?: number | null;
}

export interface CategoriaMenuDin {
  id: string;
  nombre: string;
  orden?: number | null;
  items: ProductoMenuDin[];
}

interface DinDashboardProps {
  restaurante: RestauranteDin;
  meseroNombre: string;
  facturas: FacturaActiva[];
  mesas: MesaDin[];
  menu: CategoriaMenuDin[];
}

const formatCurrency = (value: number) => `L. ${Number(value ?? 0).toFixed(2)}`;

const formatMesa = (mesa: FacturaActiva["mesas"]) => {
  const localidad = Array.isArray(mesa?.localidades)
    ? mesa.localidades[0]
    : mesa?.localidades;

  return `Mesa ${mesa?.numero_mesa ?? "S/N"}${localidad?.nombre ? ` - ${localidad.nombre}` : ""}`;
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const getErrorField = (error: unknown, field: string) => {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return null;
  }

  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
};

export default function DinDashboard({
  restaurante,
  meseroNombre,
  facturas,
  mesas,
  menu,
}: DinDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [facturaSeleccionada, setFacturaSeleccionada] =
    useState<FacturaActiva | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoPedidoAbierto, setNuevoPedidoAbierto] = useState(false);
  const [mesaNuevoPedidoId, setMesaNuevoPedidoId] = useState("");
  const [productosSeleccionados, setProductosSeleccionados] = useState<UnidadPedido[]>([]);
  const [productosNuevoPedido, setProductosNuevoPedido] = useState<UnidadPedido[]>([]);
  const [facturasExpandidas, setFacturasExpandidas] = useState<
    Record<string, boolean>
  >({});
  const [guardando, setGuardando] = useState(false);
  const [guardandoNuevoPedido, setGuardandoNuevoPedido] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [errorNuevoPedido, setErrorNuevoPedido] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const totalActivo = useMemo(
    () =>
      facturas.reduce((acc, factura) => acc + Number(factura.total ?? 0), 0),
    [facturas],
  );

  useEffect(() => {
    if (!restaurante.id) return;

    const channel = supabase
      .channel(`cambios-facturas-din-${restaurante.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facturas",
          filter: `restaurante_id=eq.${restaurante.id}`,
        },
        () => router.refresh(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime facturas DIN no pudo suscribirse");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurante.id, router, supabase]);

  const productosFacturaBar = productosSeleccionados.filter((item) => item.producto.bar_only);
  const productosFacturaCocina = productosSeleccionados.filter((item) => !item.producto.bar_only);

  const abrirModal = (factura: FacturaActiva) => {
    setFacturaSeleccionada(factura);
    setProductosSeleccionados([]);
    setErrorModal(null);
    setModalAbierto(true);
  };
  const cerrarModalFactura = () => { if (!guardando) setModalAbierto(false); };
  const abrirNuevoPedido = () => {
    setProductosNuevoPedido([]);
    setMesaNuevoPedidoId("");
    setErrorNuevoPedido(null);
    setSuccessMessage(null);
    setNuevoPedidoAbierto(true);
  };
  const cerrarNuevoPedido = () => { if (!guardandoNuevoPedido) setNuevoPedidoAbierto(false); };

  const cajaEstaAbierta = async () => {
    const { data, error } = await supabase
      .from("restaurantes")
      .select("is_caja_abierta")
      .eq("id", restaurante.id)
      .single();

    if (error) throw error;

    return data?.is_caja_abierta === true;
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

  const insertarProductos = async () => {
    if (!facturaSeleccionada || productosSeleccionados.length === 0) return;

    setGuardando(true);
    setErrorModal(null);

    const barItems = productosFacturaBar.map((item) => ({
      producto_id: item.producto.id,
      cantidad: 1,
      notas: item.notas || null,
    }));
    const cocinaItems = productosFacturaCocina.map((item) => ({
      producto_id: item.producto.id,
      cantidad: 1,
      notas: item.notas || null,
    }));

    try {
      if (barItems.length > 0) {
        const { error } = await supabase.rpc(
          "agregar_productos_factura_mesero",
          {
            p_factura_id: facturaSeleccionada.id,
            p_items: barItems,
          },
        );

        if (error) throw error;
      }

      if (cocinaItems.length > 0) {
        const { error } = await supabase.rpc("agregar_pedido_mesero", {
          p_mesa_id: facturaSeleccionada.mesa_id,
          p_items: cocinaItems,
          p_es_adicional: true,
        });

        if (error) throw error;
      }

      setProductosSeleccionados([]);
      setModalAbierto(false);
      setFacturaSeleccionada(null);
      setSuccessMessage(
        cocinaItems.length > 0
          ? "Productos enviados como pedido adicional."
          : "Productos agregados a la factura.",
      );
      router.refresh();
    } catch (error) {
      const message = getErrorField(error, "message");
      const details = getErrorField(error, "details");
      const hint = getErrorField(error, "hint");
      const code = getErrorField(error, "code");

      console.error("EXCEPTION agregar_productos_factura_mesero:", {
        error,
        code,
        message,
        details,
        hint,
        facturaId: facturaSeleccionada.id,
        barItems,
        cocinaItems,
      });

      setErrorModal(
        [
          message ?? "No se pudieron agregar los productos a la factura.",
          details,
          hint,
          code ? `Codigo: ${code}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      );
    } finally {
      setGuardando(false);
    }
  };

  const crearNuevoPedido = async () => {
    if (!mesaNuevoPedidoId || productosNuevoPedido.length === 0) return;

    setGuardandoNuevoPedido(true);
    setErrorNuevoPedido(null);
    setSuccessMessage(null);

    try {
      const cajaAbierta = await cajaEstaAbierta();

      if (!cajaAbierta) {
        setErrorNuevoPedido("La caja no esta abierta.");
        return;
      }

      const pedidoItems = productosNuevoPedido.map((item) => ({
        producto_id: item.producto.id,
        cantidad: 1,
        notas: item.notas || null,
      }));

      const { error } = await supabase.rpc("agregar_pedido_mesero", {
        p_mesa_id: mesaNuevoPedidoId,
        p_items: pedidoItems,
        p_es_adicional: false,
      });

      if (error) throw error;

      setProductosNuevoPedido([]);
      setMesaNuevoPedidoId("");
      setNuevoPedidoAbierto(false);
      setSuccessMessage("Pedido agregado.");
      router.refresh();
    } catch (error) {
      const message = getErrorField(error, "message");
      const details = getErrorField(error, "details");
      const hint = getErrorField(error, "hint");
      const code = getErrorField(error, "code");

      console.error("EXCEPTION agregar_pedido_mesero:", {
        error,
        code,
        message,
        details,
        hint,
        mesaNuevoPedidoId,
        productosNuevoPedido: productosNuevoPedido.map((item) => ({
          producto_id: item.producto.id,
          nombre: item.producto.nombre,
          cantidad: 1,
          bar_only: item.producto.bar_only,
          es_plato_compuesto: item.producto.es_plato_compuesto,
          notas: item.notas || null,
        })),
      });

      setErrorNuevoPedido(
        [
          message ?? "No se pudo agregar el pedido.",
          details,
          hint,
          code ? `Codigo: ${code}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      );
    } finally {
      setGuardandoNuevoPedido(false);
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
              <p className="mt-0.5 truncate text-xs font-medium text-neutral-500">
                Has iniciado sesion como {meseroNombre}
              </p>
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
            <p className="mt-1 text-lg font-black">
              {formatCurrency(totalActivo)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={abrirNuevoPedido}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E85D26] px-4 text-sm font-black uppercase tracking-wide text-white transition-colors active:bg-orange-700"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo pedido
        </button>
      </header>

      {successMessage && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
          {successMessage}
        </div>
      )}

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
                      {formatMesa(factura.mesas)}
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
        <PedidoEditor
          titulo="Agregar productos a factura"
          ubicacion={formatMesa(facturaSeleccionada.mesas)}
          menu={menu}
          items={productosSeleccionados}
          onItemsChange={setProductosSeleccionados}
          onClose={cerrarModalFactura}
          onConfirm={insertarProductos}
          guardando={guardando}
          error={errorModal}
        />
      )}
      {nuevoPedidoAbierto && (
        <PedidoEditor
          titulo="Nuevo pedido"
          menu={menu}
          mesas={mesas}
          mesaId={mesaNuevoPedidoId}
          onMesaChange={setMesaNuevoPedidoId}
          items={productosNuevoPedido}
          onItemsChange={setProductosNuevoPedido}
          onClose={cerrarNuevoPedido}
          onConfirm={crearNuevoPedido}
          guardando={guardandoNuevoPedido}
          error={errorNuevoPedido}
        />
      )}
    </main>
  );
}
