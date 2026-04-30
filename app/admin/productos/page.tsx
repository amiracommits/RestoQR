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
    <div>
      {/* RESTAURADO: Encabezado con Botón de Nuevo Producto */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Gestionar Menú</h1>
          
          <p className="text-sm text-neutral-500 mt-1">Control total de tus platillos y categorías.</p>
        </div>
        
        <Link 
          href="/admin/productos/nuevo"
          className="inline-flex items-center gap-2 rounded-xl bg-[#E85D26] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-700"

        >
          <span className="text-xl">+</span> Agregar Producto
        </Link>
      </header>

      {/* Tabla con buscador interactivo */}
      <ListaProductosCliente productosIniciales={productos || []} />
    </div>
  )
}