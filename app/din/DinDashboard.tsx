"use client";

import { useEffect, useMemo, useState } from "react";
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
  is_caja_abierta?: boolean | null;
  logo_url?: string | null;
}

export interface MesaDin {
  id: string;
  numero_mesa: string;
  estado?: string | null;
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

interface ProductoSeleccionado {
  producto: ProductoMenuDin;
  cantidad: number;
}

type PedidoWizardPaso =
  "productos" | "notas" | "complementos" | "flavors" | "resumen";

type ComplementosSeleccionados = Record<string, string[]>;

type FlavorsSeleccionados = Record<string, string>;

type NotasSeleccionadas = Record<string, string>;

const formatCurrency = (value: number) => `L. ${Number(value ?? 0).toFixed(2)}`;

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
  const [facturaPaso, setFacturaPaso] = useState<PedidoWizardPaso>("productos");
  const [nuevoPedidoAbierto, setNuevoPedidoAbierto] = useState(false);
  const [nuevoPedidoPaso, setNuevoPedidoPaso] =
    useState<PedidoWizardPaso>("productos");
  const [mesaNuevoPedidoId, setMesaNuevoPedidoId] = useState("");
  const [categoriaSeleccionadaId, setCategoriaSeleccionadaId] = useState(
    menu[0]?.id ?? "",
  );
  const [categoriaNuevoPedidoId, setCategoriaNuevoPedidoId] = useState(
    menu[0]?.id ?? "",
  );
  const [seleccionados, setSeleccionados] = useState<
    Record<string, ProductoSeleccionado>
  >({});
  const [seleccionadosNuevoPedido, setSeleccionadosNuevoPedido] = useState<
    Record<string, ProductoSeleccionado>
  >({});
  const [complementosFactura, setComplementosFactura] =
    useState<ComplementosSeleccionados>({});
  const [notasFactura, setNotasFactura] = useState<NotasSeleccionadas>({});
  const [flavorsFactura, setFlavorsFactura] = useState<FlavorsSeleccionados>(
    {},
  );
  const [complementosNuevoPedido, setComplementosNuevoPedido] =
    useState<ComplementosSeleccionados>({});
  const [notasNuevoPedido, setNotasNuevoPedido] = useState<NotasSeleccionadas>(
    {},
  );
  const [flavorsNuevoPedido, setFlavorsNuevoPedido] =
    useState<FlavorsSeleccionados>({});
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

  const productosFacturaBar = useMemo(
    () => productosSeleccionados.filter((item) => item.producto.bar_only),
    [productosSeleccionados],
  );

  const productosFacturaCocina = useMemo(
    () => productosSeleccionados.filter((item) => !item.producto.bar_only),
    [productosSeleccionados],
  );

  const categoriaNuevoPedido = useMemo(
    () =>
      menu.find((categoria) => categoria.id === categoriaNuevoPedidoId) ??
      menu[0],
    [categoriaNuevoPedidoId, menu],
  );

  const productosNuevoPedido = useMemo(
    () => Object.values(seleccionadosNuevoPedido),
    [seleccionadosNuevoPedido],
  );

  const listaComplementos = useMemo(
    () =>
      menu
        .flatMap((categoria) => categoria.items)
        .filter((producto) => producto.es_complemento),
    [menu],
  );

  const productosCompuestosNuevoPedido = useMemo(
    () =>
      productosNuevoPedido.filter(
        (item) =>
          item.producto.es_plato_compuesto &&
          Number(item.producto.cant_complementos ?? 0) > 0,
      ),
    [productosNuevoPedido],
  );

  const productosCompuestosFactura = useMemo(
    () =>
      productosSeleccionados.filter(
        (item) =>
          item.producto.es_plato_compuesto &&
          Number(item.producto.cant_complementos ?? 0) > 0,
      ),
    [productosSeleccionados],
  );

  const productosConNotasNuevoPedido = useMemo(
    () =>
      productosNuevoPedido.filter(
        (item) => !item.producto.bar_only && !item.producto.es_plato_compuesto,
      ),
    [productosNuevoPedido],
  );

  const productosConNotasFactura = useMemo(
    () =>
      productosSeleccionados.filter(
        (item) => !item.producto.bar_only && !item.producto.es_plato_compuesto,
      ),
    [productosSeleccionados],
  );

  const productosConFlavorsNuevoPedido = useMemo(
    () =>
      productosNuevoPedido.filter(
        (item) =>
          item.producto.admite_flavors &&
          (item.producto.productos_flavors?.length ?? 0) > 0,
      ),
    [productosNuevoPedido],
  );

  const productosConFlavorsFactura = useMemo(
    () =>
      productosSeleccionados.filter(
        (item) =>
          item.producto.admite_flavors &&
          (item.producto.productos_flavors?.length ?? 0) > 0,
      ),
    [productosSeleccionados],
  );

