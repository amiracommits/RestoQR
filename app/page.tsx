// app/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PerfilConRestaurante {
  rol: string;
  restaurante_id: string | null;
  restaurante: {
    slug: string;
  } | null;
}

export default async function IndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('perfiles_admin')
    .select(`
      rol,
      restaurante_id,
      restaurante:restaurante_id ( slug )
    `)
    .eq('id', user.id)
    .single();

  const perfil = data as unknown as PerfilConRestaurante;

  if (error || !perfil) {
    console.error("❌ Error o Perfil no encontrado:", error);
    redirect('/login');
  }

  // Normalizamos el rol para evitar errores de sintaxis
  const rolUser = perfil.rol?.toLowerCase().trim();
  const userSlug = perfil.restaurante?.slug;

  /**
   * 1. SUPERADMIN (Administrador Global de la Plataforma)
   * No necesita slug porque gestiona todos los restaurantes.
   */
  if (rolUser === 'superadmin') {
    return redirect('/sa/dashboard');
  }

  /**
   * 2. ADMIN (Dueño/Gerente de un Restaurante específico)
   */
  if (rolUser === 'admin') {
    return redirect('/admin/dashboard');
  } 
  
  /**
   * 3. COCINA
   */
  if (rolUser === 'cocina') {
    if (!userSlug) {
      console.error("⚠️ Usuario de cocina sin slug asignado");
      return redirect('/unauthorized');
    }
    return redirect(`/cocina/${userSlug}`);
  }

  /**
   * 4. CAJERO
   */
  if (rolUser === 'cajero') {
    if (!userSlug) {
      console.error("⚠️ Usuario de caja sin slug asignado");
      return redirect('/unauthorized');
    }
    return redirect(`/caja/${userSlug}`);
  }

  // Si el rol existe pero no está mapeado
  console.error(`🚫 Acceso denegado para el rol: ${rolUser}`);
  redirect('/unauthorized');
}
