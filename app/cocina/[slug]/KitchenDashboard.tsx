// app/cocina/[slug]/KitchenDashboard.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";

// --- INTERFACES (Tus definiciones originales) ---
interface DetallePedido {
  id: string;
  cantidad: number;
  precio: number;
  notas?: string;
  productos: { nombre: string };
}

interface Pedido {
  id: string;
  created_at: string;
  total: number;
  estado: string;
  es_adicional: boolean;
  mesa_id: string;
  numero_pedido_dia?: number | null; // 👈 para numero de pedido
  mesas: { numero_mesa: string };
  detalle_pedidos: DetallePedido[];
}

interface Restaurante {
  id: string;
  nombre: string;
  slug: string;
  is_caja_abierta?: boolean | null;
  logo_url?: string;
}

interface CocinaDashboardProps {
  // Corregido a PascalCase por convención
  restaurante: Restaurante;
  pedidosIniciales: Pedido[];
}
export default function KitchenDashboard({
  restaurante,
  pedidosIniciales,
}: CocinaDashboardProps) {
  const [pedidos, setPedidos] = useState(pedidosIniciales);
  //const [ahora, setAhora] = useState(Date.now()) // Estado para el "reloj" interno
  const [ahora, setAhora] = useState(() => Date.now());
  const router = useRouter();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [mensajeCajaCerrada, setMensajeCajaCerrada] = useState<string | null>(
    null,
  );

  // Sincronizar props con estado local
  useEffect(() => {
    setPedidos(pedidosIniciales);
  }, [pedidosIniciales]);

  const playPing = useCallback(() => {
    const audio = new Audio("/sounds/notification.mp3");
    audio.play().catch(() => console.log("Permiso de audio requerido"));
  }, []);

  const playPingAdicional = useCallback(() => {
    new Audio("/sounds/aditionalOrderSound.mp3").play().catch(() => {});
  }, []);

  // --- 🛡️ CANAL DE REALTIME BLINDADO ---
  useEffect(() => {
    // Si no hay restaurante todavía, no intentamos suscribirnos
    if (!restaurante?.id) return;

    const channel = supabase
      .channel("cambios-cocina")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pedidos",
          filter: `restaurante_id=eq.${restaurante.id}`,
        },
        (payload) => {
          if (payload.new.es_adicional) {
            playPingAdicional();
          } else {
            playPing();
          }
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // 💡 Usamos restaurante?.id como dependencia para que el efecto se dispare
    // solo cuando el ID esté realmente presente.
  }, [restaurante?.id, playPing, playPingAdicional, router, supabase]);

  // 1. Efecto para actualizar el "ahora" cada 60 segundos y forzar re-renderizado
  useEffect(() => {
    const timer = setInterval(() => {
      setAhora(Date.now());
    }, 1000); // 60,000 ms = 1 minuto
    return () => clearInterval(timer);
  }, []);

  // 2. Función auxiliar para calcular el color del borde (Semáforo)
  const getBordeColor = (createdAt: string) => {
    const minPasados = Math.floor(
      (ahora - new Date(createdAt).getTime()) / 60000,
    );
    if (minPasados <= 10) return "border-emerald-500 shadow-emerald-900/10";
    if (minPasados <= 15) return "border-amber-500 shadow-amber-900/20";
    return "border-red-600 animate-pulse shadow-red-900/40";
  };

  const handleLogout = async () => {
    const channels = supabase.getChannels();
    channels.forEach((ch) => supabase.removeChannel(ch));
    await supabase.auth.signOut();
    router.replace("/login");
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

  const cargarImagenComoDataUrl = (url: string) =>
    new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("No se pudo preparar el logo."));
          return;
        }

        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => reject(new Error("No se pudo cargar el logo."));
      image.src = url;
    });

  const handleGenerarComanda = async (pedido: Pedido) => {
    const previewWindow = window.open("", "_blank");
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 220],
    });

    let y = 8;
    const pageWidth = 80;
    const marginX = 6;
    const contentWidth = pageWidth - marginX * 2;

    if (restaurante.logo_url) {
      try {
        const logoDataUrl = await cargarImagenComoDataUrl(restaurante.logo_url);
        doc.addImage(logoDataUrl, "PNG", 31, y, 18, 18);
        y += 22;
      } catch (error) {
        console.warn("No se pudo agregar el logo a la comanda:", error);
      }
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(restaurante.nombre.toUpperCase(), pageWidth / 2, y, {
      align: "center",
      maxWidth: contentWidth,
    });

    y += 6;
    doc.setFontSize(10);
    doc.text("COMANDA DE COCINA", pageWidth / 2, y, { align: "center" });

    y += 5;
    doc.setLineWidth(0.2);
    doc.line(marginX, y, pageWidth - marginX, y);

    y += 6;
    doc.setFontSize(9);
    doc.text(`Mesa: ${pedido.mesas?.numero_mesa || "S/N"}`, marginX, y);
    y += 5;
    doc.text(`Pedido: #${pedido.numero_pedido_dia ?? "S/N"}`, marginX, y);
    y += 5;
    doc.text(
      `Tipo: ${pedido.es_adicional ? "ADICIONAL" : "PRINCIPAL"}`,
      marginX,
      y,
    );
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(
      `Hora: ${new Date(pedido.created_at).toLocaleString("es-HN")}`,
      marginX,
      y,
    );

    y += 6;
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 6;

    pedido.detalle_pedidos?.forEach((detalle, index) => {
      if (y > 205) {
        doc.addPage([80, 220]);
        y = 8;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const producto = `${index + 1}. ${detalle.cantidad}x ${
        detalle.productos?.nombre || "Producto"
      }`;
      const productoLineas = doc.splitTextToSize(producto, contentWidth);
      doc.text(productoLineas, marginX, y);
      y += productoLineas.length * 5;

      if (detalle.notas) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const notaLineas = doc.splitTextToSize(
          `Nota: ${detalle.notas}`,
          contentWidth - 4,
        );
        doc.text(notaLineas, marginX + 4, y);
        y += notaLineas.length * 4;
      }

      y += 3;
    });

    doc.line(marginX, y, pageWidth - marginX, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Preparar segun detalle.", pageWidth / 2, y, {
      align: "center",
    });

    const pdfUrl = doc.output("bloburl");

    if (previewWindow) {
      previewWindow.location.href = pdfUrl;
    } else {
      window.open(pdfUrl, "_blank");
    }
  };

  /*DEPRECADO <ESTA FUNCION YA NO SE LLAMA DESDE EL BOTON DE COMPLETAR PEDIDO
  se sustituyó por "completarPedido"
  */
  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    // Optimistic UI
    const pedidosPrevios = pedidos;
    setPedidos(pedidos.filter((p) => p.id !== id));

    // 1. Actualizar estado
    const { error: updateError } = await supabase
      .from("pedidos")
      .update({ estado: nuevoEstado })
      .eq("id", id);

    if (updateError) {
      console.error("Error al actualizar estado:", updateError.message);
      setPedidos(pedidosPrevios); // rollback
      alert("No se pudo actualizar el estado.");
      return;
    }

    // 2. Ejecutar RPC de pedido entregado.
    const { error: rpcError } = await supabase.rpc("procesar_entrega_pedido", {
      target_pedido_id: id,
    });

    if (rpcError) {
      console.error("Error en RPC:", rpcError.message);
      setPedidos(pedidosPrevios); // r"ollback
      alert("El pedido se actualizó, pero falló el procesamiento.");
      return;
      cambiarEstado;
    }

    // 3. Refrescar datos
    router.refresh();
  };

  const completarPedido = async (id: string) => {
    let cajaAbierta = false;

    try {
      cajaAbierta = await cajaEstaAbierta();
    } catch (error) {
      console.error("Error validando estado de caja del restaurante:", error);
    }

    if (!cajaAbierta) {
      setMensajeCajaCerrada("La caja no esta abierta.");
      return;
    }

    const pedidosPrevios = [...pedidos];

    // Update optimista en UI
    setPedidos(pedidos.filter((p) => p.id !== id));

    // ÚNICA LLAMADA: El RPC orquesta todo
    const { error: rpcError } = await supabase.rpc("procesar_entrega_pedido", {
      target_pedido_id: id,
    });

    if (rpcError) {
      console.error("Error crítico en RPC:", rpcError.message);
      setPedidos(pedidosPrevios); // Rollback visual
      alert(`Error: ${rpcError.message}`);
      return;
    }

    router.refresh();
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Si no está montado, renderizamos un esqueleto o nada para evitar el mismatch
  if (!mounted) return <div className="min-h-screen bg-slate-900" />;

  return (
    <main className="p-6">
      <header className="flex justify-between items-start mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase tracking-tight">
            COCINA: {restaurante?.nombre || "Cargando..."}
          </h1>
          <p className="text-slate-400 font-bold text-sm">
            Cola de Comandas en Tiempo Real
          </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {pedidos.map((pedido: Pedido) => {
          const borderStyle = getBordeColor(pedido.created_at);
          return (
            <div
              key={pedido.id}
              className={`bg-slate-800/50 rounded-3xl border-4 overflow-hidden flex flex-col shadow-2xl transition-all duration-500 ${borderStyle}`}
            >
              {/* Mantenemos tu estructura de tarjeta que ya es perfecta */}
              <div className="bg-slate-700/50 p-4 flex justify-between items-start border-b border-slate-700 gap-3">
              <div className="shrink-0">
                <span className="inline-flex items-center rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-black text-white">
                  PEDIDO # {pedido.numero_pedido_dia ?? "S/N"}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-white">
                  MESA {pedido.mesas?.numero_mesa || "S/N"}
                </span>
                <span className="text-[10px] font-black text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded mt-1">
                  HACE{" "}
                  {Math.floor(
                    (ahora - new Date(pedido.created_at).getTime()) / 60000,
                  )}{" "}
                  MIN
                </span>
              </div>
            </div>


              {/* Badges de Tipo */}
              <div className="flex items-center justify-center gap-2 mt-3 mb-2">
                {pedido.es_adicional ? (
                  <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse shadow-lg shadow-amber-900/40">
                    ADICIONAL
                  </span>
                ) : (
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg shadow-emerald-900/10">
                    PRINCIPAL
                  </span>
                )}
              </div>

              {/* Detalle de Productos */}
              <div className="p-5 flex-1 space-y-4">
                {pedido.detalle_pedidos?.map(
                  (detalle: DetallePedido, idx: number) => (
                    <div
                      key={idx}
                      className="flex gap-3 items-start border-b border-slate-700/30 pb-3 last:border-0"
                    >
                      <span className="bg-orange-600 text-white font-black w-8 h-8 flex items-center justify-center rounded-lg text-sm shadow-lg shadow-orange-900/20 shrink-0">
                        {detalle.cantidad}
                      </span>
                      <div className="flex flex-col flex-1">
                        <span className="text-base font-bold text-slate-200 leading-tight">
                          {detalle.productos?.nombre}
                        </span>
                        {detalle.notas && (
                          <div className="mt-1.5 p-2 bg-slate-900/40 rounded-lg border-l-2 border-orange-500">
                            <p className="text-[11px] text-orange-400 font-medium italic leading-relaxed">
                              <span className="not-italic mr-1">📝</span>
                              {detalle.notas}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="space-y-3 p-4 bg-slate-900/30">
                <button
                  type="button"
                  onClick={() => handleGenerarComanda(pedido)}
                  className="w-full rounded-2xl border border-orange-500/30 bg-orange-500/10 py-4 font-black text-orange-200 shadow-lg shadow-orange-900/10 transition-all hover:bg-orange-500/20 active:scale-95"
                >
                  GENERAR COMANDA
                </button>
                <button
                  type="button"
                  onClick={() => completarPedido(pedido.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                  MARCAR COMPLETADO
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {mensajeCajaCerrada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-orange-500/20 bg-slate-900 p-6 text-center shadow-2xl">
            <h2 className="text-lg font-black uppercase tracking-wide text-orange-300">
              Caja cerrada
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">
              {mensajeCajaCerrada}
            </p>
            <button
              type="button"
              onClick={() => setMensajeCajaCerrada(null)}
              className="mt-5 h-11 w-full rounded-xl bg-orange-600 px-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-orange-500"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
