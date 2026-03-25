// app/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic' // Crucial para evitar que se cachee la redirección

export default async function IndexPage() {
  const supabase = await createClient()

  // 1. ¿Hay sesión activa?
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. ¿Qué rol tiene?
  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('rol, restaurantes(slug)')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const userSlug = perfil.restaurantes[0]?.slug

  // 3. Lógica de despacho
  if (perfil.rol === 'admin') {
    redirect('/admin/dashboard')
  } 
  
  if (perfil.rol === 'cocina' && userSlug) {
    redirect(`/cocina/${userSlug}`)
  }

  // Si algo falla o no tiene restaurante asignado
  redirect('/login')
}
