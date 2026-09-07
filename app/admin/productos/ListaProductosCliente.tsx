'use client'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import BotonEliminar from './BotonEliminar'

interface ProductoListado {
  id: string
  nombre: string
  descripcion?: string | null
  precio: number
  unsplash_id?: string | null
  imagen_url?: string | null
  bar_only?: boolean | null
  categorias?: {
    nombre?: string | null
  } | null
}

type BarOnlyFiltro = 'todos' | 'bar' | 'no_bar'

export default function ListaProductosCliente({
  productosIniciales,
}: {
  productosIniciales: ProductoListado[]
}) {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [barOnlyFiltro, setBarOnlyFiltro] = useState<BarOnlyFiltro>('todos')

  const categoriasDisponibles = useMemo(() => {
    const nombres = new Set<string>()

    productosIniciales.forEach((prod) => {
      const nombre = prod.categorias?.nombre?.trim()
      if (nombre) nombres.add(nombre)
    })

    return Array.from(nombres).sort((a, b) => a.localeCompare(b, 'es'))
  }, [productosIniciales])

  // Usamos useMemo para que el filtrado sea ultra eficiente
  const productosFiltrados = useMemo(() => {
    return productosIniciales.filter((prod) => {
      const term = busqueda.toLowerCase()
      const coincideBusqueda =
        prod.nombre.toLowerCase().includes(term) ||
        prod.categorias?.nombre?.toLowerCase().includes(term) ||
        prod.descripcion?.toLowerCase().includes(term)
      const coincideCategoria =
        categoriaFiltro === 'todas' ||
        prod.categorias?.nombre === categoriaFiltro
      const coincideBarOnly =
        barOnlyFiltro === 'todos' ||
        (barOnlyFiltro === 'bar' && prod.bar_only === true) ||
        (barOnlyFiltro === 'no_bar' && prod.bar_only !== true)

      return coincideBusqueda && coincideCategoria && coincideBarOnly
    })
  }, [barOnlyFiltro, busqueda, categoriaFiltro, productosIniciales])

  // Helper para la imagen (el que ya teníamos)
  const getProductImage = (
    nombre: string,
    unsplashId?: string | null,
    url?: string | null,
  ) => {
    if (url) return url
    if (unsplashId) return `https://images.unsplash.com/photo-${unsplashId}?auto=format&fit=crop&q=80&w=400`
    return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=60&w=400&sig=${encodeURIComponent(nombre)}`
  }

  return (
    <div className="space-y-6">
      {/* BARRA DE FILTROS */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_190px]">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-slate-400">🔍</span>
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, categoría o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="block w-full rounded-xl border border-white/[0.07] bg-[#1a1a1a] py-3 pl-10 pr-10 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20"

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

        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="block w-full rounded-xl border border-white/[0.07] bg-[#1a1a1a] px-4 py-3 text-sm text-neutral-100 outline-none transition-colors focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20"
        >
          <option value="todas">Todas las categorías</option>
          {categoriasDisponibles.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>

        <select
          value={barOnlyFiltro}
          onChange={(e) => setBarOnlyFiltro(e.target.value as BarOnlyFiltro)}
          className="block w-full rounded-xl border border-white/[0.07] bg-[#1a1a1a] py-3 px-4 text-sm text-neutral-100 outline-none transition-colors focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20"
        >
          <option value="todos">Todos los productos</option>
          <option value="bar">Solo bar</option>
          <option value="no_bar">No bar</option>
        </select>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1a1a1a]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/[0.06]">
          <thead className="bg-white/[0.03]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider">Imagen</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider">Producto</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider">Precio</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-neutral-600 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((prod) => (
                <tr key={prod.id} className="transition-colors hover:bg-white/[0.03]">
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
                    <div className="text-sm font-bold text-neutral-100">{prod.nombre}</div>
                    <div className="text-xs text-neutral-500 truncate max-w-[200px]">{prod.descripcion}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 text-[10px] font-bold uppercase rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-300">
                      {prod.categorias?.nombre || 'Sin categoría'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-neutral-300">
                    L. {prod.precio.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link 
                      href={`/admin/productos/${prod.id}`}
                      className="text-neutral-500 hover:text-[#E85D26] transition-colors p-2"
                    >
                      ✏️
                    </Link>
                    <BotonEliminar id={prod.id} nombre={prod.nombre} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                  No se encontraron productos con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
