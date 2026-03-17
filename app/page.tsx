import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server' // Ahora sí lo encontrará

export default async function RootPage() {
  const supabase = await createClient() // Invocamos el helper
  
  const { data: { user } } = await supabase.auth.getUser()

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    redirect('/login')
  }

  // Si está autenticado, lo mandamos al dashboard administrativo
  redirect('/admin/dashboard')
}