  const necesitaComplementosNuevoPedido =
    productosCompuestosNuevoPedido.length > 0;

  const necesitaNotasNuevoPedido = productosConNotasNuevoPedido.length > 0;

  const necesitaFlavorsNuevoPedido = productosConFlavorsNuevoPedido.length > 0;

  const necesitaComplementosFactura = productosCompuestosFactura.length > 0;

  const necesitaNotasFactura = productosConNotasFactura.length > 0;

  const necesitaFlavorsFactura = productosConFlavorsFactura.length > 0;

  const complementosFacturaCompletos = useMemo(
    () =>
      productosCompuestosFactura.every((item) => {
        const requeridos = Number(item.producto.cant_complementos ?? 0);
        const seleccionados = complementosFactura[item.producto.id] ?? [];
        return seleccionados.length === requeridos;
      }),
    [complementosFactura, productosCompuestosFactura],
  );

  const flavorsFacturaCompletos = useMemo(
    () =>
      productosConFlavorsFactura.every((item) =>
        Boolean(flavorsFactura[item.producto.id]),
      ),
    [flavorsFactura, productosConFlavorsFactura],
  );

  const complementosNuevoPedidoCompletos = useMemo(
    () =>
      productosCompuestosNuevoPedido.every((item) => {
        const requeridos = Number(item.producto.cant_complementos ?? 0);
        const seleccionados = complementosNuevoPedido[item.producto.id] ?? [];
        return seleccionados.length === requeridos;
      }),
    [complementosNuevoPedido, productosCompuestosNuevoPedido],
  );

  const flavorsNuevoPedidoCompletos = useMemo(
    () =>
      productosConFlavorsNuevoPedido.every((item) =>
        Boolean(flavorsNuevoPedido[item.producto.id]),
      ),
    [flavorsNuevoPedido, productosConFlavorsNuevoPedido],
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
    () => productosSeleccionados.reduce((acc, item) => acc + item.cantidad, 0),
    [productosSeleccionados],
  );

  const totalNuevoPedido = useMemo(
    () =>
      productosNuevoPedido.reduce(
        (acc, item) => acc + Number(item.producto.precio ?? 0) * item.cantidad,
        0,
      ),
    [productosNuevoPedido],
  );

  const cantidadNuevoPedido = useMemo(
    () => productosNuevoPedido.reduce((acc, item) => acc + item.cantidad, 0),
    [productosNuevoPedido],
  );

  const mesaNuevoPedido = useMemo(
    () => mesas.find((mesa) => mesa.id === mesaNuevoPedidoId) ?? null,
    [mesaNuevoPedidoId, mesas],
  );

  const abrirModal = (factura: FacturaActiva) => {
    setFacturaSeleccionada(factura);
    setSeleccionados({});
    setComplementosFactura({});
    setNotasFactura({});
    setFlavorsFactura({});
    setFacturaPaso("productos");
    setErrorModal(null);
    setModalAbierto(true);
    if (!categoriaSeleccionadaId && menu[0]?.id) {
      setCategoriaSeleccionadaId(menu[0].id);
    }
  };

  const cerrarModalFactura = () => {
    setModalAbierto(false);
    setFacturaPaso("productos");
  };

  const abrirNuevoPedido = () => {
    setSeleccionadosNuevoPedido({});
    setComplementosNuevoPedido({});
    setNotasNuevoPedido({});
    setFlavorsNuevoPedido({});
    setMesaNuevoPedidoId("");
    setNuevoPedidoPaso("productos");
    setErrorNuevoPedido(null);
    setSuccessMessage(null);
    setNuevoPedidoAbierto(true);
    if (!categoriaNuevoPedidoId && menu[0]?.id) {
      setCategoriaNuevoPedidoId(menu[0].id);
    }
  };

  const cerrarNuevoPedido = () => {
    setNuevoPedidoAbierto(false);
    setNuevoPedidoPaso("productos");
  };

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

