import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ListaProductosCliente from './ListaProductosCliente'

export default async function ProductosPage() {
  const supabase = await createClient()

  // 1. Validar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Obtener el perfil para conocer el restaurante_id (Aislamiento de datos)
  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('restaurante_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  // 3. Traer SOLO los productos de ESTE restaurante
  const { data: productos } = await supabase
    .from('productos')
    .select('*, categorias(nombre)')
    .eq('restaurante_id', perfil.restaurante_id) // <--- CRÍTICO PARA EL MULTI-TENANT
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* RESTAURADO: Encabezado con Botón de Nuevo Producto */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Gestionar Menú</h1>
          <p className="text-slate-500 mt-2 font-medium">Control total de tus platillos y categorías.</p>
        </div>
        
        <Link 
          href="/admin/productos/nuevo"
          className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-lg shadow-orange-200 flex items-center gap-2 transform hover:scale-105 active:scale-95"
        >
          <span className="text-xl">+</span> Agregar Producto
        </Link>
      </header>

      {/* Tabla con buscador interactivo */}
      <ListaProductosCliente productosIniciales={productos || []} />
    </div>
  )
}