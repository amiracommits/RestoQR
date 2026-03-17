import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('*, restaurantes(nombre, slug)')
    .eq('id', user.id)
    .single()

  if (!perfil) {
    return (
      <div className="p-10">
        <h1 className="text-red-500 font-bold">Error: Perfil no encontrado</h1>
        <p className="mt-4">ID de usuario: <code className="bg-slate-100 p-1">{user.id}</code></p>
      </div>
    )
  }

  const restaurante = perfil.restaurantes

  const [productosCount, categoriasCount] = await Promise.all([
    supabase.from('productos').select('*', { count: 'exact', head: true }).eq('restaurante_id', perfil.restaurante_id),
    supabase.from('categorias').select('*', { count: 'exact', head: true }).eq('restaurante_id', perfil.restaurante_id)
  ])

  const stats = [
    { name: 'Categorías', value: categoriasCount.count || 0, icon: '📂', color: 'bg-blue-500' },
    { name: 'Productos Activos', value: productosCount.count || 0, icon: '🍔', color: 'bg-orange-500' },
    { name: 'Visitas (Hoy)', value: 'Proximamente', icon: '📈', color: 'bg-emerald-500' },
  ]

  // NOTA: Ya no necesitamos el <aside> ni el contenedor flex externo
  // El Layout global ya nos da el Sidebar y el fondo gris.
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Bienvenido, {perfil.nombre_usuario || 'Admin'}
          </h1>
          <p className="text-slate-500 mt-1 italic">Gestionando: {restaurante.nombre}</p>
        </div>
        <div className="text-sm font-medium text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-200">
          {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((item) => (
          <div key={item.name} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-2xl shadow-lg`}>
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{item.name}</p>
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/admin/productos/nuevo" className="p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-orange-500 hover:bg-orange-50 transition-all text-center group">
              <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">➕</span>
              <span className="text-sm font-bold text-slate-700">Nuevo Producto</span>
            </Link>
            <Link href="/admin/categorias" className="p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-center group">
              <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">📂</span>
              <span className="text-sm font-bold text-slate-700">Editar Categorías</span>
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-4">Estado del Menú 🌐</h3>
            <p className="text-slate-300 leading-relaxed mb-6">
              Tu menú público está activo en la ruta: <br/>
              <code className="text-orange-400 font-mono">/{restaurante.slug}</code>
            </p>
            <Link 
              href={`/${restaurante.slug}`} 
              target="_blank"
              className="inline-block w-full py-3 bg-orange-600 text-center rounded-xl font-bold hover:bg-orange-500 transition-colors"
            >
              Ver Menú en Vivo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}