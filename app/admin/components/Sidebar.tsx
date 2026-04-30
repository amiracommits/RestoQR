'use client'
import { handleSignOut } from '../productos/nuevo/actions'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  FolderIcon,
  HomeIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  BoltIcon
} from '@heroicons/react/24/outline'

const menuItems = [
  { nombre: 'Panel', href: '/admin/dashboard', icon: HomeIcon },
  { nombre: 'Pedidos', href: '/admin/pedidos', icon: ClipboardDocumentListIcon },
  { nombre: 'Productos', href: '/admin/productos', icon: ShoppingBagIcon },
  { nombre: 'Categorías', href: '/admin/categorias', icon: FolderIcon },
  { nombre: 'Config', href: '/admin/config', icon: Cog6ToothIcon },
  { nombre: 'Reportes', href: '/admin/reports', icon: BoltIcon},
  
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0f0f0f]/90 backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/admin/dashboard" className="leading-none">
            <p className="text-base font-semibold tracking-tight text-neutral-100">
              ZNT <span className="text-[#E85D26]">Admin</span>
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-neutral-600">
              Restaurante
            </p>
          </Link>

          <button
            onClick={() => handleSignOut()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-neutral-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-white/[0.07] bg-[#111111] md:flex md:flex-col">
        <div className="px-6 pb-6 pt-8">
          <Link href="/admin/dashboard" className="block">
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-100">
              ZNT <span className="text-[#E85D26]">Admin</span>
            </h2>
            <p className="mt-2 text-xs font-medium uppercase tracking-widest text-neutral-600">
              Panel restaurante
            </p>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#E85D26] text-white'
                    : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-100'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.nombre}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/[0.07] p-4">
          <button
            onClick={() => handleSignOut()}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-[#111111]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#E85D26] text-white'
                    : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate">{item.nombre}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
