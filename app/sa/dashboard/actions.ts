"use server"
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function eliminarRestaurante(formData: FormData) {
  const id = formData.get('id') as string
  const supabase = await createClient()

  // 1. Verificación de seguridad en la acción
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('rol')
    .eq('id', user?.id)
    .single()

  if (perfil?.rol !== 'superadmin') {
    throw new Error("No autorizado para realizar esta acción")
  }

  // 2. Eliminación lógica o física (según prefieras)
  const { error } = await supabase
    .from('restaurantes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Error al eliminar restaurante:", error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/sa/dashboard')
  return { success: true }
}


// funcion para 
export async function guardarRestaurante(formData: FormData) {
  const supabase = await createClient();
  
  // Extraemos todos los campos solicitados por la DEI
  const rawData = {
    nombre: formData.get('nombre') as string,
    slug: formData.get('slug') as string,
    razon_social: formData.get('razon_social') as string,
    rtn: formData.get('rtn') as string,
    direccion: formData.get('direccion') as string,
    telefono: formData.get('telefono') as string,
    email_facturacion: formData.get('email_facturacion') as string,
    cai: formData.get('cai') as string,
    rango_min: formData.get('rango_min') as string,
    rango_max: formData.get('rango_max') as string,
    logo_url: formData.get('logo_url') as string,
  };

  const { error } = await supabase
    .from('restaurantes')
    .insert([rawData]);

  if (error) {
    console.error("Error DEI:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/sa/dashboard');
  return { success: true };
}

// Agrega esto a app/sa/dashboard/actions.ts
export async function actualizarRestaurante(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("restaurantes")
    .update({
      nombre:            formData.get("nombre"),
      slug:              formData.get("slug"),
      razon_social:      formData.get("razon_social"),
      rtn:               formData.get("rtn"),
      direccion:         formData.get("direccion"),
      cai:               formData.get("cai"),
      rango_min:         formData.get("rango_min"),
      rango_max:         formData.get("rango_max"),
      telefono:          formData.get("telefono"),
      email_facturacion: formData.get("email_facturacion"),
      logo_url:          formData.get("logo_url"),
      status:            formData.get("status"),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

