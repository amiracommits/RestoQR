import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DateRangeFilters from './DateRangeFilters'

type SearchParams = Promise<{ from?: string; to?: string }>

type FacturaVenta = {
  id: string
  numero_factura: string | null
  numero_pedido_amigable: number | null
  total: number
  forma_pago: string | null
  created_at: string
  nombre_cliente: string | null
  mesas: { numero_mesa: string | null }[] | null
  detalle_facturas: {
    cantidad: number
    subtotal: number
    productos: { nombre: string | null } | null
  }[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(value)

const isValidISODate = (value?: string) =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))

const startOfDayISO = (dateISO: string) => `${dateISO}T00:00:00`
const nextDayISO = (dateISO: string) => {
  const base = new Date(`${dateISO}T00:00:00`)
  base.setDate(base.getDate() + 1)
  return base.toISOString().slice(0, 10)
}

export default async function VentasReportPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { from, to } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('rol, restaurante_id, restaurantes(nombre)')
    .eq('id', user.id)
    .single()

  if (!perfil || !['admin', 'superadmin'].includes(perfil.rol)) {
    redirect('/unauthorized')
  }

  const today = new Date().toISOString().slice(0, 10)
  const fromDate = isValidISODate(from) ? (from as string) : today
  const toDate = isValidISODate(to) ? (to as string) : today
  const normalizedFrom = fromDate <= toDate ? fromDate : toDate
  const normalizedTo = fromDate <= toDate ? toDate : fromDate

  const rangeStart = startOfDayISO(normalizedFrom)
  const rangeEnd = startOfDayISO(nextDayISO(normalizedTo))

  const { data: facturasData, error } = await supabase
    .from('facturas')
    .select(`
      id,
      numero_factura,
      numero_pedido_amigable,
      total,
      forma_pago,
      created_at,
      nombre_cliente,
      mesas (numero_mesa),
      detalle_facturas (
        cantidad,
        subtotal,
        productos (nombre)
      )
    `)
    .eq('restaurante_id', perfil.restaurante_id)
    .in('estado', ['pagada', 'cerrada'])
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        Error al cargar ventas: {error.message}
      </div>
    )
  }

  const facturas = (facturasData ?? []) as unknown as FacturaVenta[]

  const totalFacturas = facturas.length
  const totalGeneral = facturas.reduce((acc, f) => acc + Number(f.total ?? 0), 0)
  const ticketPromedio = totalFacturas > 0 ? totalGeneral / totalFacturas : 0

  const paymentTotals = facturas.reduce(
    (acc, factura) => {
      const total = Number(factura.total ?? 0)
      const metodo = (factura.forma_pago ?? '').toLowerCase()
      if (metodo.includes('tarjeta') || metodo.includes('voucher')) acc.tarjeta += total
      else if (metodo.includes('transfer')) acc.transferencia += total
      else acc.efectivo += total
      return acc
    },
    { efectivo: 0, tarjeta: 0, transferencia: 0 },
  )

  const productosMap = new Map<string, { cantidad: number; total: number }>()
  for (const factura of facturas) {
    for (const item of factura.detalle_facturas ?? []) {
      const nombre = item.productos?.nombre || 'Producto sin nombre'
      const current = productosMap.get(nombre) || { cantidad: 0, total: 0 }
      current.cantidad += Number(item.cantidad ?? 0)
      current.total += Number(item.subtotal ?? 0)
      productosMap.set(nombre, current)
    }
  }

  const topProductos = Array.from(productosMap.entries())
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8)

  const maxCantidad = topProductos[0]?.cantidad || 1

  const restaurantePerfil = Array.isArray(perfil?.restaurantes)
  ? perfil.restaurantes[0]
  : perfil?.restaurantes;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Reportes BI</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-neutral-100 sm:text-3xl">
            Ventas
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {restaurantePerfil?.nombre || 'Restaurante'} · datos de facturas pagadas/cerradas
          </p>
        </div>
        <DateRangeFilters defaultFrom={normalizedFrom} defaultTo={normalizedTo} />
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Facturas</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-100">{totalFacturas}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Total general</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-100">{formatCurrency(totalGeneral)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Ticket promedio</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-100">{formatCurrency(ticketPromedio)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Rango aplicado</p>
          <p className="mt-2 text-sm font-semibold text-neutral-100">
            {normalizedFrom} → {normalizedTo}
          </p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-300">Efectivo</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatCurrency(paymentTotals.efectivo)}</p>
        </div>
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-sky-300">Tarjeta</p>
          <p className="mt-2 text-2xl font-semibold text-sky-300">{formatCurrency(paymentTotals.tarjeta)}</p>
        </div>
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-300">Transferencia</p>
          <p className="mt-2 text-2xl font-semibold text-violet-300">{formatCurrency(paymentTotals.transferencia)}</p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <h2 className="text-lg font-medium text-neutral-100">Platos más vendidos</h2>
          <div className="mt-4 space-y-3">
            {topProductos.length === 0 ? (
              <p className="text-sm text-neutral-500">Sin ventas en el rango seleccionado.</p>
            ) : (
              topProductos.map((item) => (
                <div key={item.nombre}>
                  <div className="mb-1 flex items-center justify-between gap-4 text-xs">
                    <span className="truncate font-medium text-neutral-200">{item.nombre}</span>
                    <span className="shrink-0 font-semibold text-neutral-400">
                      {item.cantidad} uds · {formatCurrency(item.total)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-white/[0.08]">
                    <div
                      className="h-full rounded bg-[#E85D26]"
                      style={{ width: `${Math.max(8, (item.cantidad / maxCantidad) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <h2 className="text-lg font-medium text-neutral-100">Resumen ejecutivo</h2>
          <ul className="mt-4 space-y-3 text-sm text-neutral-400">
            <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              Facturación total del período: <span className="font-semibold text-neutral-200">{formatCurrency(totalGeneral)}</span>
            </li>
            <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              Método dominante: <span className="font-semibold text-neutral-200">
                {paymentTotals.efectivo >= paymentTotals.tarjeta && paymentTotals.efectivo >= paymentTotals.transferencia
                  ? 'Efectivo'
                  : paymentTotals.tarjeta >= paymentTotals.transferencia
                    ? 'Tarjeta'
                    : 'Transferencia'}
              </span>
            </li>
            <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              Cantidad de documentos de venta: <span className="font-semibold text-neutral-200">{totalFacturas}</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-100">Facturas del período</h2>
          <span className="text-xs uppercase tracking-widest text-neutral-600">Más reciente primero</span>
        </div>
        <div className="max-h-[520px] overflow-auto rounded-xl border border-white/[0.06]">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#181818] text-xs uppercase tracking-wider text-neutral-600">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Mesa</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    No hay facturas para el rango seleccionado.
                  </td>
                </tr>
              ) : (
                facturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-neutral-300">
                      {new Date(factura.created_at).toLocaleString('es-HN')}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-200">{factura.numero_factura || 'N/A'}</td>
                    <td className="px-4 py-3 text-neutral-300">#{factura.numero_pedido_amigable ?? 'S/N'}</td>
                    <td className="px-4 py-3 text-neutral-300">{factura.mesas?.[0]?.numero_mesa ?? 'S/N'}</td>
                    <td className="px-4 py-3 text-neutral-300">{factura.nombre_cliente || 'CLIENTE FINAL'}</td>
                    <td className="px-4 py-3 capitalize text-neutral-300">{(factura.forma_pago || 'No definido').toLowerCase()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-300">
                      {formatCurrency(Number(factura.total ?? 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
