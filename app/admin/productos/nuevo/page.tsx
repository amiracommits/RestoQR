import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import FormularioProducto from './FormularioProducto' 

export default async function NuevoProductoPage() {
  const supabase = await createClient()

  // 1. Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Obtener perfil para saber el restaurante_id
  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('restaurante_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  // 3. Obtener las categorías disponibles de TU restaurante
  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nombre')
    .eq('restaurante_id', perfil.restaurante_id)
    .order('nombre')

  return (
    <main>
      <FormularioProducto categorias={categorias || []} />
    </main>
  )
}