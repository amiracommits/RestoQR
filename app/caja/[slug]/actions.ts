"use server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Finaliza el ciclo completo de una mesa:
 * 1. Marca la factura como pagada.
 * 2. Libera la mesa (disponible).
 * 3. Marca todos los pedidos asociados como pagados.
 */
export async function finalizarPedidoCompleto(facturaId: string, slug: string) {
  const supabase = await createClient();

  // Ejecutamos el RPC que centraliza toda la lógica transaccional en la DB
  const { error } = await supabase.rpc("finalizar_cuenta_mesa", {
    target_factura_id: facturaId,
  });

  if (error) {
    console.error(
      "❌ Error al ejecutar RPC finalizar_cuenta_mesa:",
      error.message,
    );
    return { success: false, error: error.message };
  }

  // Refrescamos la ruta para que los cambios se reflejen en el Dashboard de Caja
  revalidatePath(`/caja/${slug}`);

  return { success: true };
}
