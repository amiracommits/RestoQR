'use client'
// app/admin/pedidos/PedidosClient.tsx

import { useState, useMemo } from 'react'
import { ArrowPathIcon, DocumentArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { exportarPDF } from '@/utils/exportUtils'
import { revivirPedidoAction } from './actions'

interface Producto {
  nombre: string
}

interface DetallePedido {
  id: string
  cantidad: number
  precio: number
  notas?: string
  productos: Producto
}

interface Mesa {
  numero_mesa: number
}

interface Pedido {
  id: string
  created_at: string
  estado: 'pendiente' | 'entregado' | 'facturado'
  es_adicional: boolean
  total: number
  mesas: Mesa
  detalle_pedidos: DetallePedido[]
  restaurante_id: string
}

interface PedidosClientProps {
  pedidosIniciales: Pedido[]
}

export default function PedidosClient({ pedidosIniciales }: PedidosClientProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales ?? [])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const pedidosFiltrados = useMemo(() => {
    return pedidos
      .filter((p) => {
        const cumpleEstado = filtroEstado === 'todos' || p.estado === filtroEstado
        const cumpleTipo =
          filtroTipo === 'todos' ||
          (filtroTipo === 'principal' ? !p.es_adicional : p.es_adicional)

        const fechaPedido = new Date(p.created_at).toISOString().split('T')[0]
        const cumpleFecha =
          (!fechaInicio || fechaPedido >= fechaInicio) &&
          (!fechaFin || fechaPedido <= fechaFin)

        return cumpleEstado && cumpleTipo && cumpleFecha
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }, [pedidos, filtroEstado, filtroTipo, fechaInicio, fechaFin])

  const revivirPedido = async (id: string) => {
    if (!confirm('¿Deseas devolver este pedido a la cocina?')) return

    try {
      await revivirPedidoAction(id)
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: 'pendiente' } : p))
      )
    } catch (error) {
      alert('No se pudo actualizar el pedido.')
      console.error(error)
    }
  }

  const inputClassName =
    'rounded-xl border border-white/[0.07] bg-white/[0.04] p-3 text-sm font-medium text-neutral-200 outline-none transition-colors focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20'

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">
              Historial operativo
            </p>
            <h1 className="mt-2 text-2xl font-medium tracking-tight text-neutral-100">
              Gestión de pedidos
            </h1>
          </div>

          <button
            onClick={() => exportarPDF(pedidosFiltrados)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E85D26] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-700"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Exportar PDF
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className={inputClassName}
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="entregado">Completados</option>
            <option value="facturado">Facturados</option>
          </select>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className={inputClassName}
          >
            <option value="todos">Todos los tipos</option>
            <option value="principal">Solo principales</option>
            <option value="adicional">Solo adicionales</option>
          </select>

          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className={inputClassName}
            style={{ colorScheme: 'dark' }}
          />

          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className={inputClassName}
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1a1a1a]">
        {pedidosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-sm font-medium uppercase tracking-widest text-neutral-600">
            No se encontraron pedidos con los filtros aplicados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] font-medium uppercase tracking-widest text-neutral-600">
                <tr>
                  <th className="p-5">Fecha/Hora</th>
                  <th className="p-5">Mesa</th>
                  <th className="p-5">Tipo</th>
                  <th className="p-5">Productos</th>
                  <th className="p-5">Total</th>
                  <th className="p-5">Estado</th>
                  <th className="p-5 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.05]">
                {pedidosFiltrados.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="p-5 text-xs font-medium text-neutral-500">
                      {format(new Date(pedido.created_at), 'dd/MM/yy HH:mm')}
                    </td>

                    <td className="p-5 font-semibold text-neutral-100">
                      MESA {pedido.mesas?.numero_mesa}
                    </td>

                    <td className="p-5">
                      <span
                        className={`rounded-md px-2 py-1 text-[9px] font-semibold uppercase ${
                          pedido.es_adicional
                            ? 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
                            : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        {pedido.es_adicional ? 'ADICIONAL' : 'PRINCIPAL'}
                      </span>
                    </td>

                    <td className="max-w-xs truncate p-5 text-xs text-neutral-400">
                      {pedido.detalle_pedidos
                        .map((d) => `${d.cantidad}x ${d.productos.nombre}`)
                        .join(', ')}
                    </td>

                    <td className="p-5 text-sm font-semibold text-neutral-100">
                      L. {pedido.total.toFixed(2)}
                    </td>

                    <td className="p-5">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                          pedido.estado === 'pendiente'
                            ? 'border border-sky-500/20 bg-sky-500/10 text-sky-300'
                            : pedido.estado === 'entregado'
                            ? 'border border-neutral-500/20 bg-neutral-500/10 text-neutral-400'
                            : 'border border-orange-500/20 bg-orange-500/10 text-orange-300'
                        }`}
                      >
                        {pedido.estado}
                      </span>
                    </td>

                    <td className="space-x-2 p-5 text-right">
                      {pedido.estado === 'entregado' && (
                        <button
                          onClick={() => revivirPedido(pedido.id)}
                          title="Revivir pedido"
                          className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-2 text-sky-300 transition-colors hover:bg-sky-500/20"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                        </button>
                      )}

                      <button className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-2 text-neutral-500 transition-colors hover:bg-white/[0.08] hover:text-neutral-200">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
