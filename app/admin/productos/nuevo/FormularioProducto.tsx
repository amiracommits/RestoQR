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
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <Link href="/admin/productos" className="text-slate-400 hover:text-slate-600 transition-colors">
          ← Volver al listado
        </Link>
        {/* 4. Título dinámico */}
        <h1 className="text-3xl font-extrabold text-slate-900 mt-2">
          {productoInicial ? 'Editar Producto' : 'Nuevo Producto'}
        </h1>
      </header>

      {/* 5. Acción dinámica según si existe productoInicial */}
      <form 
        action={productoInicial ? updateProduct : createProduct} 
        className="grid grid-cols-1 md:grid-cols-2 gap-8" 
        encType="multipart/form-data"
      >
        {/* 6. Campo oculto necesario para saber QUÉ producto actualizar */}
        {productoInicial && <input type="hidden" name="producto_id" value={productoInicial.id} />}

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-5">
          <input type="hidden" name="unsplash_id" value={selectedId} />
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Platillo</label>
            <input 
              name="nombre" 
              defaultValue={productoInicial?.nombre} // Usamos defaultValue para Server Actions
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500" 
              placeholder="Ej. Hamburguesa Doble Queso"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Categoría</label>
            <select 
              name="categoria_id"
              defaultValue={productoInicial?.categoria_id}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              required
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Precio (L.)</label>
            <input 
              name="precio" 
              type="number" 
              step="0.01"
              defaultValue={productoInicial?.precio}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500" 
              placeholder="0.00"
              required 
            />
          </div>

          <div className="p-4 bg-orange-50 rounded-2xl border-2 border-dashed border-orange-200">
            <label className="block text-sm font-bold text-orange-900 mb-2">
                📸 {productoInicial ? 'Cambiar imagen real' : 'Subir imagen real'}
            </label>
            <input 
                type="file" 
                name="imagen_archivo" 
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-orange-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
            />
            {previewLocal && (
                <p className="text-[10px] text-orange-500 mt-2 font-bold uppercase tracking-tighter">
                ✓ Nueva imagen seleccionada
                </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Descripción</label>
            <textarea 
              name="descripcion" 
              rows={3}
              defaultValue={productoInicial?.descripcion}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500" 
              placeholder="Describe los ingredientes..."
            />
          </div>

            {/*Nuevos campos de 
            - Es un campo Compuesto
            - Es un complemento
            - cantidad de complementos
            */}

            {/* --- SECCIÓN DE LÓGICA DE PLATOS (NUEVO) --- */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 mb-8">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="text-orange-500">⚙️</span> Configuración de Producto
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Toggle: Es Complemento */}
                <label className="flex items-center cursor-pointer gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:shadow-sm transition-all">
                  <input 
                    type="checkbox" 
                    name="es_complemento"
                    className="w-5 h-5 accent-orange-500"
                    defaultChecked={productoInicial?.es_complemento || false}
                  />
                  <div>
                    <span className="block font-bold text-sm text-slate-700">¿Es un complemento?</span>
                    <span className="text-xs text-slate-500">Aparecerá en la lista de guarniciones.</span>
                  </div>
                </label>

                {/* Toggle: Es Plato Compuesto */}
                <label className="flex items-center cursor-pointer gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:shadow-sm transition-all">
                  <input 
                    type="checkbox" 
                    name="es_plato_compuesto"
                    className="w-5 h-5 accent-orange-500"
                    defaultChecked={productoInicial?.es_plato_compuesto || false}
                  />
                  <div>
                    <span className="block font-bold text-sm text-slate-700">¿Es plato fuerte/compuesto?</span>
                    <span className="text-xs text-slate-500">Permite elegir acompañamientos.</span>
                  </div>
                </label>
              </div>

              {/* Input Numérico: Cantidad de Complementos */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Cantidad de acompañamientos permitidos
                </label>
                <input 
                  type="number" 
                  name="cant_complementos"
                  min="0"
                  max="5"
                  className="w-24 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                  defaultValue={productoInicial?.cant_complementos || 0}
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1 italic">
                  Solo aplica si marcó este producto como "Plato Compuesto".
                </p>
              </div>
            </div>


          <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-all shadow-lg">
            {productoInicial ? 'Actualizar Producto' : 'Guardar Producto'}
          </button>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <label className="block text-sm font-bold text-slate-700 mb-4">Vista Previa / Banco de Fotos</label>

          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 mb-6 border-2 border-slate-100 shadow-inner">
            {/* 7. Lógica de preview priorizada */}
            {previewLocal ? (
                <Image src={previewLocal} alt="Preview local" fill className="object-cover" />
            ) : selectedId ? (
                <Image src={`https://images.unsplash.com/photo-${selectedId}?w=500`} alt="Preview Unsplash" fill className="object-cover" />
            ) : productoInicial?.imagen_url ? (
                // Si estamos editando y no hay selección nueva, mostramos la que ya tiene el bucket
                <Image src={productoInicial.imagen_url} alt="Imagen actual" fill className="object-cover" />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                  <span className="text-4xl">🖼️</span>
                  <p className="text-xs mt-2 text-center p-4">Sin imagen seleccionada</p>
                </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loadingImages ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
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
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-4 transition-all ${selectedId === idLargo ? 'border-orange-500 scale-95 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <Image src={img.urls.small} alt="Unsplash Option" fill className="object-cover" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-sm italic">Escribe arriba para buscar nuevas fotos sugeridas.</p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
