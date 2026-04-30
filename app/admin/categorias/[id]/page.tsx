import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import EditarCategoriaClient from "./EditarCategoriaClient"

export default async function EditarCategoriaPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // Verifica que la categoría pertenece a SU restaurante
  const { data: categoria } = await supabase
    .from("categorias")
    .select("*")
    .eq("id", id)
    .eq("restaurante_id", perfil.restaurante_id) // seguridad tenant
    .single()

  if (!categoria) redirect("/unauthorized")

  return <EditarCategoriaClient categoria={categoria} />
}