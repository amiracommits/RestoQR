import { redirect } from 'next/navigation'
import FacturasClient from './FacturasClient'
import { getFacturasAdmin } from './actions'

type SearchParams = Promise<{ from?: string; to?: string; estado?: string }>

const ESTADOS_VALIDOS = ['todos', 'generada', 'pagada', 'cerrada', 'anulada']
const isValidISODate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

export default async function FacturasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const defaults = currentMonthRange()
  const from = isValidISODate(params.from) ? params.from! : defaults.from
  const to = isValidISODate(params.to) ? params.to! : defaults.to
  const estado = params.estado && ESTADOS_VALIDOS.includes(params.estado) ? params.estado : 'todos'

  let data: Awaited<ReturnType<typeof getFacturasAdmin>>

  try {
    data = await getFacturasAdmin({ from, to, estado })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar facturas'

    if (message.includes('Sesion')) redirect('/login')
    if (message.includes('autorizado')) redirect('/unauthorized')

    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        Error al cargar facturas: {message}
      </div>
    )
  }

  return (
    <FacturasClient
      key={`${from}-${to}-${estado}`}
      facturasIniciales={data.facturas}
      restauranteNombre={data.restauranteNombre}
      filtrosIniciales={{ from, to, estado }}
    />
  )
}
