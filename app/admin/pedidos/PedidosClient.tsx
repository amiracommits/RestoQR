'use client'
// app/admin/pedidos/PedidosClient.tsx
// ✅ Client Component — toda la UI interactiva y estado local
// NO importa actions.ts ni llama a Supabase directamente

import { useState, useMemo } from 'react'
import { ArrowPathIcon, DocumentArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { exportarPDF } from '@/utils/exportUtils'
import { revivirPedidoAction } from './actions'

// --- TIPOS ---
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

// --- COMPONENTE ---
export default function PedidosClient({ pedidosIniciales }: PedidosClientProps) {
  // ✅ Fallback seguro — nunca será undefined
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales ?? [])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  // --- LÓGICA DE FILTRADO (Client Side para respuesta instantánea) ---
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

  // --- FUNCIÓN PARA "REVIVIR" PEDIDO ---
  // ✅ Ahora llama a la Server Action importada desde actions.ts
  const revivirPedido = async (id: string) => {
    if (!confirm('¿Deseas devolver este pedido a la cocina?')) return

    try {
      await revivirPedidoAction(id)
      // Si no lanza error, actualizamos el estado local optimistamente
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: 'pendiente' } : p))
      )
    } catch (error) {
      alert('No se pudo actualizar el pedido.')
      console.error(error)
    }
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* HEADER Y FILTROS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black text-slate-900 uppercase">
            Gestión de Pedidos
          </h1>
          <button
            onClick={() => exportarPDF(pedidosFiltrados)}
            className="bg-[#1E389E] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all"
          >
            <DocumentArrowDownIcon className="w-5 h-5" /> Exportar PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Selector de Estado */}
          <select
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-slate-100 border-none rounded-xl font-bold text-slate-600 p-3"
          >
            <option value="todos">Todos los Estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="entregado">Completados</option>
            <option value="facturado">Facturados</option>
          </select>

          {/* Selector de Tipo */}
          <select
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-slate-100 border-none rounded-xl font-bold text-slate-600 p-3"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="principal">Solo Principales</option>
            <option value="adicional">Solo Adicionales</option>
          </select>

          {/* Date Pickers */}
          <input
            type="date"
            onChange={(e) => setFechaInicio(e.target.value)}
            className="bg-slate-100 border-none rounded-xl font-bold text-slate-600 p-3"
          />
          <input
            type="date"
            onChange={(e) => setFechaFin(e.target.value)}
            className="bg-slate-100 border-none rounded-xl font-bold text-slate-600 p-3"
          />
        </div>
      </div>

      {/* TABLA DE DATOS */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {pedidosFiltrados.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
            No se encontraron pedidos con los filtros aplicados
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black tracking-widest">
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
            <tbody className="divide-y divide-slate-100">
              {pedidosFiltrados.map((pedido) => (
                <tr
                  key={pedido.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="p-5 text-xs font-bold text-slate-500">
                    {format(new Date(pedido.created_at), 'dd/MM/yy HH:mm')}
                  </td>
                  <td className="p-5 font-black text-slate-900">
                    MESA {pedido.mesas?.numero_mesa}
                  </td>
                  <td className="p-5">
                    <span
                      className={`text-[9px] font-black px-2 py-1 rounded-md ${
                        pedido.es_adicional
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {pedido.es_adicional ? 'ADICIONAL' : 'PRINCIPAL'}
                    </span>
                  </td>
                  <td className="p-5 text-xs text-slate-600 max-w-xs truncate">
                    {pedido.detalle_pedidos
                      .map((d) => `${d.cantidad}x ${d.productos.nombre}`)
                      .join(', ')}
                  </td>
                  <td className="p-5 font-black text-slate-900 text-sm">
                    L. {pedido.total.toFixed(2)}
                  </td>
                  <td className="p-5">
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                        pedido.estado === 'pendiente'
                          ? 'bg-blue-100 text-blue-600'
                          : pedido.estado === 'entregado'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-orange-100 text-orange-600'
                      }`}
                    >
                      {pedido.estado}
                    </span>
                  </td>
                  <td className="p-5 text-right space-x-2">
                    {pedido.estado === 'entregado' && (
                      <button
                        onClick={() => revivirPedido(pedido.id)}
                        title="Revivir Pedido"
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-200">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
