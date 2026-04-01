// app/caja/[slug]/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import CajaDashboard from './cajaDashboard'

export default async function CajaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // 1. Validar Sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Validar Perfil y Rol
  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .single()


  console.log("--- DEBUG DESTINO CAJA ---");
  console.log("Perfil encontrado:", perfil ? "SI" : "NO");
  console.log("Rol en Perfil:", perfil?.rol);


  // CANDADO 1: ¿Es el rol permitido?
  const rolesPermitidos = ['cajero', 'admin', 'super_admin'];
  if (!perfil || !rolesPermitidos.includes(perfil.rol?.toLowerCase().trim())) {
    console.error("❌ REBOTE 1: Rol no permitido o perfil inexistente");
    redirect('/unauthorized');
  }


// 3. Validar Restaurante (Multi-tenant)
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('id, slug')
    .eq('slug', slug)
    .single()

  console.log("Slug en URL:", slug);
  console.log("Restaurante ID en DB:", restaurante?.id);
  console.log("Restaurante ID en Perfil:", perfil.restaurante_id);

  // CANDADO 2: ¿Existe el restaurante del slug?
  if (!restaurante) {
    console.error("❌ REBOTE 2: El slug no existe en la tabla restaurantes");
    redirect('/unauthorized');
  }

  // CANDADO 3: ¿El restaurante del perfil coincide con el del slug?
  if (perfil.restaurante_id !== restaurante.id) {
    console.error("❌ REBOTE 3: El usuario intenta entrar a un restaurante que no le pertenece");
    redirect('/unauthorized');
  }

  console.log("✅ ACCESO CONCEDIDO A CAJA");
  // 4. Cargar Pedidos que están listos para cobrar (Estado: entregado)
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select(`
      *,
      mesas(numero_mesa),
      detalle_pedidos(id, cantidad, precio, notas, productos(nombre))
    `)
    .eq('restaurante_id', restaurante.id)
    .eq('estado', 'entregado') // Solo lo que ya salió de cocina
    .order('created_at', { ascending: true })

  return (
    <CajaDashboard 
      restaurante={restaurante} 
      pedidosIniciales={pedidos || []} 
    />
  )
}
