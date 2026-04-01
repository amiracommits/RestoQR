'use server'
// app/admin/pedidos/actions.ts
// ✅ Server Actions — solo lógica de servidor y acceso a Supabase

import { createClient } from '@/utils/supabase/server'

export async function getAdminOrders() {
  const supabase = await createClient()

  // 1. Identificar al usuario por su sesión activa
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Sesión no encontrada")

  // 2. Buscar el restaurante asociado a ese perfil
  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('restaurante_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.restaurante_id) throw new Error("No tienes un restaurante asignado")

  // 3. Traer los pedidos con todos los joins necesarios
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      mesas(numero_mesa),
      detalle_pedidos(
        id,
        cantidad,
        precio_unitario,
        subtotal,
        notas,
        productos(nombre)
      )
    `)
    .eq('restaurante_id', perfil.restaurante_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching orders:", error.message)
    return []
  }

  return pedidos ?? []
}

export async function revivirPedidoAction(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pedidos')
    .update({ estado: 'pendiente' })
    .eq('id', id)

  if (error) {
    console.error("Error al revivir pedido:", error.message)
    throw new Error("No se pudo actualizar el pedido.")
  }

  return { success: true }
}
