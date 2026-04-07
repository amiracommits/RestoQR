"use server";
import { createClient } from "@/utils/supabase/server";

interface ItemPedido {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  notas?: string;
}

interface OrderData {
  restaurante_id: string;
  mesa_id: string;
  total: number;
  notas?: string; // 👈 Agregamos notas a nivel de orden
  items: ItemPedido[];
  es_adicional: boolean;
}

export async function submitOrder(orderData: OrderData) {
  const supabase = await createClient();

  /*obtener la data de la mesa desde el valor de la URL*/
  const { data: mesa } = await supabase
    .from("mesas")
    .select("estado")
    .eq("id", orderData.mesa_id)
    .single();
  const esAdicional = mesa?.estado === "ocupada";
  if (!esAdicional) {
    // Si la mesa está libre se ocupa por esta petición
    await supabase
      .from("mesas")
      .update({ estado: "ocupada" })
      .eq("id", orderData.mesa_id);
  }

  // 1. Obtener número correlativo desde RPC de supabase
  const { data: nuevoNumero, error: rpcError } = await supabase.rpc(
    "obtener_siguiente_numero_pedido",
    { target_restaurante_id: orderData.restaurante_id },
  );

  // Si rpcError no es null, Supabase nos dirá por qué falló (ej: error de permisos o ID inexistente)
  if (rpcError) {
    console.error("❌ Error Crítico RPC:", rpcError.message);
    throw new Error(`Error en el contador: ${rpcError.message}`);
  }

  // Si nuevoNumero sigue siendo null aquí (aunque con el RAISE EXCEPTION de arriba ya no debería pasar)
  if (nuevoNumero === null) {
    throw new Error("El restaurante no devolvió un número de pedido válido.");
  }

  // 2. Insertar Encabezado (PEDIDOS)
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .insert({
      restaurante_id: orderData.restaurante_id,
      mesa_id: orderData.mesa_id,
      total: orderData.total,
      estado: "pendiente",
      notas: orderData.notas || null, // 👈 AHORA SÍ incluimos las notas del pedido
      es_adicional: orderData.es_adicional,
      numero_pedido_dia: nuevoNumero,
    })
    .select("id, numero_pedido_dia")
    .single();

  if (pedidoError || !pedido) {
    throw new Error(`Error en encabezado: ${pedidoError?.message}`);
  }

  // --- PREPARAR LOS DETALLES (DETALLE_PEDIDOS)
  const detalles = orderData.items.map((item) => ({
    pedido_id: pedido.id,
    producto_id: item.id,
    cantidad: item.cantidad,
    precio_unitario: item.precio,
    notas: item.notas || null,
  }));

  // 4. Insertar Detalles en Bulk
  const { error: detallesError } = await supabase
    .from("detalle_pedidos")
    .insert(detalles);

  if (detallesError) {
    console.error("Error crítico en detalles:", detallesError);
    // Podrías borrar el encabezado aquí (Rollback manual) si fuera necesario
    throw new Error("Error al insertar los productos del pedido.");
  }

  return {
    success: true,
    pedidoId: pedido.id,
    numeroComanda: pedido.numero_pedido_dia,
  };
}
