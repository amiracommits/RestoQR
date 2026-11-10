'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ROLES } from './types'

export async function gestionarUsuario(operacion: 'editar' | 'eliminar', id: string, nombre?: string, rol?: string) {
  if (!['editar', 'eliminar'].includes(operacion) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { error: 'Operación o usuario no válido.' }
  }
  if (operacion === 'editar' && (!nombre?.trim() || !ROLES.some((valor) => valor === rol))) {
    return { error: 'Ingresa el nombre para mostrar y selecciona un rol válido.' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión ha expirado. Inicia sesión nuevamente.' }

  const { error } = await supabase.rpc('gestionar_usuarios_tenant', {
    p_operacion: operacion,
    p_id: id,
    p_nombre: nombre?.trim() ?? null,
    p_rol: rol ?? null,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/usuarios')
  return { success: true }
}
