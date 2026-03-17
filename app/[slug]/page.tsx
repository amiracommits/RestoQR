import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import Image from 'next/image'

// 1. contrato de datos para producto
interface Producto {
  id: string
  nombre: string
  precio: number
  descripcion: string
  imagen_url?: string 
  unsplash_id?: string // <--- Nueva propiedad
}

interface CategoriaConProductos {
  id: string
  nombre: string
  productos: Producto[]
}

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * 2. Funciones de Data Fetching con Caching
 * Envolvemos las peticiones para poder usar revalidateTag más adelante
 */
const getRestaurante = (slug: string) => 
  unstable_cache(
    async () => {
      const { data } = await supabase
        .from('restaurantes')
        .select('id, nombre')
        .eq('slug', slug)
        .single()
      return data
    },
    [`restaurante-${slug}`],
    { tags: ['restaurante', slug] }
  )()

const getMenu = (restauranteId: string, slug: string) =>
  unstable_cache(
    async () => {
      const { data } = await supabase
        .from('categorias')
        .select(`
          id,
          nombre,
          productos ( id, nombre, precio, descripcion, imagen_url )
        `)
        .eq('restaurante_id', restauranteId)
        .order('orden', { ascending: true })
      return data as CategoriaConProductos[] | null
    },
    [`menu-${slug}`],
    { tags: ['menu', slug] }
  )()

export default async function RestaurantPage({ params }: PageProps) {
  const { slug } = await params

  const restaurante = await getRestaurante(slug)
  if (!restaurante) return notFound()

  const menu = await getMenu(restaurante.id, slug)

  // Función para obtener imagen de unsplash
const getProductImage = (producto: Producto) => {
  // Prioridad 1: Imagen propia subida a Supabase
  if (producto.imagen_url) return producto.imagen_url;

  // Prioridad 2: ID específico de Unsplash (Consistencia total)
  if (producto.unsplash_id) {
    return `https://images.unsplash.com/photo-${producto.unsplash_id}?auto=format&fit=crop&q=80&w=600`;
  }

  // Prioridad 3: Fallback de búsqueda aleatoria por nombre
  const query = encodeURIComponent(`${producto.nombre} food`);
  return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600&sig=${query}`;
};

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(price)

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {restaurante.nombre}
          </h1>
          
          <nav className="flex gap-4 mt-6 overflow-x-auto pb-2 scrollbar-hide">
            {menu?.map((cat) => (
              <a 
                key={cat.id} 
                href={`#${cat.id}`}
                className="whitespace-nowrap px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium hover:bg-orange-600 hover:text-white transition-all"
              >
                {cat.nombre}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-20">
        {menu?.map((categoria) => (
          <section key={categoria.id} id={categoria.id} className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-slate-800 mb-8 border-l-4 border-orange-500 pl-4">
              {categoria.nombre}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categoria.productos.map((producto) => (
                <div 
                  key={producto.id} 
                  className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col sm:flex-row"
                >
                  {/* Imagen del Producto */}
                  <div className="relative w-full sm:w-40 h-40 shrink-0">
                    {producto.imagen_url ? (
                      <Image
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        <span className="text-slate-400 text-xs">Sin imagen</span>
                      </div>
                    )}
                  </div>

                  {/* Detalles del Producto */}
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-lg text-slate-900">
                          {producto.nombre}
                        </h3>
                        <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-lg text-sm">
                          {formatPrice(producto.precio)}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm mt-2 line-clamp-3">
                        {producto.descripcion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="py-12 text-center text-slate-400 text-sm border-t bg-white">
        © {new Date().getFullYear()} {restaurante.nombre}. Desarrollado con tecnología de ZNT Eventos.
      </footer>
    </main>
  )
}