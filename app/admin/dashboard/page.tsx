import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  FolderIcon,
  PlusIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'

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
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
        <h1 className="font-semibold text-red-300">Error: Perfil no encontrado</h1>
        <p className="mt-4 text-sm text-neutral-400">
          ID de usuario: <code className="rounded bg-white/[0.06] px-2 py-1 font-mono text-neutral-200">{user.id}</code>
        </p>
      </div>
    )
  }

  const restaurante = perfil.restaurantes

  const [productosCount, categoriasCount] = await Promise.all([
    supabase.from('productos').select('*', { count: 'exact', head: true }).eq('restaurante_id', perfil.restaurante_id),
    supabase.from('categorias').select('*', { count: 'exact', head: true }).eq('restaurante_id', perfil.restaurante_id)
  ])

  const stats = [
    { name: 'Categorías', value: categoriasCount.count || 0, icon: FolderIcon, tone: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
    { name: 'Productos activos', value: productosCount.count || 0, icon: ShoppingBagIcon, tone: 'text-orange-300 bg-orange-500/10 border-orange-500/20' },
    { name: 'Visitas hoy', value: 'Próximamente', icon: ChartBarIcon, tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  ]

  return (
    <div>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-600">
            Panel de administración
          </p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-neutral-100 sm:text-3xl">
            Bienvenido, {perfil.nombre_usuario || 'Admin'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">Gestionando: {restaurante.nombre}</p>
        </div>
        <div className="w-fit rounded-full border border-white/[0.07] bg-white/[0.04] px-4 py-2 text-sm font-medium text-neutral-400">
          {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <div key={item.name} className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${item.tone}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-500">{item.name}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5 sm:p-6">
          <h2 className="text-lg font-medium text-neutral-100">Acciones rápidas</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/admin/productos/nuevo"
              className="group rounded-xl border border-dashed border-white/[0.12] bg-white/[0.03] p-4 transition-colors hover:border-orange-500/50 hover:bg-orange-500/10"
            >
              <PlusIcon className="h-6 w-6 text-[#E85D26] transition-transform group-hover:scale-110" />
              <span className="mt-4 block text-sm font-medium text-neutral-100">Nuevo producto</span>
              <span className="mt-1 block text-xs text-neutral-500">Agrega un platillo al menú</span>
            </Link>
            <Link
              href="/admin/categorias"
              className="group rounded-xl border border-dashed border-white/[0.12] bg-white/[0.03] p-4 transition-colors hover:border-sky-500/50 hover:bg-sky-500/10"
            >
              <FolderIcon className="h-6 w-6 text-sky-300 transition-transform group-hover:scale-110" />
              <span className="mt-4 block text-sm font-medium text-neutral-100">Editar categorías</span>
              <span className="mt-1 block text-xs text-neutral-500">Ordena las secciones visibles</span>
            </Link>
          </div>
        </section>

        <section className="flex min-h-64 flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#1a1a1a] p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-medium text-neutral-100">Estado del menú</h2>
              <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                Activo
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-neutral-500">
              Tu menú público está disponible en la ruta{' '}
              <code className="rounded bg-white/[0.05] px-2 py-1 font-mono text-orange-300">/{restaurante.slug}</code>
            </p>
          </div>
          <Link
            href={`/${restaurante.slug}`}
            target="_blank"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#E85D26] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-700"
          >
            Ver menú en vivo
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  )
}
