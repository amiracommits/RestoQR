// app/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PerfilConRestaurante {
  rol: string;
  restaurante_id: string;
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

  // 💡 MEJORA 1: Normalizamos el rol a minúsculas y quitamos espacios
  const rolUser = perfil.rol?.toLowerCase().trim();
  const userSlug = perfil.restaurante?.slug;

  /* 💡 LOG DE DEPURACIÓN (Revisa tu terminal/consola de Next.js)
  console.log("--- DEBUG ACCESO ZNT ---");
  console.log("ID Usuario:", user.id);
  console.log("Rol en DB:", perfil.rol);
  console.log("Rol procesado:", rolUser);
  console.log("Slug recuperado:", userSlug);
  console.log("------------------------");
  */

  
  // 1. Administradores
  if (rolUser === 'admin' || rolUser === 'super_admin') {
    return redirect('/admin/dashboard');
  } 
  
  // 2. Cocina (Verificamos que el slug no esté vacío)
  if (rolUser === 'cocina') {
    if (!userSlug) {
      console.error("⚠️ Usuario de cocina sin slug de restaurante asignado");
      return redirect('/unauthorized');
    }
    return redirect(`/cocina/${userSlug}`);
  }

  // 3. Cajero (Verificamos que el slug no esté vacío)
  if (rolUser === 'cajero') {
    if (!userSlug) {
      console.error("⚠️ Usuario de caja sin slug de restaurante asignado");
      return redirect('/unauthorized');
    }
    return redirect(`/caja/${userSlug}`);
  }

  // Si no cae en ninguno, el rol no es reconocido
  console.error(`🚫 Rol no reconocido o no configurado: ${rolUser}`);
  redirect('/unauthorized');
}
