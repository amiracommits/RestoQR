'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type DetalleFacturaAdmin = {
  id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  impuesto_linea: number | null
  notas: string | null
  productos: {
    nombre: string | null
  } | null
}

export type FacturaAdmin = {
  id: string
  numero_factura: string | null
  numero_pedido_amigable: number | null
  nombre_cliente: string | null
  rtn_cliente: string | null
  estado: string
  forma_pago: string | null
  total: number
  impuesto_iva_normal: number | null
  impuesto_iva_especial: number | null
  created_at: string
  updated_at: string | null
  mesas: { numero_mesa: string | number | null }[] | { numero_mesa: string | number | null } | null
  detalle_facturas: DetalleFacturaAdmin[]
}

type FacturasFilters = {
  from: string
  to: string
  estado?: string
}

const ESTADOS_VALIDOS = ['generada', 'pagada', 'cerrada', 'anulada']

async function getAdminProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Sesion no encontrada')

  const { data: perfil, error } = await supabase
    .from('perfiles_admin')
    .select('rol, restaurante_id, restaurantes(nombre)')
    .eq('id', user.id)
    .single()

  if (error || !perfil?.restaurante_id) {
    throw new Error('No tienes un restaurante asignado')
  }

  if (!['admin', 'superadmin'].includes(perfil.rol)) {
    throw new Error('Usuario no autorizado')
  }

  return { supabase, perfil }
}

function nextDayISO(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`)
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

async function getFacturaById(facturaId: string, restauranteId: string) {
  const { supabase } = await getAdminProfile()

  const { data, error } = await supabase
    .from('facturas')
    .select(`
      id,
      numero_factura,
      numero_pedido_amigable,
      nombre_cliente,
      rtn_cliente,
      estado,
      forma_pago,
      total,
      impuesto_iva_normal,
      impuesto_iva_especial,
      created_at,
      updated_at,
      mesas (numero_mesa),
      detalle_facturas (
        id,
        cantidad,
        precio_unitario,
        subtotal,
        impuesto_linea,
        notas,
        productos (nombre)
      )
    `)
    .eq('id', facturaId)
    .eq('restaurante_id', restauranteId)
    .single()

  if (error) throw new Error(error.message)

  return data as unknown as FacturaAdmin
}

export async function getFacturasAdmin(filters: FacturasFilters) {
  const { supabase, perfil } = await getAdminProfile()
  const estado = filters.estado && ESTADOS_VALIDOS.includes(filters.estado) ? filters.estado : 'todos'
  const from = filters.from
  const to = filters.to
  const normalizedFrom = from <= to ? from : to
  const normalizedTo = from <= to ? to : from

  let query = supabase
    .from('facturas')
    .select(`
      id,
      numero_factura,
      numero_pedido_amigable,
      nombre_cliente,
      rtn_cliente,
      estado,
      forma_pago,
      total,
      impuesto_iva_normal,
      impuesto_iva_especial,
      created_at,
      updated_at,
      mesas (numero_mesa),
      detalle_facturas (
        id,
        cantidad,
        precio_unitario,
        subtotal,
        impuesto_linea,
        notas,
        productos (nombre)
      )
    `)
    .eq('restaurante_id', perfil.restaurante_id)
    .gte('created_at', `${normalizedFrom}T00:00:00`)
    .lt('created_at', `${nextDayISO(normalizedTo)}T00:00:00`)
    .order('created_at', { ascending: false })

  if (estado !== 'todos') {
    query = query.eq('estado', estado)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  const restaurantePerfil = Array.isArray(perfil.restaurantes)
    ? perfil.restaurantes[0]
    : perfil.restaurantes

  return {
    facturas: (data ?? []) as unknown as FacturaAdmin[],
    restauranteNombre: restaurantePerfil?.nombre ?? 'Restaurante',
  }
}

export async function anularFacturaAction(facturaId: string) {
  const { supabase, perfil } = await getAdminProfile()

  const { error } = await supabase.rpc('anular_factura', {
    p_factura_id: facturaId,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/facturas')
  return getFacturaById(facturaId, perfil.restaurante_id)
}

export async function guardarDetalleFacturaAction(
  facturaId: string,
  detalleIdsEliminados: string[],
) {
  const { supabase, perfil } = await getAdminProfile()
  const ids = Array.from(new Set(detalleIdsEliminados.filter(Boolean)))

  if (ids.length > 0) {
    const { error } = await supabase.rpc('recalcular_factura_despues_eliminar_productos', {
      p_factura_id: facturaId,
      p_detalle_ids: ids,
    })

    if (error) throw new Error(error.message)
  }

  revalidatePath('/admin/facturas')
  return getFacturaById(facturaId, perfil.restaurante_id)
}
