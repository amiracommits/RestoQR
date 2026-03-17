'use client'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import BotonEliminar from './BotonEliminar'

export default function ListaProductosCliente({ productosIniciales }: { productosIniciales: any[] }) {
  const [busqueda, setBusqueda] = useState('')

  // Usamos useMemo para que el filtrado sea ultra eficiente
  const productosFiltrados = useMemo(() => {
    return productosIniciales.filter((prod) => {
      const term = busqueda.toLowerCase()
      return (
        prod.nombre.toLowerCase().includes(term) ||
        prod.categorias?.nombre?.toLowerCase().includes(term) ||
        prod.descripcion?.toLowerCase().includes(term)
      )
    })
  }, [busqueda, productosIniciales])

  // Helper para la imagen (el que ya teníamos)
  const getProductImage = (nombre: string, unsplashId?: string, url?: string) => {
    if (url) return url
    if (unsplashId) return `https://images.unsplash.com/photo-${unsplashId}?auto=format&fit=crop&q=80&w=400`
    return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=60&w=400&sig=${encodeURIComponent(nombre)}`
  }

  return (
    <div className="space-y-6">
      {/* BARRA DE BÚSQUEDA */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-slate-400">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, categoría o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-2xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-all shadow-sm"
        />
        {busqueda && (
          <button 
            onClick={() => setBusqueda('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Imagen</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Producto</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Precio</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden shadow-sm">
                      <Image 
                        src={getProductImage(prod.nombre, prod.unsplash_id, prod.imagen_url)}
                        alt={prod.nombre}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">{prod.nombre}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">{prod.descripcion}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                      {prod.categorias?.nombre || 'Sin categoría'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">
                    L. {prod.precio.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link 
                      href={`/admin/productos/${prod.id}`}
                      className="text-slate-400 hover:text-orange-600 transition-colors p-2"
                    >
                      ✏️
                    </Link>
                    <BotonEliminar id={prod.id} nombre={prod.nombre} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                  No se encontraron productos que coincidan con "{busqueda}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}