// app/cocina/[slug]/KitchenDashboard.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function KitchenDashboard({ restauranteId, restauranteNombre, pedidosIniciales }: any) {
  const [pedidos, setPedidos] = useState(pedidosIniciales)
  const [ahora, setAhora] = useState(Date.now()) // Estado para el "reloj" interno
  const router = useRouter()
  const supabase = createClient()

  // Sincronizar props con estado local
  useEffect(() => {
    setPedidos(pedidosIniciales)
  }, [pedidosIniciales])

  // Lógica de sonido para pedido
  const playPing = useCallback(() => {
    const audio = new Audio('/sounds/notification.mp3')
    audio.play().catch(e => console.log("Permiso de audio requerido"))
  }, [])

  //logica de sonido para pedido adicional
  const playPingAdicional = useCallback(() => {
  new Audio('/sounds/aditionalOrderSound.mp3').play().catch(() => {});
}, []);

  // Canal de Realtime
useEffect(() => {
  const channel = supabase
    .channel('cambios-cocina')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `restaurante_id=eq.${restauranteId}` },
      (payload) => {
        // 💡 LÓGICA DE INGENIERÍA: Decidir qué sonido tocar
        if (payload.new.es_adicional) {
          playPingAdicional();
        } else {
          playPing();
        }
        router.refresh(); // Trae los nuevos datos del servidor
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); }
}, [restauranteId, playPing, playPingAdicional, router, supabase]);

  // 1. Efecto para actualizar el "ahora" cada 60 segundos y forzar re-renderizado
  useEffect(() => {
    const timer = setInterval(() => {
      setAhora(Date.now())
    }, 60000) // 60,000 ms = 1 minuto
    return () => clearInterval(timer)
  }, [])

  // 2. Función auxiliar para calcular el color del borde (Semáforo)
  const getBordeColor = (createdAt: string) => {
    const minPasados = Math.floor((ahora - new Date(createdAt).getTime()) / 60000)

    // Semáforo: Verde (<=10), Naranja (11-15), Rojo parpadeante (>15)
    if (minPasados <= 10) return 'border-emerald-500 shadow-emerald-900/10'
    if (minPasados <= 15) return 'border-amber-500 shadow-amber-900/20'
    return 'border-red-600 animate-pulse shadow-red-900/40' 
  }

  // FUNCIÓN DE CIERRE DE SESIÓN
  const handleLogout = async () => {
    const channels = supabase.getChannels()
    channels.forEach(ch => supabase.removeChannel(ch))

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error al cerrar sesión:", error.message)
      return
    }
    router.replace('/login')
  }


const cambiarEstado = async (id: string, nuevoEstado: string) => {
  setPedidos(pedidos.filter((p: any) => p.id !== id));
  const { error } = await supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', id);
  
  if (error) {
    console.error("Error actualizando estado:", error.message);
    router.refresh(); 
  } else {
    router.refresh();
  }
};

  return (
    <>
      {/* 1. HEADER (Con botón Logout) */}
      <header className="flex justify-between items-start mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase tracking-tight">
            COCINA: {restauranteNombre}
          </h1>
          <p className="text-slate-400 font-bold text-sm">Cola de Comandas en Tiempo Real</p>
        </div>

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

      {/* 2. GRID DE PEDIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {pedidos.map((pedido: any) => {
          // Calculamos el estilo del borde dinámicamente según el tiempo
          const borderStyle = getBordeColor(pedido.created_at)

          return (
            <div 
              key={pedido.id} 
              className={`bg-slate-800/50 rounded-3xl border-4 overflow-hidden flex flex-col shadow-2xl transition-all duration-500 ${borderStyle}`}
            >
              {/* Header de la Comanda */}
              <div className="bg-slate-700/50 p-4 flex justify-between items-center border-b border-slate-700">
                <div className="flex flex-col">
                   <span className="text-2xl font-black text-white">MESA {pedido.mesas?.numero_mesa || 'S/N'}</span>
                   {/* Badge de tiempo transcurrido */}
                   <span className="text-[10px] font-black text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded mt-1 self-start">
                     HACE {Math.floor((ahora - new Date(pedido.created_at).getTime()) / 60000)} MIN
                   </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900/50 px-2 py-1 rounded">
                  {new Date(pedido.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              {/* 🛑 Logica de tipo de pedido adicional o principal 🛑 */}
              <div className="flex items-center justify-center gap-2 mt-3 mb-2">
                
                {/* 1. Lógica para PEDIDO ADICIONAL (Naranja Palpitante) */}
                {pedido.es_adicional && (
                  <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse shadow-lg shadow-amber-900/40">
                    ADICIONAL
                  </span>
                )}

                {/* 2. Lógica para PEDIDO PRINCIPAL (Verde Esmeralda Fijo) */}
                {/* Validamos que NO sea adicional. Usamos color esmeralda similar al botón */}
                {!pedido.es_adicional && (
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg shadow-emerald-900/10">
                    PRINCIPAL
                  </span>
                )}
              </div>
              {/* 🛑 FIN SECCIÓN ACTUALIZADA 🛑 */}

              {/* 🛑 SECCIÓN ACTUALIZADA: Detalle de Productos con Notas 🛑 */}
              <div className="p-5 flex-1 space-y-4">
                {pedido.detalle_pedidos?.map((detalle: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start border-b border-slate-700/30 pb-3 last:border-0">
                    {/* Cantidad */}
                    <span className="bg-orange-600 text-white font-black w-8 h-8 flex items-center justify-center rounded-lg text-sm shadow-lg shadow-orange-900/20 shrink-0">
                      {detalle.cantidad}
                    </span>
                    
                    {/* Info del Producto y Notas */}
                    <div className="flex flex-col flex-1">
                      <span className="text-base font-bold text-slate-200 leading-tight">
                        {detalle.productos?.nombre}
                      </span>
                      
                      {/* Renderizado de Notas (Acompañamientos + Manuales) */}
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
                ))}
              </div>
              {/* 🛑 FIN SECCIÓN ACTUALIZADA 🛑 */}

              {/* Acciones */}
              <div className="p-4 bg-slate-900/30">
                <button 
                  onClick={() => cambiarEstado(pedido.id, 'entregado')}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                  MARCAR COMPLETADO
                </button>
              </div>
            </div>
          )
        })}

        {pedidos.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800 rounded-[40px]">
            <span className="text-6xl block mb-4 opacity-20">💤</span>
            <p className="text-slate-500 font-bold italic">No hay pedidos pendientes. ¡Buen trabajo!</p>
          </div>
        )}
      </div>
    </>
  )
}