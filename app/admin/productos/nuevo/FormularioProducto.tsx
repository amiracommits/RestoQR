'use client'
import { useState, useEffect, useRef } from 'react'
import { createProduct, updateProduct } from './actions' // 1. Importamos las dos acción
import Image from 'next/image'
import Link from 'next/link'

// 2. Definimos que puede recibir un 'productoInicial' opcional
export default function FormularioProducto({
  categorias,
  productoInicial
}: {
  categorias: any[],
  productoInicial?: any
}) {
  // 3. Inicializamos estados con datos existentes si es edición
  const [search, setSearch] = useState(productoInicial?.nombre || '')
  const [images, setImages] = useState([])
  const [selectedId, setSelectedId] = useState(productoInicial?.unsplash_id || '')
  const [loadingImages, setLoadingImages] = useState(false)
  const [previewLocal, setPreviewLocal] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search.length > 2) fetchImages()
    }, 1000)
    return () => clearTimeout(delayDebounceFn)
  }, [search])

  const fetchImages = async () => {
    setLoadingImages(true)
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${search}&client_id=${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}&per_page=8`
      )
      const data = await res.json()
      setImages(data.results || [])
    } catch (error) {
      console.error("Error buscando imágenes:", error)
    } finally {
      setLoadingImages(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewLocal(url)
      setSelectedId('')
    } else {
      setPreviewLocal(null)
    }
  }

  const handleUnsplashSelect = (img: any) => {
    const fullId = img.urls.raw.split('photo-')[1]?.split('?')[0]
    if (fullId) {
      setSelectedId(fullId)
      setPreviewLocal(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-8">
        <Link href="/admin/productos" className="text-sm text-neutral-500 transition-colors hover:text-neutral-200">
          ← Volver al listado
        </Link>
        {/* 4. Título dinámico */}
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-neutral-100 sm:text-3xl">
          {productoInicial ? 'Editar Producto' : 'Nuevo Producto'}
        </h1>
      </header>

      {/* 5. Acción dinámica según si existe productoInicial */}
      <form
        action={productoInicial ? updateProduct : createProduct}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
        encType="multipart/form-data"
      >
        {/* 6. Campo oculto necesario para saber QUÉ producto actualizar */}
        {productoInicial && <input type="hidden" name="producto_id" value={productoInicial.id} />}

        <div className="space-y-5 rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5 sm:p-6">
          <input type="hidden" name="unsplash_id" value={selectedId} />

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Nombre del Platillo</label>
            <input
              name="nombre"
              defaultValue={productoInicial?.nombre} // Usamos defaultValue para Server Actions
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20"
              placeholder="Ej. Hamburguesa Doble Queso"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Categoría</label>
            <select
              name="categoria_id"
              defaultValue={productoInicial?.categoria_id}
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 outline-none transition-colors focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20"
              required
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Precio (L.)</label>
            <input
              name="precio"
              type="number"
              step="0.01"
              defaultValue={productoInicial?.precio}
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20"
              placeholder="0.00"
              required
            />
          </div>

          <div className="rounded-xl border border-dashed border-orange-500/30 bg-orange-500/10 p-4">
            <label className="mb-2 block text-sm font-medium text-orange-300">
              📸 {productoInicial ? 'Cambiar imagen real' : 'Subir imagen real'}
            </label>
            <input
              type="file"
              name="imagen_archivo"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full cursor-pointer text-sm text-neutral-400 file:mr-4 file:rounded-lg file:border-0 file:bg-[#E85D26] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-orange-700"
            />
            {previewLocal && (
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-orange-300">
                ✓ Nueva imagen seleccionada
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Descripción</label>
            <textarea
              name="descripcion"
              rows={3}
              defaultValue={productoInicial?.descripcion}
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20"
              placeholder="Describe los ingredientes..."
            />
          </div>

          {/*Nuevos campos de
            - Es un campo Compuesto
            - Es un complemento
            - cantidad de complementos
            */}

          {/* --- SECCIÓN DE LÓGICA DE PLATOS (NUEVO) --- */}
          <div className="mb-8 space-y-6 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-neutral-200">
              <span className="text-orange-400">⚙️</span> Configuración de Producto
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Toggle: Es Complemento */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.06]">
                <input
                  type="checkbox"
                  name="es_complemento"
                  className="h-5 w-5 accent-orange-500"
                  defaultChecked={productoInicial?.es_complemento || false}
                />
                <div>
                  <span className="block text-sm font-medium text-neutral-200">¿Es un complemento?</span>
                  <span className="text-xs text-neutral-500">Aparecerá en la lista de guarniciones.</span>
                </div>
              </label>

              {/* Toggle: Es Plato Compuesto */}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.06]">
                <input
                  type="checkbox"
                  name="es_plato_compuesto"
                  className="h-5 w-5 accent-orange-500"
                  defaultChecked={productoInicial?.es_plato_compuesto || false}
                />
                <div>
                  <span className="block text-sm font-medium text-neutral-200">¿Es plato fuerte/compuesto?</span>
                  <span className="text-xs text-neutral-500">Permite elegir acompañamientos.</span>
                </div>
              </label>
            </div>

            {/* Input Numérico: Cantidad de Complementos */}
            <div className="border-t border-white/[0.07] pt-4">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Cantidad de acompañamientos permitidos
              </label>
              <input
                type="number"
                name="cant_complementos"
                min="0"
                max="5"
                className="w-24 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-neutral-100 outline-none focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20"
                defaultValue={productoInicial?.cant_complementos || 0}
                placeholder="0"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Solo aplica si marcó este producto como "Plato Compuesto".
              </p>
            </div>
          </div>

          <button type="submit" className="w-full rounded-xl bg-[#E85D26] py-3 text-sm font-medium text-white transition-colors hover:bg-orange-700">
            {productoInicial ? 'Actualizar Producto' : 'Guardar Producto'}
          </button>
        </div>

        <div className="flex flex-col rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5 sm:p-6">
          <label className="mb-4 block text-sm font-medium text-neutral-300">Vista Previa / Banco de Fotos</label>

          <div className="relative mb-6 aspect-square overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]">
            {/* 7. Lógica de preview priorizada */}
            {previewLocal ? (
              <Image src={previewLocal} alt="Preview local" fill className="object-cover" />
            ) : selectedId ? (
              <Image src={`https://images.unsplash.com/photo-${selectedId}?w=500`} alt="Preview Unsplash" fill className="object-cover" />
            ) : productoInicial?.imagen_url ? (
              // Si estamos editando y no hay selección nueva, mostramos la que ya tiene el bucket
              <Image src={productoInicial.imagen_url} alt="Imagen actual" fill className="object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-neutral-600">
                <span className="text-4xl">🖼️</span>
                <p className="mt-2 p-4 text-center text-xs">Sin imagen seleccionada</p>
              </div>
            )}
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
            {loadingImages ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-500">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
                <p>Buscando en Unsplash...</p>
              </div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {images.map((img: any) => {
                  const idLargo = img.urls.raw.split('photo-')[1]?.split('?')[0]
                  return (
                    <div
                      key={img.id}
                      onClick={() => handleUnsplashSelect(img)}
                      className={`relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${selectedId === idLargo ? 'scale-95 border-[#E85D26]' : 'border-white/[0.07] opacity-70 hover:opacity-100'}`}
                    >
                      <Image src={img.urls.small} alt="Unsplash Option" fill className="object-cover" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.07] p-6 text-center text-neutral-500">
                <p className="text-sm">Escribe arriba para buscar nuevas fotos sugeridas.</p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
