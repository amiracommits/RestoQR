import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import UsuariosClient from './UsuariosClient'
import type { Usuario } from './types'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/unauthorized')

  const { data: perfil } = await supabase.from('perfiles_admin')
    .select('rol, restaurante_id').eq('id', user.id).single()
  if (!perfil?.restaurante_id || !['admin', 'superadmin'].includes(perfil.rol)) {
    redirect('/unauthorized')
  }

  const { data, error } = await supabase.rpc('gestionar_usuarios_tenant')

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-medium tracking-tight">Usuarios</h1>
      <p className="mt-1 mb-8 text-sm text-neutral-400">Gestiona los nombres y roles de los usuarios de tu restaurante.</p>
      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          No se pudieron cargar los usuarios. Verifica que la migración 10_gestionar_usuarios_tenant.sql esté aplicada y vuelve a cargar la página.
        </p>
      ) : <UsuariosClient usuarios={(data ?? []) as Usuario[]} usuarioActual={user.id} />}
    </div>
  )
}
