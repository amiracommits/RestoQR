import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import FormularioProducto from '../nuevo/FormularioProducto' // Reutilizaremos tu componente

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Obtener sesión y perfil
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('restaurante_id')
    .eq('id', user.id)
    .single()

  // 2. Traer el producto Y las categorías en paralelo (Eficiencia)
  const [productoRes, categoriasRes] = await Promise.all([
    supabase.from('productos').select('*').eq('id', id).single(),
    supabase.from('categorias').select('id, nombre').eq('restaurante_id', perfil?.restaurante_id).order('nombre')
  ])

  if (productoRes.error || !productoRes.data) return notFound()

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Pasamos el producto actual como prop 'inicial' */}
        <FormularioProducto 
          categorias={categoriasRes.data || []} 
          productoInicial={productoRes.data} 
        />
      </div>
    </main>
  )
}