  const cambiarCantidadNuevoPedido = (
    producto: ProductoMenuDin,
    delta: number,
  ) => {
    setSeleccionadosNuevoPedido((current) => {
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

  const getSiguientePaso = ({
    pasoActual,
    necesitaNotas,
    necesitaComplementos,
    necesitaFlavors,
  }: {
    pasoActual: PedidoWizardPaso;
    necesitaNotas: boolean;
    necesitaComplementos: boolean;
    necesitaFlavors: boolean;
  }): PedidoWizardPaso | null => {
    if (pasoActual === "productos") {
      if (necesitaNotas) return "notas";
      if (necesitaComplementos) return "complementos";
      if (necesitaFlavors) return "flavors";
      return "resumen";
    }

    if (pasoActual === "notas") {
      if (necesitaComplementos) return "complementos";
      if (necesitaFlavors) return "flavors";
      return "resumen";
    }

    if (pasoActual === "complementos") {
      if (necesitaFlavors) return "flavors";
      return "resumen";
    }

    if (pasoActual === "flavors") return "resumen";

    return null;
  };

  const getPasoAnterior = ({
    pasoActual,
    necesitaNotas,
    necesitaComplementos,
    necesitaFlavors,
  }: {
    pasoActual: PedidoWizardPaso;
    necesitaNotas: boolean;
    necesitaComplementos: boolean;
    necesitaFlavors: boolean;
  }): PedidoWizardPaso | null => {
    if (pasoActual === "resumen") {
      if (necesitaFlavors) return "flavors";
      if (necesitaComplementos) return "complementos";
      if (necesitaNotas) return "notas";
      return "productos";
    }

    if (pasoActual === "flavors") {
      if (necesitaComplementos) return "complementos";
      if (necesitaNotas) return "notas";
      return "productos";
    }

    if (pasoActual === "complementos") {
      if (necesitaNotas) return "notas";
      return "productos";
    }

    if (pasoActual === "notas") return "productos";

    return null;
  };

  const avanzarFactura = () => {
    setErrorModal(null);
    const siguientePaso = getSiguientePaso({
      pasoActual: facturaPaso,
      necesitaNotas: necesitaNotasFactura,
      necesitaComplementos: necesitaComplementosFactura,
      necesitaFlavors: necesitaFlavorsFactura,
    });

    if (siguientePaso) {
      setFacturaPaso(siguientePaso);
    }
  };

  const retrocederFactura = () => {
    setErrorModal(null);
    const pasoAnterior = getPasoAnterior({
      pasoActual: facturaPaso,
      necesitaNotas: necesitaNotasFactura,
      necesitaComplementos: necesitaComplementosFactura,
      necesitaFlavors: necesitaFlavorsFactura,
    });

    if (pasoAnterior) {
      setFacturaPaso(pasoAnterior);
    }
  };

  const avanzarNuevoPedido = () => {
    setErrorNuevoPedido(null);
    const siguientePaso = getSiguientePaso({
      pasoActual: nuevoPedidoPaso,
      necesitaNotas: necesitaNotasNuevoPedido,
      necesitaComplementos: necesitaComplementosNuevoPedido,
      necesitaFlavors: necesitaFlavorsNuevoPedido,
    });

    if (siguientePaso) {
      setNuevoPedidoPaso(siguientePaso);
    }
  };

  const retrocederNuevoPedido = () => {
    setErrorNuevoPedido(null);
    const pasoAnterior = getPasoAnterior({
      pasoActual: nuevoPedidoPaso,
      necesitaNotas: necesitaNotasNuevoPedido,
      necesitaComplementos: necesitaComplementosNuevoPedido,
      necesitaFlavors: necesitaFlavorsNuevoPedido,
    });

    if (pasoAnterior) {
      setNuevoPedidoPaso(pasoAnterior);
    }
  };

  const toggleComplementoNuevoPedido = (
    productoId: string,
    complementoId: string,
    maxComplementos: number,
  ) => {
    setComplementosNuevoPedido((current) => {
      const actuales = current[productoId] ?? [];
      const estaSeleccionado = actuales.includes(complementoId);
      const siguientes = estaSeleccionado
        ? actuales.filter((id) => id !== complementoId)
        : actuales.length < maxComplementos
          ? [...actuales, complementoId]
          : actuales;

      return {
        ...current,
        [productoId]: siguientes,
      };
    });
  };

  const toggleComplementoFactura = (
    productoId: string,
    complementoId: string,
    maxComplementos: number,
  ) => {
    setComplementosFactura((current) => {
      const actuales = current[productoId] ?? [];
      const estaSeleccionado = actuales.includes(complementoId);
      const siguientes = estaSeleccionado
        ? actuales.filter((id) => id !== complementoId)
        : actuales.length < maxComplementos
          ? [...actuales, complementoId]
          : actuales;

      return {
        ...current,
        [productoId]: siguientes,
      };
    });
  };

  const seleccionarFlavorNuevoPedido = (
    productoId: string,
    flavorId: string,
  ) => {
    setFlavorsNuevoPedido((current) => ({
      ...current,
      [productoId]: flavorId,
    }));
  };

  const seleccionarFlavorFactura = (productoId: string, flavorId: string) => {
    setFlavorsFactura((current) => ({
      ...current,
      [productoId]: flavorId,
    }));
  };

  const escribirNotaNuevoPedido = (productoId: string, nota: string) => {
    setNotasNuevoPedido((current) => ({
      ...current,
      [productoId]: nota,
    }));
  };

  const escribirNotaFactura = (productoId: string, nota: string) => {
    setNotasFactura((current) => ({
      ...current,
      [productoId]: nota,
    }));
  };

  const getNotasProducto = (
    producto: ProductoMenuDin,
    complementosSeleccionados: ComplementosSeleccionados,
    flavorsSeleccionados: FlavorsSeleccionados,
    notasSeleccionadas: NotasSeleccionadas,
  ) => {
    const notaManual = notasSeleccionadas[producto.id]?.trim();
    const complementos = (complementosSeleccionados[producto.id] ?? [])
      .map((complementoId) =>
        listaComplementos.find(
          (complemento) => complemento.id === complementoId,
        ),
      )
      .filter(Boolean)
      .map((complemento) => complemento?.nombre);

    const flavor = producto.productos_flavors?.find(
      (item) => item.id === flavorsSeleccionados[producto.id],
    );

    return [
      notaManual ? `Nota: ${notaManual}` : null,
      complementos.length > 0
        ? `Acompanamientos: ${complementos.join(", ")}`
        : null,
      flavor ? `Sabor: ${flavor.nombre}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
  };

  const getNotasNuevoPedido = (producto: ProductoMenuDin) =>
    getNotasProducto(
      producto,
      complementosNuevoPedido,
      flavorsNuevoPedido,
      notasNuevoPedido,
    );

  const getNotasFactura = (producto: ProductoMenuDin) =>
    getNotasProducto(
      producto,
      complementosFactura,
      flavorsFactura,
      notasFactura,
    );

  const insertarProductos = async () => {
    if (!facturaSeleccionada || productosSeleccionados.length === 0) return;

    setGuardando(true);
    setErrorModal(null);

    const barItems = productosFacturaBar.map((item) => ({
      producto_id: item.producto.id,
      cantidad: item.cantidad,
      notas: getNotasFactura(item.producto) || null,
    }));
    const cocinaItems = productosFacturaCocina.map((item) => ({
      producto_id: item.producto.id,
      cantidad: item.cantidad,
      notas: getNotasFactura(item.producto) || null,
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

      setSeleccionados({});
      setComplementosFactura({});
      setNotasFactura({});
      setFlavorsFactura({});
      setFacturaPaso("productos");
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
        cantidad: item.cantidad,
        notas: getNotasNuevoPedido(item.producto) || null,
      }));

      const { error } = await supabase.rpc("agregar_pedido_mesero", {
        p_mesa_id: mesaNuevoPedidoId,
        p_items: pedidoItems,
        p_es_adicional: false,
      });

      if (error) throw error;

      setSeleccionadosNuevoPedido({});
      setComplementosNuevoPedido({});
      setNotasNuevoPedido({});
      setFlavorsNuevoPedido({});
      setMesaNuevoPedidoId("");
      setNuevoPedidoPaso("productos");
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
          cantidad: item.cantidad,
          bar_only: item.producto.bar_only,
          es_plato_compuesto: item.producto.es_plato_compuesto,
          notas: getNotasNuevoPedido(item.producto) || null,
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
                  onClick={cerrarModalFactura}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-neutral-300"
                  aria-label="Cerrar modal"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-2">
                {[
                  ["productos", "Productos"],
                  ["notas", "Notas"],
                  ["complementos", "Complementos"],
                  ["flavors", "Sabores"],
                  ["resumen", "Resumen"],
                ].map(([paso, label]) => {
                  const habilitado =
                    paso === "productos" ||
                    paso === "resumen" ||
                    (paso === "notas" && necesitaNotasFactura) ||
                    (paso === "complementos" && necesitaComplementosFactura) ||
                    (paso === "flavors" && necesitaFlavorsFactura);

                  return (
                    <div
                      key={paso}
                      className={`h-1.5 rounded-full ${
                        facturaPaso === paso
                          ? "bg-[#E85D26]"
                          : habilitado
                            ? "bg-white/20"
                            : "bg-white/[0.06]"
                      }`}
                      title={label}
                    />
                  );
                })}
              </div>
            </div>

            {facturaPaso === "productos" && (
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
                        const cantidad =
                          seleccionados[producto.id]?.cantidad ?? 0;

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
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="line-clamp-2 text-sm font-black">
                                  {producto.nombre}
                                </h3>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${
                                    producto.bar_only
                                      ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
                                      : "border-orange-300/40 bg-orange-500/10 text-orange-200"
                                  }`}
                                >
                                  {producto.bar_only ? "Bar" : "Cocina"}
                                </span>
                              </div>
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
                        {cantidadAAgregar} items nuevos ·{" "}
                        {formatCurrency(totalAAgregar)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={avanzarFactura}
                      disabled={productosSeleccionados.length === 0}
                      className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#E85D26] px-5 text-center text-sm font-black uppercase tracking-wide text-white transition-colors active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}

            {facturaPaso !== "productos" && (
              <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]">
                <section className="min-h-0 overflow-y-auto p-4">
                  {facturaPaso === "notas" && (
                    <div className="space-y-4">
                      {productosConNotasFactura.map((item) => (
                        <article
                          key={item.producto.id}
                          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-base font-black text-neutral-100">
                                {item.producto.nombre}
                              </h3>
                              <p className="mt-1 text-xs font-bold text-neutral-500">
                                Agrega una nota opcional para cocina
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-orange-300/40 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase text-orange-200">
                              Cocina
                            </span>
                          </div>
                          <textarea
                            value={notasFactura[item.producto.id] ?? ""}
                            onChange={(event) =>
                              escribirNotaFactura(
                                item.producto.id,
                                event.target.value,
                              )
                            }
                            rows={3}
                            maxLength={180}
                            placeholder="Ej. sin cebolla, poca salsa, termino medio"
                            className="mt-4 w-full resize-none rounded-xl border border-white/[0.08] bg-black/25 px-3 py-3 text-sm font-bold text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-orange-400/50"
                          />
                        </article>
                      ))}
                    </div>
                  )}

                  {facturaPaso === "complementos" && (
                    <div className="space-y-4">
                      {productosCompuestosFactura.map((item) => {
                        const requeridos = Number(
                          item.producto.cant_complementos ?? 0,
                        );
                        const seleccionados =
                          complementosFactura[item.producto.id] ?? [];

                        return (
                          <article
                            key={item.producto.id}
                            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-base font-black text-neutral-100">
                                  {item.producto.nombre}
                                </h3>
                                <p className="mt-1 text-xs font-bold text-neutral-500">
                                  Selecciona {requeridos} complementos
                                </p>
                              </div>
                              <span className="rounded-full border border-orange-400/30 px-3 py-1 text-xs font-black text-orange-300">
                                {seleccionados.length}/{requeridos}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {listaComplementos.map((complemento) => {
                                const activo = seleccionados.includes(
                                  complemento.id,
                                );
                                const bloqueado =
                                  !activo && seleccionados.length >= requeridos;

                                return (
                                  <button
                                    key={complemento.id}
                                    type="button"
                                    onClick={() =>
                                      toggleComplementoFactura(
                                        item.producto.id,
                                        complemento.id,
                                        requeridos,
                                      )
                                    }
                                    className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors ${
                                      activo
                                        ? "border-orange-400/60 bg-orange-500/15 text-orange-200"
                                        : bloqueado
                                          ? "border-white/[0.05] bg-white/[0.02] text-neutral-600"
                                          : "border-white/[0.08] bg-white/[0.04] text-neutral-300"
                                    }`}
                                  >
                                    {complemento.nombre}
                                  </button>
                                );
                              })}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {facturaPaso === "flavors" && (
                    <div className="space-y-4">
                      {productosConFlavorsFactura.map((item) => {
                        const selectedFlavorId =
                          flavorsFactura[item.producto.id] ?? "";

                        return (
                          <article
                            key={item.producto.id}
                            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                          >
                            <h3 className="text-base font-black text-neutral-100">
                              {item.producto.nombre}
                            </h3>
                            <p className="mt-1 text-xs font-bold text-neutral-500">
                              Elige una preparacion
                            </p>

                            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {item.producto.productos_flavors
                                ?.slice()
                                .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                                .map((flavor) => {
                                  const activo = selectedFlavorId === flavor.id;

                                  return (
                                    <button
                                      key={flavor.id}
                                      type="button"
                                      onClick={() =>
                                        seleccionarFlavorFactura(
                                          item.producto.id,
                                          flavor.id,
                                        )
                                      }
                                      className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors ${
                                        activo
                                          ? "border-yellow-300/60 bg-yellow-300/15 text-yellow-200"
                                          : "border-white/[0.08] bg-white/[0.04] text-neutral-300"
                                      }`}
                                    >
                                      {flavor.nombre}
                                    </button>
                                  );
                                })}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {facturaPaso === "resumen" && (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-neutral-400">
                            Factura actual
                          </span>
                          <span className="font-bold text-neutral-100">
                            {formatCurrency(
                              Number(facturaSeleccionada.total ?? 0),
                            )}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-neutral-400">
                            Directo a factura
                          </span>
                          <span className="font-black text-cyan-200">
                            {productosFacturaBar.length} productos bar
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-neutral-400">
                            Comanda nueva
                          </span>
                          <span className="font-black text-orange-200">
                            {productosFacturaCocina.length} productos cocina
                          </span>
                        </div>
                      </div>

                      {productosSeleccionados.map((item) => {
                        const notas = getNotasFactura(item.producto);

                        return (
                          <article
                            key={item.producto.id}
                            className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="line-clamp-2 text-sm font-black text-yellow-300">
                                    {item.producto.nombre}
                                  </h3>
                                  <span
                                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${
                                      item.producto.bar_only
                                        ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
                                        : "border-orange-300/40 bg-orange-500/10 text-orange-200"
                                    }`}
                                  >
                                    {item.producto.bar_only
                                      ? "Factura"
                                      : "Comanda"}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs font-bold text-neutral-400">
                                  {item.cantidad} x{" "}
                                  {formatCurrency(item.producto.precio)} c/u
                                </p>
                                {notas && (
                                  <p className="mt-2 text-xs font-bold text-orange-200">
                                    {notas}
                                  </p>
                                )}
                              </div>
                              <p className="shrink-0 text-sm font-black text-yellow-300">
                                {formatCurrency(
                                  item.producto.precio * item.cantidad,
                                )}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <div className="min-w-0 shrink-0 border-t border-white/[0.08] bg-[#111] p-3 md:p-4">
                  {errorModal && (
                    <p className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                      {errorModal}
                    </p>
                  )}
                  {facturaPaso === "resumen" && (
                    <div className="mb-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-neutral-400">
                          A agregar
                        </span>
                        <span className="text-lg font-black text-yellow-300">
                          {formatCurrency(totalAAgregar)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-neutral-400">
                          Total factura
                        </span>
                        <span className="text-xl font-black text-neutral-100">
                          {formatCurrency(
                            Number(facturaSeleccionada.total ?? 0) +
                              productosFacturaBar.reduce(
                                (acc, item) =>
                                  acc +
                                  Number(item.producto.precio ?? 0) *
                                    item.cantidad,
                                0,
                              ),
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={retrocederFactura}
                      className="flex h-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] px-5 text-center text-sm font-black uppercase tracking-wide text-neutral-300 transition-colors active:bg-white/[0.06]"
                    >
                      Atras
                    </button>
                    {facturaPaso === "resumen" ? (
                      <button
                        type="button"
                        onClick={insertarProductos}
                        disabled={
                          guardando || productosSeleccionados.length === 0
                        }
                        className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#E85D26] px-5 text-center text-sm font-black uppercase tracking-wide text-white transition-colors active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                      >
                        {guardando ? "PROCESANDO..." : "CONFIRMAR"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={avanzarFactura}
                        disabled={
                          (facturaPaso === "complementos" &&
                            !complementosFacturaCompletos) ||
                          (facturaPaso === "flavors" &&
                            !flavorsFacturaCompletos)
                        }
                        className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#E85D26] px-5 text-center text-sm font-black uppercase tracking-wide text-white transition-colors active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                      >
                        Siguiente
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {nuevoPedidoAbierto && (
        <div className="fixed inset-0 z-30 bg-black/70 p-0 backdrop-blur-sm sm:px-3 sm:py-4">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden bg-[#141414] shadow-2xl shadow-black sm:rounded-2xl sm:border sm:border-white/[0.08]">
            <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">
                    Mesero
                  </p>
                  <h2 className="truncate text-lg font-black">Nuevo pedido</h2>
                </div>
                <button
                  type="button"
                  onClick={cerrarNuevoPedido}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-neutral-300"
                  aria-label="Cerrar nuevo pedido"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3">
                <div className="mb-3 grid grid-cols-5 gap-2">
                  {[
                    ["productos", "Productos"],
                    ["notas", "Notas"],
                    ["complementos", "Complementos"],
                    ["flavors", "Sabores"],
                    ["resumen", "Resumen"],
                  ].map(([paso, label]) => {
                    const habilitado =
                      paso === "productos" ||
                      paso === "resumen" ||
                      (paso === "notas" && necesitaNotasNuevoPedido) ||
                      (paso === "complementos" &&
                        necesitaComplementosNuevoPedido) ||
                      (paso === "flavors" && necesitaFlavorsNuevoPedido);

                    return (
                      <div
                        key={paso}
                        className={`h-1.5 rounded-full ${
                          nuevoPedidoPaso === paso
                            ? "bg-[#E85D26]"
                            : habilitado
                              ? "bg-white/20"
                              : "bg-white/[0.06]"
                        }`}
                        title={label}
                      />
                    );
                  })}
                </div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                  Mesa
                </label>
                <select
                  value={mesaNuevoPedidoId}
                  onChange={(event) => setMesaNuevoPedidoId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0f0f0f] px-3 text-sm font-bold text-neutral-100 outline-none"
                >
                  <option value="">Seleccionar mesa</option>
                  {mesas.map((mesa) => (
                    <option key={mesa.id} value={mesa.id}>
                      Mesa {mesa.numero_mesa}
                      {mesa.estado ? ` - ${mesa.estado}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {nuevoPedidoPaso === "productos" && (
              <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] md:grid-cols-[220px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_auto]">
                <aside className="min-w-0 border-b border-white/[0.08] p-3 md:row-span-2 md:border-b-0 md:border-r">
                  <div className="flex max-w-full gap-2 overflow-x-auto md:block md:space-y-2 md:overflow-visible">
                    {menu.map((categoria) => (
                      <button
                        key={categoria.id}
                        type="button"
                        onClick={() => setCategoriaNuevoPedidoId(categoria.id)}
                        className={`h-11 shrink-0 rounded-xl px-4 text-left text-sm font-bold transition-colors md:w-full ${
                          categoriaNuevoPedido?.id === categoria.id
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
                  {categoriaNuevoPedido ? (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {categoriaNuevoPedido.items.map((producto) => {
                        const cantidad =
                          seleccionadosNuevoPedido[producto.id]?.cantidad ?? 0;

                        return (
                          <article
                            key={producto.id}
                            onClick={() =>
                              cambiarCantidadNuevoPedido(producto, 1)
                            }
                            className={`rounded-xl border p-3 transition-colors active:scale-[0.99] ${
                              cantidad > 0
                                ? "border-orange-400/50 bg-orange-500/10"
                                : "border-white/[0.08] bg-white/[0.03]"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="line-clamp-2 text-sm font-black">
                                  {producto.nombre}
                                </h3>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${
                                    producto.bar_only
                                      ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
                                      : "border-orange-300/40 bg-orange-500/10 text-orange-200"
                                  }`}
                                >
                                  {producto.bar_only ? "Bar" : "Cocina"}
                                </span>
                              </div>
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
                                      cambiarCantidadNuevoPedido(producto, -1);
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
                                      cambiarCantidadNuevoPedido(producto, 1);
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
                        Pedido
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-yellow-300">
                        {cantidadNuevoPedido} items ·{" "}
                        {formatCurrency(totalNuevoPedido)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={avanzarNuevoPedido}
                      disabled={
                        !mesaNuevoPedidoId || productosNuevoPedido.length === 0
                      }
                      className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#E85D26] px-5 text-center text-sm font-black uppercase tracking-wide text-white transition-colors active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}

            {nuevoPedidoPaso !== "productos" && (
              <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]">
                <section className="min-h-0 overflow-y-auto p-4">
                  {nuevoPedidoPaso === "notas" && (
                    <div className="space-y-4">
                      {productosConNotasNuevoPedido.map((item) => (
                        <article
                          key={item.producto.id}
                          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-base font-black text-neutral-100">
                                {item.producto.nombre}
                              </h3>
                              <p className="mt-1 text-xs font-bold text-neutral-500">
                                Agrega una nota opcional para cocina
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-orange-300/40 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase text-orange-200">
                              Cocina
                            </span>
                          </div>
                          <textarea
                            value={notasNuevoPedido[item.producto.id] ?? ""}
                            onChange={(event) =>
                              escribirNotaNuevoPedido(
                                item.producto.id,
                                event.target.value,
                              )
                            }
                            rows={3}
                            maxLength={180}
                            placeholder="Ej. sin cebolla, poca salsa, termino medio"
                            className="mt-4 w-full resize-none rounded-xl border border-white/[0.08] bg-black/25 px-3 py-3 text-sm font-bold text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-orange-400/50"
                          />
                        </article>
                      ))}
                    </div>
                  )}

                  {nuevoPedidoPaso === "complementos" && (
                    <div className="space-y-4">
                      {productosCompuestosNuevoPedido.map((item) => {
                        const requeridos = Number(
                          item.producto.cant_complementos ?? 0,
                        );
                        const seleccionados =
                          complementosNuevoPedido[item.producto.id] ?? [];

                        return (
                          <article
                            key={item.producto.id}
                            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-base font-black text-neutral-100">
                                  {item.producto.nombre}
                                </h3>
                                <p className="mt-1 text-xs font-bold text-neutral-500">
                                  Selecciona {requeridos} complementos
                                </p>
                              </div>
                              <span className="rounded-full border border-orange-400/30 px-3 py-1 text-xs font-black text-orange-300">
                                {seleccionados.length}/{requeridos}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {listaComplementos.map((complemento) => {
                                const activo = seleccionados.includes(
                                  complemento.id,
                                );
                                const bloqueado =
                                  !activo && seleccionados.length >= requeridos;

                                return (
                                  <button
                                    key={complemento.id}
                                    type="button"
                                    onClick={() =>
                                      toggleComplementoNuevoPedido(
                                        item.producto.id,
                                        complemento.id,
                                        requeridos,
                                      )
                                    }
                                    className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors ${
                                      activo
                                        ? "border-orange-400/60 bg-orange-500/15 text-orange-200"
                                        : bloqueado
                                          ? "border-white/[0.05] bg-white/[0.02] text-neutral-600"
                                          : "border-white/[0.08] bg-white/[0.04] text-neutral-300"
                                    }`}
                                  >
                                    {complemento.nombre}
                                  </button>
                                );
                              })}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {nuevoPedidoPaso === "flavors" && (
                    <div className="space-y-4">
                      {productosConFlavorsNuevoPedido.map((item) => {
                        const selectedFlavorId =
                          flavorsNuevoPedido[item.producto.id] ?? "";

                        return (
                          <article
                            key={item.producto.id}
                            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                          >
                            <h3 className="text-base font-black text-neutral-100">
                              {item.producto.nombre}
                            </h3>
                            <p className="mt-1 text-xs font-bold text-neutral-500">
                              Elige una preparacion
                            </p>

                            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {item.producto.productos_flavors
                                ?.slice()
                                .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                                .map((flavor) => {
                                  const activo = selectedFlavorId === flavor.id;

                                  return (
                                    <button
                                      key={flavor.id}
                                      type="button"
                                      onClick={() =>
                                        seleccionarFlavorNuevoPedido(
                                          item.producto.id,
                                          flavor.id,
                                        )
                                      }
                                      className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors ${
                                        activo
                                          ? "border-yellow-300/60 bg-yellow-300/15 text-yellow-200"
                                          : "border-white/[0.08] bg-white/[0.04] text-neutral-300"
                                      }`}
                                    >
                                      {flavor.nombre}
                                    </button>
                                  );
                                })}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {nuevoPedidoPaso === "resumen" && (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-neutral-400">Mesa</span>
                          <span className="font-bold text-neutral-100">
                            {mesaNuevoPedido
                              ? `Mesa ${mesaNuevoPedido.numero_mesa}`
                              : "Sin mesa"}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-neutral-400">Items</span>
                          <span className="font-black text-yellow-300">
                            {cantidadNuevoPedido}
                          </span>
                        </div>
                      </div>

                      {productosNuevoPedido.map((item) => {
                        const notas = getNotasNuevoPedido(item.producto);

                        return (
                          <article
                            key={item.producto.id}
                            className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="line-clamp-2 text-sm font-black text-yellow-300">
                                    {item.producto.nombre}
                                  </h3>
                                  <span
                                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${
                                      item.producto.bar_only
                                        ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
                                        : "border-orange-300/40 bg-orange-500/10 text-orange-200"
                                    }`}
                                  >
                                    {item.producto.bar_only ? "Bar" : "Cocina"}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs font-bold text-neutral-400">
                                  {item.cantidad} x{" "}
                                  {formatCurrency(item.producto.precio)} c/u
                                </p>
                                {notas && (
                                  <p className="mt-2 text-xs font-bold text-orange-200">
                                    {notas}
                                  </p>
                                )}
                              </div>
                              <p className="shrink-0 text-sm font-black text-yellow-300">
                                {formatCurrency(
                                  item.producto.precio * item.cantidad,
                                )}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <div className="min-w-0 shrink-0 border-t border-white/[0.08] bg-[#111] p-3 md:p-4">
                  {errorNuevoPedido && (
                    <p className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                      {errorNuevoPedido}
                    </p>
                  )}
                  {nuevoPedidoPaso === "resumen" && (
                    <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                      <span className="font-bold text-neutral-400">
                        Total pedido
                      </span>
                      <span className="text-xl font-black text-yellow-300">
                        {formatCurrency(totalNuevoPedido)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={retrocederNuevoPedido}
                      className="flex h-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] px-5 text-center text-sm font-black uppercase tracking-wide text-neutral-300 transition-colors active:bg-white/[0.06]"
                    >
                      Atras
                    </button>
                    {nuevoPedidoPaso === "resumen" ? (
                      <button
                        type="button"
                        onClick={crearNuevoPedido}
                        disabled={
                          guardandoNuevoPedido ||
                          !mesaNuevoPedidoId ||
                          productosNuevoPedido.length === 0
                        }
                        className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#E85D26] px-5 text-center text-sm font-black uppercase tracking-wide text-white transition-colors active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                      >
                        {guardandoNuevoPedido
                          ? "GUARDANDO..."
                          : "CONFIRMAR PEDIDO"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={avanzarNuevoPedido}
                        disabled={
                          (nuevoPedidoPaso === "complementos" &&
                            !complementosNuevoPedidoCompletos) ||
                          (nuevoPedidoPaso === "flavors" &&
                            !flavorsNuevoPedidoCompletos)
                        }
                        className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-[#E85D26] px-5 text-center text-sm font-black uppercase tracking-wide text-white transition-colors active:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                      >
                        Siguiente
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
