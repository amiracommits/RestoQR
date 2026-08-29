"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { finalizarPedidoCompleto } from "./actions";
import { CajaDashboardProps, Factura, DetalleFactura } from "./types"; // 👈 Tipos externos
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BanknotesIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  PowerIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type FormaPago = "efectivo" | "tarjeta" | "transferencia";

export default function CajaDashboard({
  restaurante,
  facturasIniciales,
}: CajaDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [facturas, setFacturas] = useState<Factura[]>(facturasIniciales);
  const [facturaParaCobrar, setFacturaParaCobrar] = useState<Factura | null>(
    null,
  );
  const [facturaParaDividir, setFacturaParaDividir] = useState<Factura | null>(
    null,
  );
  const [cantidadesDivision, setCantidadesDivision] = useState<
    Record<string, number>
  >({});
  const [procesando, setProcesando] = useState(false);
  const [dividiendo, setDividiendo] = useState(false);
  const [errorDivision, setErrorDivision] = useState<string | null>(null);
  
  //estado para confirmar si ya se imprimio
  const [impresionConfirmada, setImpresionConfirmada] = useState(false) 
  //estado para bloquear cierre mientras ejecuta
  const [validandoCierre, setValidandoCierre] = useState(false);
  const [formaPago, setFormaPago] = useState<FormaPago | "">("");
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [modalAperturaAbierto, setModalAperturaAbierto] = useState(false);
  const [comentarioApertura, setComentarioApertura] = useState("");
  const [efectivoApertura, setEfectivoApertura] = useState("");
  const [abriendoCaja, setAbriendoCaja] = useState(false);
  const [errorApertura, setErrorApertura] = useState<string | null>(null);
  const [mensajeApertura, setMensajeApertura] = useState<string | null>(null);


  const supabase = createClient();
  const router = useRouter();

  const detallesSeleccionadosDivision = facturaParaDividir
    ? facturaParaDividir.detalle_facturas.filter(
        (detalle) => (cantidadesDivision[detalle.id] ?? 0) > 0,
      )
    : [];

  const totalDivision = detallesSeleccionadosDivision.reduce(
    (acc, detalle) =>
      acc +
      Number(detalle.precio_unitario ?? 0) *
        Number(cantidadesDivision[detalle.id] ?? 0),
    0,
  );
  const unidadesSeleccionadasDivision = detallesSeleccionadosDivision.reduce(
    (acc, detalle) => acc + Number(cantidadesDivision[detalle.id] ?? 0),
    0,
  );
  const unidadesFacturaParaDividir =
    facturaParaDividir?.detalle_facturas.reduce(
      (acc, detalle) => acc + Number(detalle.cantidad ?? 0),
      0,
    ) ?? 0;
  const divisionMueveTodaLaFactura =
    unidadesSeleccionadasDivision > 0 &&
    unidadesSeleccionadasDivision >= unidadesFacturaParaDividir;

  const playPing = useCallback(() => {
    const audio = new Audio("/sounds/notification.mp3");
    audio.play().catch(() => console.log("Permiso de audio requerido"));
  }, []);

  // Sincronizar con tiempo real (Escuchando la tabla FACTURAS)
  useEffect(() => {
    const channel = supabase
      .channel("cambios-facturas")
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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurante.id, supabase, router]);

  useEffect(() => {
    setFacturas(facturasIniciales);
  }, [facturasIniciales]);

  const handleConfirmarPago = async () => {
    if (!facturaParaCobrar) return;
    if (!formaPago) {
      alert("Selecciona una forma de pago antes de confirmar.");
      return;
    }
    setProcesando(true);
    try {
      const result = await finalizarPedidoCompleto(
        facturaParaCobrar.id,
        restaurante.slug,
        formaPago as FormaPago,
      );

      if (result.success) {
        setFacturaParaCobrar(null);
        setFormaPago("");
        setImpresionConfirmada(false);
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("Error inesperado al procesar el pago");
    } finally {
      setProcesando(false);
    }
  };

  const handleLogout = async () => {
    const channels = supabase.getChannels();
    channels.forEach((ch) => supabase.removeChannel(ch));
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const abrirModalApertura = () => {
    setMenuUsuarioAbierto(false);
    setComentarioApertura("");
    setEfectivoApertura("");
    setErrorApertura(null);
    setModalAperturaAbierto(true);
  };

  const handleAbrirCaja = async () => {
    const efectivo = Number(efectivoApertura || 0);
    if (Number.isNaN(efectivo) || efectivo < 0) {
      setErrorApertura("El efectivo inicial debe ser cero o mayor.");
      return;
    }

    setAbriendoCaja(true);
    setErrorApertura(null);
    setMensajeApertura(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("No se encontro usuario autenticado.");

      const { error: insertError } = await supabase.from("open_caja").insert({
        restaurante_id: restaurante.id,
        usuario_id: user.id,
        efectivo_apertura: efectivo,
        notas: comentarioApertura.trim() || null,
      });

      if (insertError) throw insertError;

      const { error: flagError } = await supabase.rpc("gestionar_caja_flag", {
        modo: "abrir",
      });

      if (flagError) throw flagError;

      setModalAperturaAbierto(false);
      setComentarioApertura("");
      setEfectivoApertura("");
      setMensajeApertura("Caja abierta correctamente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo abrir la caja.";
      setErrorApertura(message);
    } finally {
      setAbriendoCaja(false);
    }
  };

  const handleFinalizar = async (factura: Factura) => {
    setProcesando(true);

    // Abrir la vista de impresión en nueva pestaña ANTES de que desaparezca de la lista
    // Puedes crear una ruta como /caja/[slug]/imprimir/[id]
    window.open(`/caja/${restaurante.slug}/imprimir/${factura.id}`, "_blank");

    await finalizarPedidoCompleto(factura.id, restaurante.slug, "efectivo");
    setProcesando(false);
  };

  const handleGenerarFactura = (facturaId: string) => {
    // Abrimos la ruta de impresión en una pestaña nueva
    const url = `/caja/${restaurante.slug}/imprimir/${facturaId}`;
    window.open(url, "_blank", "width=400,height=600");
  };

  const abrirDivisionFactura = (factura: Factura) => {
    setFacturaParaDividir(factura);
    setCantidadesDivision({});
    setErrorDivision(null);
  };

  const cambiarCantidadDivision = (detalle: DetalleFactura, delta: number) => {
    setCantidadesDivision((current) => {
      const actual = current[detalle.id] ?? 0;
      const siguiente = Math.max(0, Math.min(detalle.cantidad, actual + delta));
      const copia = { ...current };

      if (siguiente === 0) {
        delete copia[detalle.id];
      } else {
        copia[detalle.id] = siguiente;
      }

      return copia;
    });
  };

/*Definicion temporal con console.log para determinar el error de supabase al momento de dividir factura*/
 const handleDividirFactura = async () => {
  if (
    !facturaParaDividir ||
    detallesSeleccionadosDivision.length === 0
  ) {
    return;
  }

  setDividiendo(true);
  setErrorDivision(null);

  try {
    const items = detallesSeleccionadosDivision.map((detalle) => ({
      detalle_id: detalle.id,
      cantidad: cantidadesDivision[detalle.id],
    }));

    console.log("=== DIVIDIENDO FACTURA ===");
    console.log("Factura ID:", facturaParaDividir.id);
    console.log("Items:", items);

    const { data, error } = await supabase.rpc("dividir_factura", {
      p_factura_id: facturaParaDividir.id,
      p_items: items,
    });

    console.log("Respuesta RPC:", data);
    console.log("Error RPC:", error);

    if (error) {
      console.error("ERROR dividir_factura:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      setErrorDivision(
        [
          error.message,
          error.details,
          error.hint,
          error.code ? `Código: ${error.code}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      );

      return;
    }

    setFacturaParaDividir(null);
    setCantidadesDivision({});
    router.refresh();

  } catch (error: unknown) {
    console.error("EXCEPTION dividir_factura:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error
    ) {
      setErrorDivision(String(error.message));
    } else {
      setErrorDivision("No se pudo dividir la factura.");
    }
  } finally {
    setDividiendo(false);
  }
};

  const handleVerCuentaPDF = (factura: Factura) => {
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 200],
    });
    const fecha = format(new Date(factura.created_at), "dd/MM/yyyy HH:mm");
    const mesa = factura.mesas?.numero_mesa ?? "S/N";
    const pedido = factura.numero_pedido_amigable ?? "S/N";

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(restaurante.nombre.toUpperCase(), 40, 10, { align: "center" });

    doc.setFontSize(9);
    doc.text("RESUMEN DE CUENTA", 40, 16, { align: "center" });

    doc.line(5, 20, 75, 20);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Mesa: ${mesa}`, 5, 26);
    doc.text(`Pedido: #${pedido}`, 5, 31);
    doc.text(`Fecha: ${fecha}`, 5, 36);

    const filas = factura.detalle_facturas.map((det) => [
      `${det.cantidad}`,
      det.productos.nombre,
      det.precio_unitario.toFixed(2),
      det.subtotal.toFixed(2),
    ]);

    autoTable(doc, {
      head: [["Cant.", "Producto", "P/U", "Subt."]],
      body: filas,
      startY: 42,
      margin: { left: 5, right: 5 },
      tableWidth: 70,
      theme: "plain",
      headStyles: {
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
      },
      styles: {
        fontSize: 7,
        cellPadding: 1,
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 34 },
        2: { halign: "right", cellWidth: 13 },
        3: { halign: "right", cellWidth: 13 },
      },
    });

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY ?? 70;

    doc.line(5, finalY + 4, 75, finalY + 4);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 5, finalY + 11);
    doc.text(`L. ${factura.total.toFixed(2)}`, 75, finalY + 11, {
      align: "right",
    });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Resumen de consumo. No es factura fiscal.", 40, finalY + 22, {
      align: "center",
    });

    const pdfUrl = doc.output("bloburl");
    window.open(pdfUrl, "_blank");
  };


  const handleImprimirYHabilitarCierre = async () => {
  if (!facturaParaCobrar) return

  try {
    await handleGenerarFactura(facturaParaCobrar.id)
    setImpresionConfirmada(true)
  } catch (error) {
    console.error(error)
    setImpresionConfirmada(false)
  }
}

const handleIrACierre = async () => {
  setValidandoCierre(true);
  try {
    // 1) Debe existir al menos una pagada
    const { count: pagadasCount, error: pagadasError } = await supabase
      .from("facturas")
      .select("id", { count: "exact", head: true })
      .eq("restaurante_id", restaurante.id)
      .eq("estado", "pagada");

    if (pagadasError) throw pagadasError;

    if (!pagadasCount || pagadasCount < 1) {
      alert("No hay facturas pagadas para ejecutar un cierre de caja.");
      return;
    }

    // 2) No debe existir ninguna generada (pendiente)
    const { count: generadasCount, error: generadasError } = await supabase
      .from("facturas")
      .select("id", { count: "exact", head: true })
      .eq("restaurante_id", restaurante.id)
      .eq("estado", "generada");

    if (generadasError) throw generadasError;

    if ((generadasCount ?? 0) > 0) {
      alert("Se deben cerrar todas las facturas pendientes hasta el momento.");
      return;
    }

    // OK -> ir a pantalla de cierre
    router.push(`/caja/${restaurante.slug}/cierre`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : error;
    console.error("Error validando cierre de caja:", message);
    alert("No se pudo validar el cierre de caja. Inténtalo nuevamente.");
  } finally {
    setValidandoCierre(false);
  }
};



  useEffect(() => {
    setMounted(true);
  }, []);

  // Si no está montado, renderizamos un esqueleto o nada para evitar el mismatch
  if (!mounted) return <div className="min-h-screen bg-slate-900" />;

  return (
    <main className="min-h-screen bg-slate-900 p-6 print:p-0">
      <header className="mb-8 flex items-start justify-between border-b border-slate-800 pb-4 print:hidden">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-800/70">
            {restaurante?.logo_url ? (
              <img
                src={restaurante.logo_url}
                alt={`Logo ${restaurante?.nombre || "restaurante"}`}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                Logo
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-orange-500 sm:text-3xl">
              {restaurante?.nombre || "Cargando..."}
            </h1>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
              Dashboard de Caja
            </p>
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuUsuarioAbierto((current) => !current)}
            className="inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-left shadow-lg transition-colors hover:border-orange-500/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300">
              <UserCircleIcon className="h-6 w-6" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Sistema online
              </span>
              <span className="block text-sm font-black text-white">
                Menu de caja
              </span>
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 text-slate-400 transition-transform ${
                menuUsuarioAbierto ? "rotate-180" : ""
              }`}
            />
          </button>

          {menuUsuarioAbierto && (
            <div className="absolute right-0 top-full z-30 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
              <button
                type="button"
                onClick={abrirModalApertura}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800"
              >
                <BanknotesIcon className="h-5 w-5 text-emerald-300" />
                Apertura de caja
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuUsuarioAbierto(false);
                  handleIrACierre();
                }}
                disabled={validandoCierre}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500"
              >
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-orange-300" />
                {validandoCierre ? "Validando..." : "Arqueo / cierre"}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 border-t border-slate-800 px-4 py-3 text-left text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10"
              >
                <PowerIcon className="h-5 w-5" />
                Terminar sesion
              </button>
            </div>
          )}
        </div>
      </header>

      {mensajeApertura && (
        <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 print:hidden">
          {mensajeApertura}
        </div>
      )}

      {facturas.length === 0 ? (
        <section className="flex min-h-[55vh] items-center justify-center print:hidden">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-slate-700 bg-slate-800/70 shadow-2xl">
              <div className="relative">
                <div className="text-6xl font-black text-slate-600">Z</div>
                <div className="absolute -right-8 -top-6 text-4xl font-black text-slate-500">
                  Z
                </div>
                <div className="absolute -right-14 -top-11 text-2xl font-black text-slate-400">
                  Z
                </div>
              </div>
            </div>
            <h2 className="mt-6 text-2xl font-black text-white">
              Nada por aqui
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
              Relajate un rato. Cuando haya facturas pendientes apareceran en
              este panel.
            </p>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
          {facturas.map((fac: Factura) => (
          <div
            key={fac.id}
            className="bg-slate-800 rounded-3xl border-2 border-slate-700 p-5 flex flex-col shadow-xl"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl font-black text-white">
                MESA {fac.mesas?.numero_mesa}
              </span>
              <span className="text-3xl font-black text-white">
                #{fac.numero_pedido_amigable}
              </span>
            </div>

            <div className="flex-1 space-y-2 mb-6">
              {fac.detalle_facturas.map((det: DetalleFactura) => (
                <div key={det.id} className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    {det.cantidad}x {det.productos.nombre}
                  </span>
                  <span className="text-white font-bold">
                    L. {det.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-4 mb-4 text-right text-2xl font-black text-orange-500">
              L. {fac.total.toFixed(2)}
            </div>

            <button
              onClick={
                () => {
                  setImpresionConfirmada(false)
                  setFormaPago("")
                  setFacturaParaCobrar(fac)
                }   
              }
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
            >
              Generar Factura
            </button>
            <button
              onClick={() => handleVerCuentaPDF(fac)}
              className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
            >
              Ver Cuenta
            </button>
            <button
              onClick={() => abrirDivisionFactura(fac)}
              disabled={fac.detalle_facturas.length === 0}
              className="mt-3 w-full bg-sky-700 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
            >
              Dividir Factura
            </button>
          </div>
          ))}
        </div>
      )}

{/* MODAL DE TICKET */}
{facturaParaCobrar && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm print:hidden">
    {/* Contenedor relativo para posicionar la X */}
    <div className="relative bg-white w-[300px] p-6 shadow-2xl rounded-xl">
      
      {/* ❌ BOTÓN CERRAR (La X flotante) */}
      <button 
        onClick={() => {
        setFacturaParaCobrar(null)
        setImpresionConfirmada(false)
        setFormaPago("")
      }}

        className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 font-bold z-[60]"
        title="Cerrar"
      >
        ✕
      </button>

      {/* Contenido del ticket */}
      <div className="text-center font-mono text-xs text-black">
        <h2 className="text-lg font-black uppercase mb-1">
          {restaurante.nombre}
        </h2>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <label className="text-[11px] font-bold uppercase text-slate-700">
          Forma de pago
        </label>
        <select
        value={formaPago}
        onChange={(e) => setFormaPago(e.target.value as FormaPago | "")}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
      >
        <option value="">Seleccionar</option>
        <option value="efectivo">Efectivo</option>
        <option value="tarjeta">Tarjeta</option>
        <option value="transferencia">Transferencia bancaria</option>
      </select>
        <button
          onClick={handleImprimirYHabilitarCierre}
          disabled={!formaPago}
          className={`w-full font-bold py-3 rounded-lg text-white ${
            !formaPago
              ? "bg-slate-700/60 cursor-not-allowed"
              : "bg-slate-900 hover:bg-slate-800"
          }`}
        >
          🖨️ Imprimir
        </button>

        <button
          onClick={handleConfirmarPago}
          disabled={procesando || !impresionConfirmada || !formaPago}
          className={`w-full font-bold py-3 rounded-lg text-white ${
            procesando || !impresionConfirmada || !formaPago
              ? 'bg-emerald-600/50 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {procesando ? 'Procesando...' : '✅ Confirmar y Liberar Mesa'}
        </button>
      </div>
    </div>
  </div>
)}

{modalAperturaAbierto && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm print:hidden sm:items-center">
    <div className="w-full rounded-t-3xl border-t border-slate-700 bg-slate-900 p-6 shadow-2xl sm:max-w-md sm:rounded-3xl sm:border">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
            Apertura
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Abrir caja
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalAperturaAbierto(false);
            setErrorApertura(null);
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-300"
          aria-label="Cerrar apertura de caja"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">
            Comentario de apertura
          </span>
          <textarea
            value={comentarioApertura}
            onChange={(event) => setComentarioApertura(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm font-semibold text-white outline-none transition-colors focus:border-emerald-400"
            placeholder="Ej: Inicio de turno matutino"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500">
            Efectivo recibido
          </span>
          <div className="flex overflow-hidden rounded-xl border border-slate-700 bg-slate-950 focus-within:border-emerald-400">
            <span className="flex items-center border-r border-slate-700 px-3 text-sm font-black text-emerald-300">
              L.
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={efectivoApertura}
              onChange={(event) => setEfectivoApertura(event.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-white outline-none"
              placeholder="0.00"
            />
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Si se deja vacio, se registrara L. 0.00.
          </p>
        </label>
      </div>

      {errorApertura && (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">
          {errorApertura}
        </p>
      )}

      <button
        type="button"
        onClick={handleAbrirCaja}
        disabled={abriendoCaja}
        className="mt-5 h-12 w-full rounded-xl bg-emerald-600 px-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
      >
        {abriendoCaja ? "Abriendo..." : "Abrir caja"}
      </button>
    </div>
  </div>
)}

{facturaParaDividir && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm print:hidden sm:items-center">
    <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-slate-700 bg-slate-900 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:border">
      <div className="border-b border-slate-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-sky-300">
              Dividir factura
            </p>
            <h2 className="mt-1 text-xl font-black text-white">
              Mesa {facturaParaDividir.mesas?.numero_mesa} · Pedido #
              {facturaParaDividir.numero_pedido_amigable}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setFacturaParaDividir(null);
              setCantidadesDivision({});
              setErrorDivision(null);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-300"
            aria-label="Cerrar division"
          >
            ✕
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Selecciona los productos que pasarán a una nueva factura.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
        {facturaParaDividir.detalle_facturas.map((detalle) => {
          const cantidadSeleccionada = cantidadesDivision[detalle.id] ?? 0;

          return (
            <article
              key={detalle.id}
              className={`rounded-2xl border p-4 ${
                cantidadSeleccionada > 0
                  ? "border-sky-400/40 bg-sky-500/10"
                  : "border-slate-700 bg-slate-800/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white">
                    {detalle.productos.nombre}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    Disponible: {detalle.cantidad} · L.{" "}
                    {detalle.precio_unitario.toFixed(2)} c/u
                  </p>
                </div>
                <p className="shrink-0 text-sm font-black text-sky-300">
                  L. {(detalle.precio_unitario * cantidadSeleccionada).toFixed(2)}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  A mover
                </span>
                <div className="grid grid-cols-[42px_42px_42px] items-center rounded-xl border border-slate-700 bg-slate-950/40">
                  <button
                    type="button"
                    onClick={() => cambiarCantidadDivision(detalle, -1)}
                    disabled={cantidadSeleccionada === 0}
                    className="flex h-10 items-center justify-center text-slate-300 disabled:text-slate-700"
                  >
                    -
                  </button>
                  <span className="text-center text-base font-black text-white">
                    {cantidadSeleccionada}
                  </span>
                  <button
                    type="button"
                    onClick={() => cambiarCantidadDivision(detalle, 1)}
                    disabled={cantidadSeleccionada >= detalle.cantidad}
                    className="flex h-10 items-center justify-center text-sky-300 disabled:text-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="border-t border-slate-800 bg-slate-950/70 p-5">
        {errorDivision && (
          <p className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">
            {errorDivision}
          </p>
        )}
        {divisionMueveTodaLaFactura && (
          <p className="mb-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm font-bold text-yellow-200">
            La factura original debe conservar al menos un producto.
          </p>
        )}
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="text-sm font-black uppercase tracking-widest text-slate-400">
            Nueva factura
          </span>
          <span className="text-2xl font-black text-sky-300">
            L. {totalDivision.toFixed(2)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDividirFactura}
          disabled={
            dividiendo ||
            detallesSeleccionadosDivision.length === 0 ||
            divisionMueveTodaLaFactura
          }
          className="h-12 w-full rounded-xl bg-sky-700 px-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          {dividiendo ? "Dividiendo..." : "Confirmar división"}
        </button>
      </div>
    </div>
  </div>
)}
</main>
);
}
