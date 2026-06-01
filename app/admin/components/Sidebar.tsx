'use client'
import { handleSignOut } from '../productos/nuevo/actions'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  FolderIcon,
  HomeIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'

const menuItems = [
  { nombre: 'Panel', href: '/admin/dashboard', icon: HomeIcon },
  { nombre: 'Pedidos', href: '/admin/pedidos', icon: ClipboardDocumentListIcon },
  { nombre: 'Productos', href: '/admin/productos', icon: ShoppingBagIcon },
  { nombre: 'Categorías', href: '/admin/categorias', icon: FolderIcon },
  { nombre: 'Config', href: '/admin/config', icon: Cog6ToothIcon },
]

const reportSubItems = [
  { nombre: 'Ventas', href: '/admin/reports/ventas' },
  { nombre: 'Cierres', href: '/admin/reports/cierres' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [reportsOpen, setReportsOpen] = useState(pathname.startsWith('/admin/reports'))

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0f0f0f]/90 backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 leading-none">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-[#1a1a1a]">
              <img src="/img/cxlogo.png" alt="CX Logo" className="h-full w-full object-contain p-1" />
            </div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
              Panel administrativo
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
            <div className="flex h-14 w-44 items-center justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1a] px-3">
              <img src="/img/cxlogo.png" alt="CX Logo" className="h-10 w-auto object-contain" />
              <div className="pr-1 text-right leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-300">
                  Panel
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                  Administrativo
                </p>
              </div>
            </div>
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

          <div className="pt-1">
            <button
              onClick={() => setReportsOpen((prev) => !prev)}
              className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                pathname.startsWith('/admin/reports')
                  ? 'bg-[#E85D26] text-white'
                  : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <BoltIcon className="h-5 w-5 shrink-0" />
                <span>Reportes</span>
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${reportsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {reportsOpen && (
              <div className="mt-1 space-y-1 pl-4">
                {reportSubItems.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center rounded-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                        isActive
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200'
                      }`}
                    >
                      {item.nombre}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
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
        <div className="grid grid-cols-6 gap-1">
          {[...menuItems, { nombre: 'Reportes', href: '/admin/reports/ventas', icon: BoltIcon }].map((item) => {
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
