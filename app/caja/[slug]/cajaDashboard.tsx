"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { finalizarPedidoCompleto } from "./actions";
import { CajaDashboardProps, Factura, DetalleFactura } from "./types"; // 👈 Tipos externos

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
  const [procesando, setProcesando] = useState(false);
  
  //estado para confirmar si ya se imprimio
  const [impresionConfirmada, setImpresionConfirmada] = useState(false) 
  //estado para bloquear cierre mientras ejecuta
  const [validandoCierre, setValidandoCierre] = useState(false);
  const [formaPago, setFormaPago] = useState<FormaPago | "">("");


  const supabase = createClient();
  const router = useRouter();

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
  } catch (error: any) {
    console.error("Error validando cierre de caja:", error?.message || error);
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
        {/* ... Resto del Header y Grid ... */}
        <div className="flex flex-col items-end gap-3">
          <div className="bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Sistema Online
          </div>
          <button
            onClick={handleIrACierre}
            disabled={validandoCierre}
            className={`text-[10px] font-black border px-3 py-1.5 rounded-lg transition-all uppercase tracking-tighter ${
              validandoCierre
                ? "cursor-not-allowed text-orange-200/60 border-orange-500/20"
                : "text-orange-300 hover:text-orange-200 border-orange-500/30 hover:border-orange-400/50"
            }`}
          >
            {validandoCierre ? "Validando..." : "Arqueo / Cierre"}
          </button>

          <button
            onClick={handleLogout}
            className="text-[10px] font-black text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-400/30 px-3 py-1.5 rounded-lg transition-all uppercase tracking-tighter"
          >
            Terminar Sesión
          </button>
        </div>
      </header>

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
          </div>
        ))}
      </div>

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
</main>
);
}
