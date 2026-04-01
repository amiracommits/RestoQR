'use client'
import { handleSignOut } from '../productos/nuevo/actions'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { nombre: 'Panel Control', href: '/admin/dashboard', icon: '📊' },
  { nombre: 'Pedidos', href: '/admin/pedidos', icon: '📋' }, // <--- NUEVO ACCESO
  { nombre: 'Productos', href: '/admin/productos', icon: '🍔' },
  { nombre: 'Categorías', href: '/admin/categorias', icon: '📂' },
  { nombre: 'Configuración', href: '/admin/config', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-[#1E389E] text-white flex flex-col h-screen sticky top-0 shadow-xl">
      {/* Sección del Logo */}
      <div className="p-8">
        <h2 className="text-2xl font-black text-white tracking-tighter">
          ZNT <span className="text-orange-500 italic">Admin</span>
        </h2>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          // Lógica para marcar como activo incluso en sub-rutas
          const isActive = pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all duration-300 ${
                isActive 
                ? 'bg-orange-600 text-white shadow-lg scale-105' // Estado Activo: Naranja + ligero zoom
                : 'text-slate-200 hover:bg-orange-500 hover:text-white' // Hover: Naranja
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.nombre}
            </Link>
          )
        })}
      </nav>

     {/* SECCIÓN INFERIOR */}
      <div className="p-4 border-t border-blue-800/50">
        <button 
          onClick={() => handleSignOut()} 
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 font-bold hover:bg-red-500 hover:text-white rounded-2xl transition-all duration-300"
        >
          <span>🚪</span> Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}