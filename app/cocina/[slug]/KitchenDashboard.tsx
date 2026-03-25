// app/cocina/[slug]/KitchenDashboard.tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function KitchenDashboard({ restauranteId, pedidosIniciales }: any) {
  const [pedidos, setPedidos] = useState(pedidosIniciales)
  const supabase = createClient()



  useEffect(() => {
    // SUSCRIPCIÓN EN TIEMPO REAL
    const channel = supabase
      .channel('cambios-cocina')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos', filter: `restaurante_id=eq.${restauranteId}` },
        () => {
          // Si hay cambios, refrescamos la lista (puedes optimizar esto luego)
          window.location.reload() 
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restauranteId])

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {pedidos.map((pedido: any) => (
        <div key={pedido.id} className="bg-slate-800 rounded-3xl border-2 border-slate-700 overflow-hidden flex flex-col shadow-2xl">
          {/* Header de la Comanda */}
          <div className="bg-slate-700 p-4 flex justify-between items-center">
            <span className="text-2xl font-black">MESA {pedido.mesas?.numero_mesa || 'S/N'}</span>
            <span className="text-xs font-mono text-slate-400">
              {new Date(pedido.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Detalle del Pedido */}
          <div className="p-5 flex-1 space-y-3">
            {pedido.detalle_pedidos?.map((detalle: any, idx: number) => (
              <div key={idx} className="flex gap-3 items-start border-b border-slate-700 pb-2">
                <span className="bg-orange-500 text-white font-black px-2 py-0.5 rounded text-lg">
                  {detalle.cantidad}
                </span>
                <span className="text-lg font-bold text-slate-200">
                  {detalle.productos?.nombre}
                </span>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="p-4 bg-slate-900/50">
            <button 
              onClick={() => cambiarEstado(pedido.id, 'entregado')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all active:scale-95"
            >
              MARCAR COMPLETADO
            </button>
          </div>
        </div>
      ))}

      {pedidos.length === 0 && (
        <div className="col-span-full py-20 text-center text-slate-600">
          <span className="text-6xl block mb-4">💤</span>
          <p className="text-xl font-bold italic">No hay pedidos pendientes. ¡Buen trabajo!</p>
        </div>
      )}
    </div>
  )
}