'use server'
import { createClient } from '@/utils/supabase/server'

export async function submitOrder(orderData: {
  restaurante_id: string;
  mesa_id: string;
  total: number;
  items: any[];
}) {
  const supabase = await createClient()

  // 1. Insertar el Encabezado (PEDIDOS)
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      restaurante_id: orderData.restaurante_id,
      mesa_id: orderData.mesa_id,
      total: orderData.total,
      estado: 'pendiente' // Estado inicial
    })
    .select()
    .single()

  if (pedidoError) throw new Error(`Error al crear pedido: ${pedidoError.message}`)

  // 2. Preparar los detalles (DETALLE_PEDIDOS)
  // Agrupamos los items para insertar cantidades correctas
  const detalles = orderData.items.map(item => ({
    pedido_id: pedido.id,
    producto_id: item.id,
    cantidad: item.cantidad,
    precio_unitario: item.precio,
    //subtotal: item.precio * item.cantidad. esta ya no va por que es auto generada por la base de datos
  }))

  // 3. Insertar todos los detalles en una sola ráfaga (Bulk Insert)
  const { error: detallesError } = await supabase
    .from('detalle_pedidos')
    .insert(detalles)

  if (detallesError) {
    // Nota de ingeniero: En un sistema crítico aquí haríamos un rollback, 
    // pero Supabase/Postgres maneja bien la integridad referencial.
    console.error("Error en detalles:", detallesError)
    throw new Error("El pedido se creó pero hubo un problema con los detalles.")
  }

  return { success: true, pedidoId: pedido.id }
}