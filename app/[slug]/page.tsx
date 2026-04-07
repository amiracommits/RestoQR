/*
Este archivo se encarga de recibir el slug de la URL, 
verificar que el restaurante exista y traer todos los productos agrupados por categoría en una sola consulta eficiente.
*/

// app/[slug]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import MenuViewCliente from './MenuViewCliente' 
export default async function PublicMenuPage({ params,searchParams}: { 
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ mesa?: string }> // El ID de la mesa es opcional (por si entran solo a ver)
}) {
  const { slug } = await params
  const { mesa: mesaId } = await searchParams // Extraemos el UUID de la mesa
  const supabase = await createClient()
  

  // 1. Obtener datos del Restaurante por Slug
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!restaurante) notFound() // Manda a la página 404 si el slug no existe

  // 2.1 (Opcional pero recomendado) Validar que la mesa pertenezca a este restaurante
  let mesaValida = null
  if (mesaId) {
    const { data: mesaData } = await supabase
      .from('mesas') 
      .select('*')
      .eq('id', mesaId)
      .eq('restaurante_id', restaurante.id)
      .single()
    
    mesaValida = mesaData
  }

  // 3. Obtener Productos y Categorías (Aislamiento Multi-tenant por restaurante_id)
  const { data: productos } = await supabase
    .from('productos')
    .select('*, categorias(id, nombre)')
    .eq('restaurante_id', restaurante.id)
    .eq('disponible', true) // Solo los activos
    .order('nombre');


  if (!productos) return <div className="p-10 text-center">Cargando menú...</div>

  // 4. Agrupar productos por categoría eficientemente
  // Usamos un Map para mantener el orden y agrupar
  const categoriasMap = new Map()
  
  productos.forEach(prod => {
    if (prod.categorias) {
      const catId = prod.categorias.id
      const catNombre = prod.categorias.nombre
      
      if (!categoriasMap.has(catId)) {
        categoriasMap.set(catId, { nombre: catNombre, items: [] })
      }
      categoriasMap.get(catId).items.push(prod)
    }
  })

  // Convertimos el Map a un Array estructurado para el componente de cliente
  const menuEstructurado = Array.from(categoriasMap.entries()).map(([id, data]) => ({
    id,
    ...data
  })

)

  

  // validacion de si tiene pedido activo 
  let tienePedidoActivo = false
  if (mesaId) {
    const { count } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('mesa_id', mesaId)
      .neq('estado', 'entregado')
      .neq('estado', 'pagado')
      .limit(1)
    
    tienePedidoActivo = (count ?? 0) > 0
  }

  
return (
    <MenuViewCliente 
      restaurante={restaurante}  // <-- Restaurante
      menu={menuEstructurado} // <-- paso el menu del restaurante en cuestion
      mesaId={mesaId} // <-- Pasamos el ID de la mesa capturado del QR
      esPedidoAdicional={tienePedidoActivo} // <-- Pasamos la bandera aquí
      estadoMesa={mesaValida?.estado || 'disponible'} //nueva prop que me dice el estado de la mesa
    />
  )
}

