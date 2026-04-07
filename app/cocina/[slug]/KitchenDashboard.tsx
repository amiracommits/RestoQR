// app/cocina/[slug]/KitchenDashboard.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

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
  mesas: { numero_mesa: string };
  detalle_pedidos: DetallePedido[];
}

interface Restaurante {
  id: string;
  nombre: string;
  slug: string;
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
              <div className="bg-slate-700/50 p-4 flex justify-between items-center border-b border-slate-700">
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-white">
                    MESA {pedido.mesas?.numero_mesa || "S/N"}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded mt-1 self-start">
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

              <div className="p-4 bg-slate-900/30">
                <button
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
    </main>
  );
}
