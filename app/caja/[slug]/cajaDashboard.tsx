"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { finalizarPedidoCompleto } from "./actions";
import { CajaDashboardProps, Factura, DetalleFactura } from "./types"; // 👈 Tipos externos

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
    setProcesando(true);
    try {
      const result = await finalizarPedidoCompleto(
        facturaParaCobrar.id,
        restaurante.slug,
      );

      if (result.success) {
        setFacturaParaCobrar(null);
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

    await finalizarPedidoCompleto(factura.id, factura.mesas.id);
    setProcesando(false);
  };

  const handleGenerarFactura = (facturaId: string) => {
    // Abrimos la ruta de impresión en una pestaña nueva
    const url = `/caja/${restaurante.slug}/imprimir/${facturaId}`;
    window.open(url, "_blank", "width=400,height=600");
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Si no está montado, renderizamos un esqueleto o nada para evitar el mismatch
  if (!mounted) return <div className="min-h-screen bg-slate-900" />;

  return (
    <main className="min-h-screen bg-slate-900 p-6 print:p-0">
      <header className="flex justify-between items-start mb-8 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase tracking-tight">
            Box de Caja: {restaurante?.nombre || "Cargando..."}
          </h1>
        </div>
        {/* ... Resto del Header y Grid ... */}
        <div className="flex flex-col items-end gap-3">
          <div className="bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Sistema Online
          </div>
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
              onClick={() => setFacturaParaCobrar(fac)}
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
        onClick={() => setFacturaParaCobrar(null)}
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
        {/* ... resto de tu tabla y totales ... */}
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <button
          onClick={() => handleGenerarFactura(facturaParaCobrar.id)}
          className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg"
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={handleConfirmarPago}
          disabled={procesando}
          className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg"
        >
          {procesando ? "Procesando..." : "✅ Confirmar y Liberar Mesa"}
        </button>
      </div>
    </div>
  </div>
)}
</main>
);
}

