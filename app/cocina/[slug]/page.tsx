// app/cocina/[slug]/page.tsx
export const dynamic = 'force-dynamic'; // Esto obliga a Next.js a buscar datos frescos en cada carga
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import KitchenDashboard from './KitchenDashboard'

export default async function CocinaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Obtener el restaurante por slug
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('id, nombre')
    .eq('slug', slug)
    .single()

  if (!restaurante) notFound()

  // 2. Carga inicial de pedidos pendientes
 const { data: pedidosIniciales, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      mesas(numero_mesa), 
      detalle_pedidos(
        cantidad,
        productos(nombre)
      )
    `)
    .eq('restaurante_id', restaurante.id)
    .neq('estado', 'entregado')
    .order('created_at', { ascending: true });


// AGREGAMOS ESTOS LOGS:
  console.log("--- DEBUG COCINA ---")
  console.log("Restaurante ID buscado:", restaurante.id)
  console.log("Error de Supabase (si hay):", error)
  console.log("Cantidad de pedidos encontrados:", pedidosIniciales?.length)
  if (pedidosIniciales && pedidosIniciales.length > 0) {
    console.log("Primer pedido (Mesa):", pedidosIniciales[0].mesas?.numero)
  }
  console.log("--------------------")

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-orange-500 uppercase">Cocina: {restaurante.nombre}</h1>
          <p className="text-slate-400 font-bold">Cola de Comandas en Tiempo Real</p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-full border border-emerald-500/20 text-sm font-bold animate-pulse">
          ● Sistema Online
        </div>
      </header>

      <KitchenDashboard 
        restauranteId={restaurante.id} 
        pedidosIniciales={pedidosIniciales || []} 
      />
    </main>
  )
}
