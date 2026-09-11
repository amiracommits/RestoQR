'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckIcon,
  EyeIcon,
  FunnelIcon,
  NoSymbolIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  anularFacturaAction,
  guardarDetalleFacturaAction,
} from './actions'
import type { FacturaAdmin } from './actions'

type Props = {
  facturasIniciales: FacturaAdmin[]
  restauranteNombre: string
  filtrosIniciales: {
    from: string
    to: string
    estado: string
  }
}

const ESTADOS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'generada', label: 'Generada' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'anulada', label: 'Anulada' },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(value)

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

function getMesaLabel(factura: FacturaAdmin) {
  const mesas = factura.mesas
  if (Array.isArray(mesas)) return mesas[0]?.numero_mesa ?? 'S/N'
  return mesas?.numero_mesa ?? 'S/N'
}

function EstadoBadge({ estado }: { estado: string }) {
  const className =
    estado === 'anulada'
      ? 'border-red-500/20 bg-red-500/10 text-red-300'
      : estado === 'pagada' || estado === 'cerrada'
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
        : 'border-orange-500/20 bg-orange-500/10 text-orange-300'

  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${className}`}>
      {estado}
    </span>
  )
}

export default function FacturasClient({
  facturasIniciales,
  restauranteNombre,
  filtrosIniciales,
}: Props) {
  const router = useRouter()
  const [facturas, setFacturas] = useState(facturasIniciales)
  const [from, setFrom] = useState(filtrosIniciales.from)
  const [to, setTo] = useState(filtrosIniciales.to)
  const [estado, setEstado] = useState(filtrosIniciales.estado)
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaAdmin | null>(null)
  const [detalleIdsEliminados, setDetalleIdsEliminados] = useState<string[]>([])
  const [errorModal, setErrorModal] = useState('')
  const [isPending, startTransition] = useTransition()

  const totales = useMemo(() => {
    return facturas.reduce(
      (acc, factura) => {
        acc.cantidad += 1
        acc.total += Number(factura.total ?? 0)
        return acc
      },
      { cantidad: 0, total: 0 },
    )
  }, [facturas])

  const inputClassName =
    'h-11 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 text-sm font-medium text-neutral-200 outline-none transition-colors focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20'

  const aplicarFiltros = () => {
    const params = new URLSearchParams()
    params.set('from', from)
    params.set('to', to)
    if (estado !== 'todos') params.set('estado', estado)
    router.push(`/admin/facturas?${params.toString()}`)
  }

  const abrirDetalle = (factura: FacturaAdmin) => {
    setFacturaSeleccionada(factura)
    setDetalleIdsEliminados([])
    setErrorModal('')
  }

  const toggleDetalleEliminado = (detalleId: string) => {
    setDetalleIdsEliminados((prev) =>
      prev.includes(detalleId) ? prev.filter((id) => id !== detalleId) : [...prev, detalleId],
    )
  }

  const guardarCambios = () => {
    if (!facturaSeleccionada) return

    if (detalleIdsEliminados.length === 0) {
      setFacturaSeleccionada(null)
      return
    }

    if (detalleIdsEliminados.length >= facturaSeleccionada.detalle_facturas.length) {
      setErrorModal('La factura debe conservar al menos un producto.')
      return
    }

    setErrorModal('')
    startTransition(async () => {
      try {
        const facturaActualizada = await guardarDetalleFacturaAction(
          facturaSeleccionada.id,
          detalleIdsEliminados,
        )
        setFacturas((prev) =>
          prev.map((factura) =>
            factura.id === facturaActualizada.id ? facturaActualizada : factura,
          ),
        )
        setFacturaSeleccionada(facturaActualizada)
        setDetalleIdsEliminados([])
      } catch (error) {
        setErrorModal(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.')
      }
    })
  }

  const anularFactura = (factura: FacturaAdmin) => {
    if (factura.estado === 'anulada') return
    if (!confirm('Deseas anular esta factura?')) return

    startTransition(async () => {
      try {
        const facturaActualizada = await anularFacturaAction(factura.id)
        setFacturas((prev) =>
          estado !== 'todos' && facturaActualizada.estado !== estado
            ? prev.filter((item) => item.id !== facturaActualizada.id)
            : prev.map((item) => (item.id === facturaActualizada.id ? facturaActualizada : item)),
        )
        if (facturaSeleccionada?.id === facturaActualizada.id) {
          setFacturaSeleccionada(facturaActualizada)
        }
        alert('La factura ha sido anulada correctamente.')
        router.refresh()
      } catch (error) {
        alert(error instanceof Error ? error.message : 'No se pudo anular la factura.')
      }
    })
  }

  return (
    <div>
      <section className="mb-6 rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">
              Control administrativo
            </p>
            <h1 className="mt-2 text-2xl font-medium tracking-tight text-neutral-100 sm:text-3xl">
              Facturas
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {restauranteNombre} · {totales.cantidad} registros · {formatCurrency(totales.total)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[150px_150px_180px_auto]">
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={inputClassName}
              style={{ colorScheme: 'dark' }}
            />
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={inputClassName}
              style={{ colorScheme: 'dark' }}
            />
            <select
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className={inputClassName}
            >
              {ESTADOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={aplicarFiltros}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#E85D26] px-4 text-sm font-medium text-white transition-colors hover:bg-orange-700"
            >
              <FunnelIcon className="h-5 w-5" />
              Aplicar
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1a1a1a]">
        {facturas.length === 0 ? (
          <div className="p-12 text-center text-sm font-medium uppercase tracking-widest text-neutral-600">
            No se encontraron facturas con los filtros aplicados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left">
              <thead className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] font-medium uppercase tracking-widest text-neutral-600">
                <tr>
                  <th className="p-5">Fecha/Hora</th>
                  <th className="p-5">Factura</th>
                  <th className="p-5">Pedido</th>
                  <th className="p-5">Mesa</th>
                  <th className="p-5">Cliente</th>
                  <th className="p-5">Estado</th>
                  <th className="p-5">Pago</th>
                  <th className="p-5 text-right">Total</th>
                  <th className="p-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {facturas.map((factura) => (
                  <tr
                    key={factura.id}
                    onClick={() => abrirDetalle(factura)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="p-5 text-xs font-medium text-neutral-500">
                      {formatDateTime(factura.created_at)}
                    </td>
                    <td className="p-5 font-mono text-sm text-neutral-200">
                      {factura.numero_factura || 'N/A'}
                    </td>
                    <td className="p-5 text-sm text-neutral-300">
                      #{factura.numero_pedido_amigable ?? 'S/N'}
                    </td>
                    <td className="p-5 text-sm font-semibold text-neutral-100">
                      MESA {getMesaLabel(factura)}
                    </td>
                    <td className="max-w-[180px] truncate p-5 text-sm text-neutral-300">
                      {factura.nombre_cliente || 'CLIENTE FINAL'}
                    </td>
                    <td className="p-5">
                      <EstadoBadge estado={factura.estado} />
                    </td>
                    <td className="p-5 text-sm capitalize text-neutral-400">
                      {(factura.forma_pago || 'No definido').toLowerCase()}
                    </td>
                    <td className="p-5 text-right text-sm font-semibold text-orange-300">
                      {formatCurrency(Number(factura.total ?? 0))}
                    </td>
                    <td className="p-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            abrirDetalle(factura)
                          }}
                          title="Ver detalle"
                          className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-2 text-neutral-500 transition-colors hover:bg-white/[0.08] hover:text-neutral-200"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            anularFactura(factura)
                          }}
                          disabled={factura.estado === 'anulada' || isPending}
                          title="Anular factura"
                          className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <NoSymbolIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {facturaSeleccionada && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171717] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">
                  Detalle de factura
                </p>
                <h2 className="mt-1 text-xl font-semibold text-neutral-100">
                  {facturaSeleccionada.numero_factura || `Pedido #${facturaSeleccionada.numero_pedido_amigable ?? 'S/N'}`}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {formatDateTime(facturaSeleccionada.created_at)} · Mesa {getMesaLabel(facturaSeleccionada)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFacturaSeleccionada(null)}
                className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-2 text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-neutral-100"
                title="Cerrar"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Cliente</p>
                  <p className="mt-1 truncate text-sm font-medium text-neutral-200">
                    {facturaSeleccionada.nombre_cliente || 'CLIENTE FINAL'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Impuesto</p>
                  <p className="mt-1 text-sm font-medium text-neutral-200">
                    {formatCurrency(
                      Number(facturaSeleccionada.impuesto_iva_normal ?? 0) +
                        Number(facturaSeleccionada.impuesto_iva_especial ?? 0),
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Total</p>
                  <p className="mt-1 text-sm font-semibold text-orange-300">
                    {formatCurrency(Number(facturaSeleccionada.total ?? 0))}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-white/[0.03] text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
                    <tr>
                      <th className="p-4">Eliminar</th>
                      <th className="p-4">Producto</th>
                      <th className="p-4 text-right">Cantidad</th>
                      <th className="p-4 text-right">Precio</th>
                      <th className="p-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {facturaSeleccionada.detalle_facturas.map((detalle) => {
                      const eliminado = detalleIdsEliminados.includes(detalle.id)

                      return (
                        <tr key={detalle.id} className={eliminado ? 'bg-red-500/5 text-neutral-500' : ''}>
                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => toggleDetalleEliminado(detalle.id)}
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                                eliminado
                                  ? 'border-red-500/30 bg-red-500/15 text-red-300'
                                  : 'border-white/[0.07] bg-white/[0.04] text-neutral-500 hover:bg-red-500/10 hover:text-red-300'
                              }`}
                              title={eliminado ? 'Conservar producto' : 'Eliminar producto'}
                            >
                              {eliminado ? <CheckIcon className="h-4 w-4" /> : <TrashIcon className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-neutral-200">
                              {detalle.productos?.nombre || 'Producto sin nombre'}
                            </p>
                            {detalle.notas && (
                              <p className="mt-1 text-xs text-neutral-500">{detalle.notas}</p>
                            )}
                          </td>
                          <td className="p-4 text-right text-neutral-300">{detalle.cantidad}</td>
                          <td className="p-4 text-right text-neutral-300">
                            {formatCurrency(Number(detalle.precio_unitario ?? 0))}
                          </td>
                          <td className="p-4 text-right font-semibold text-neutral-100">
                            {formatCurrency(Number(detalle.subtotal ?? 0))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {errorModal && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {errorModal}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-500">
                {detalleIdsEliminados.length} producto(s) marcado(s) para eliminar
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFacturaSeleccionada(null)}
                  className="h-11 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 text-sm font-medium text-neutral-300 transition-colors hover:bg-white/[0.08]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarCambios}
                  disabled={isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#E85D26] px-4 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckIcon className="h-5 w-5" />
                  {isPending ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
