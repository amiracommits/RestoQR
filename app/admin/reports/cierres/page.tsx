import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DateRangeFilters from './DateRangeFilters'

type SearchParams = Promise<{ from?: string; to?: string }>

type CierreCaja = {
  id: string
  fecha_cierre: string
  cantidad_facturas: number
  total_facturado: number
  total_isv_normal: number
  total_isv_especial: number
  total_isv: number
  base_sin_impuesto: number
  total_efectivo: number
  total_tarjeta: number
  total_transferencia: number
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

export default async function CierresReportPage({
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

  const { data: cierresData, error } = await supabase
    .from('cierres_caja')
    .select(`
      id,
      fecha_cierre,
      cantidad_facturas,
      total_facturado,
      total_isv_normal,
      total_isv_especial,
      total_isv,
      base_sin_impuesto,
      total_efectivo,
      total_tarjeta,
      total_transferencia
    `)
    .eq('restaurante_id', perfil.restaurante_id)
    .gte('fecha_cierre', rangeStart)
    .lt('fecha_cierre', rangeEnd)
    .order('fecha_cierre', { ascending: false })

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        Error al cargar cierres: {error.message}
      </div>
    )
  }

  const cierres = (cierresData ?? []) as unknown as CierreCaja[]

  const totalCierres = cierres.length
  const totalFacturado = cierres.reduce((acc, cierre) => acc + Number(cierre.total_facturado ?? 0), 0)
  const totalFacturas = cierres.reduce((acc, cierre) => acc + Number(cierre.cantidad_facturas ?? 0), 0)
  const promedioPorCierre = totalCierres > 0 ? totalFacturado / totalCierres : 0
  const ticketPromedioFacturas = totalFacturas > 0 ? totalFacturado / totalFacturas : 0

  const totalEfectivo = cierres.reduce((acc, cierre) => acc + Number(cierre.total_efectivo ?? 0), 0)
  const totalTarjeta = cierres.reduce((acc, cierre) => acc + Number(cierre.total_tarjeta ?? 0), 0)
  const totalTransferencia = cierres.reduce((acc, cierre) => acc + Number(cierre.total_transferencia ?? 0), 0)

  const diaStats = new Map<string, { total: number; cierres: number; facturas: number }>()
  for (const cierre of cierres) {
    const dia = cierre.fecha_cierre.slice(0, 10)
    const current = diaStats.get(dia) || { total: 0, cierres: 0, facturas: 0 }
    current.total += Number(cierre.total_facturado ?? 0)
    current.cierres += 1
    current.facturas += Number(cierre.cantidad_facturas ?? 0)
    diaStats.set(dia, current)
  }

  const diaMasVendido = Array.from(diaStats.entries())
    .map(([dia, stats]) => ({ dia, ...stats }))
    .sort((a, b) => b.total - a.total)[0]

  const cierreMayor = [...cierres].sort(
    (a, b) => Number(b.total_facturado ?? 0) - Number(a.total_facturado ?? 0),
  )[0]

  const cierreConMasFacturas = [...cierres].sort(
    (a, b) => Number(b.cantidad_facturas ?? 0) - Number(a.cantidad_facturas ?? 0),
  )[0]

  const restaurantePerfil = Array.isArray(perfil?.restaurantes)
  ? perfil.restaurantes[0]
  : perfil?.restaurantes;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Reportes BI</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-neutral-100 sm:text-3xl">
            Cierres de Caja
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {restaurantePerfil?.nombre || 'Restaurante'} · consolidado de cierres ejecutados
          </p>
        </div>
        <DateRangeFilters defaultFrom={normalizedFrom} defaultTo={normalizedTo} />
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Cierres ejecutados</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-100">{totalCierres}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Facturación total</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-100">{formatCurrency(totalFacturado)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Facturas incluidas</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-100">{totalFacturas}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">Promedio por cierre</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-100">{formatCurrency(promedioPorCierre)}</p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-300">Efectivo</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatCurrency(totalEfectivo)}</p>
        </div>
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-sky-300">Tarjeta</p>
          <p className="mt-2 text-2xl font-semibold text-sky-300">{formatCurrency(totalTarjeta)}</p>
        </div>
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-300">Transferencia</p>
          <p className="mt-2 text-2xl font-semibold text-violet-300">{formatCurrency(totalTransferencia)}</p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <h2 className="text-lg font-medium text-neutral-100">Día con mayor venta</h2>
          {diaMasVendido ? (
            <div className="mt-4">
              <p className="text-xl font-semibold text-orange-300">
                {new Date(`${diaMasVendido.dia}T00:00:00`).toLocaleDateString('es-HN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                Total vendido: <span className="font-semibold text-neutral-200">{formatCurrency(diaMasVendido.total)}</span>
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                Cierres: <span className="font-semibold text-neutral-200">{diaMasVendido.cierres}</span> · Facturas: <span className="font-semibold text-neutral-200">{diaMasVendido.facturas}</span>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Sin cierres en el rango seleccionado.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
          <h2 className="text-lg font-medium text-neutral-100">Estadísticas clave</h2>
          <ul className="mt-4 space-y-3 text-sm text-neutral-400">
            <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              Ticket promedio global de facturas: <span className="font-semibold text-neutral-200">{formatCurrency(ticketPromedioFacturas)}</span>
            </li>
            <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              Cierre más alto: <span className="font-semibold text-neutral-200">
                {cierreMayor ? `${formatCurrency(Number(cierreMayor.total_facturado ?? 0))} · ${new Date(cierreMayor.fecha_cierre).toLocaleDateString('es-HN')}` : 'N/A'}
              </span>
            </li>
            <li className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              Cierre con más facturas: <span className="font-semibold text-neutral-200">
                {cierreConMasFacturas ? `${Number(cierreConMasFacturas.cantidad_facturas ?? 0)} facturas · ${new Date(cierreConMasFacturas.fecha_cierre).toLocaleDateString('es-HN')}` : 'N/A'}
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-neutral-100">Detalle de cierres</h2>
          <span className="text-xs uppercase tracking-widest text-neutral-600">Más reciente primero</span>
        </div>
        <div className="max-h-[520px] overflow-auto rounded-xl border border-white/[0.06]">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#181818] text-xs uppercase tracking-wider text-neutral-600">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Facturas</th>
                <th className="px-4 py-3 text-right">Efectivo</th>
                <th className="px-4 py-3 text-right">Tarjeta</th>
                <th className="px-4 py-3 text-right">Transferencia</th>
                <th className="px-4 py-3 text-right">ISV total</th>
                <th className="px-4 py-3 text-right">Total cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {cierres.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    No hay cierres en el rango seleccionado.
                  </td>
                </tr>
              ) : (
                cierres.map((cierre) => (
                  <tr key={cierre.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-neutral-300">
                      {new Date(cierre.fecha_cierre).toLocaleString('es-HN')}
                    </td>
                    <td className="px-4 py-3 text-neutral-300">{Number(cierre.cantidad_facturas ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-emerald-300">
                      {formatCurrency(Number(cierre.total_efectivo ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-sky-300">
                      {formatCurrency(Number(cierre.total_tarjeta ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-violet-300">
                      {formatCurrency(Number(cierre.total_transferencia ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-300">
                      {formatCurrency(Number(cierre.total_isv ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-300">
                      {formatCurrency(Number(cierre.total_facturado ?? 0))}
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
