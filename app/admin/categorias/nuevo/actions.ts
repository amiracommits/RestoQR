"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

// Helper: verifica que el usuario sea admin del restaurante
async function verificarAcceso() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/unauthorized")

  const { data: perfil } = await supabase
    .from("perfiles_admin")
    .select("rol, restaurante_id")
    .eq("id", user.id)
    .single()

  if (!perfil || !["admin", "superadmin"].includes(perfil.rol)) {
    redirect("/unauthorized")
  }

  return { supabase, perfil }
}

export async function crearCategoria(formData: FormData) {
  const { supabase, perfil } = await verificarAcceso()

  const { error } = await supabase
    .from("categorias")
    .insert({
      restaurante_id: perfil.restaurante_id,
      nombre:         formData.get("nombre"),
      orden:          Number(formData.get("orden")) || 0,
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function actualizarCategoria(formData: FormData) {
  const { supabase, perfil } = await verificarAcceso()

  const id = formData.get("id") as string

  const { error } = await supabase
    .from("categorias")
    .update({
      nombre: formData.get("nombre"),
      orden:  Number(formData.get("orden")) || 0,
    })
    // El AND restaurante_id garantiza que solo edita sus propias categorías
    .eq("id", id)
    .eq("restaurante_id", perfil.restaurante_id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function eliminarCategoria(id: string) {
  const { supabase, perfil } = await verificarAcceso()

  const { error } = await supabase
    .from("categorias")
    .delete()
    .eq("id", id)
    .eq("restaurante_id", perfil.restaurante_id) // seguridad tenant

  if (error) return { success: false, error: error.message }
  return { success: true }
}
