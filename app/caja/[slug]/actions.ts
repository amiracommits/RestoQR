"use server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Finaliza el ciclo completo de una mesa:
 * 1. Marca la factura como pagada.
 * 2. Libera la mesa (disponible).
 * 3. Marca todos los pedidos asociados como pagados.
 */
export async function finalizarPedidoCompleto(
  facturaId: string,
  slug: string,
  formaPago: "efectivo" | "tarjeta" | "transferencia" | "mixto",
  pagosMixtos?: { pago_efectivo: number; pago_tarjeta: number; pago_transferencia: number },
) {
  const supabase = await createClient();




  if (!["efectivo", "tarjeta", "transferencia", "mixto"].includes(formaPago)) {
    return { success: false, error: "Forma de pago inválida." };
  }
  const { data: factura, error: consultaError } = await supabase
    .from("facturas").select("total, estado").eq("id", facturaId).single();
  if (consultaError || !factura || factura.estado !== "generada") {
    return { success: false, error: "La factura no está disponible para cobrar." };
  }
  const total = Number(factura.total ?? 0);
  const pagos = formaPago === "mixto" ? pagosMixtos : {
    pago_efectivo: formaPago === "efectivo" ? total : 0,
    pago_tarjeta: formaPago === "tarjeta" ? total : 0,
    pago_transferencia: formaPago === "transferencia" ? total : 0,
  };
  const montos = pagos && [pagos.pago_efectivo, pagos.pago_tarjeta, pagos.pago_transferencia];
  if (!montos || montos.some((monto) =>
    typeof monto !== "number" || !Number.isFinite(monto) || monto < 0 ||
    Math.abs(monto * 100 - Math.round(monto * 100)) > 0.000001
  ) || montos.reduce((suma, monto) => suma + Math.round(monto * 100), 0) > Math.round(total * 100)) {
    return { success: false, error: "Los montos deben ser no negativos, tener máximo dos decimales y no superar el total de la factura." };
  }
  // El RPC guarda el desglose y finaliza el cobro en una sola transacción.
  const { error } = await supabase.rpc("finalizar_cuenta_mesa", {
    target_factura_id: facturaId,
    p_forma_pago: formaPago,
    p_pago_efectivo: pagos!.pago_efectivo,
    p_pago_tarjeta: pagos!.pago_tarjeta,
    p_pago_transferencia: pagos!.pago_transferencia,
  });

  if (error) {
    console.error("❌ Error al ejecutar RPC finalizar_cuenta_mesa:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath(`/caja/${slug}`);
  revalidatePath(`/caja/${slug}/cierre`);

  return { success: true };
}

export async function ejecutarCierreCaja(formData: FormData): Promise<void> {
  const restauranteId = formData.get("restaurante_id") as string;
  const slug = formData.get("slug") as string;

  if (!restauranteId || !slug) {
    throw new Error("Datos incompletos para cierre de caja.");
  }

  const supabase = await createClient();

  const { data: cierreId, error } = await supabase.rpc("cerrar_caja_restaurante", {
    p_restaurante_id: restauranteId,
  });

  if (error) {
    console.error("❌ Error al ejecutar RPC cerrar_caja_restaurante:", error.message);
    throw new Error(error.message);
  }

  const { error: flagError } = await supabase.rpc("gestionar_caja_flag", {
    modo: "cerrar",
  });

  if (flagError) {
    console.error("❌ Error al cerrar flag de caja:", flagError.message);
    throw new Error(flagError.message);
  }
  

  revalidatePath(`/caja/${slug}`);
  revalidatePath(`/caja/${slug}/cierre`);
  if (cierreId) {
    redirect(`/caja/${slug}/cierre/confirmacion?cierre=${cierreId}`);
  }

  redirect(`/caja/${slug}/cierre/confirmacion`);
}
