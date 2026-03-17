'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProduct(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('restaurante_id, restaurantes(slug)')
    .eq('id', user.id)
    .single()

  const slug = (Array.isArray(perfil?.restaurantes) ? perfil?.restaurantes[0] : perfil?.restaurantes)?.slug;

  // LÓGICA DE IMAGEN
  const file = formData.get('imagen_archivo') as File
  // Verificamos si realmente es un archivo con contenido
  const hasFile = file instanceof File && file.size > 0;
  
  let imagen_url = null
  let unsplash_id = formData.get('unsplash_id') as string

  // Si el usuario subió un archivo real (prioridad)
  if (hasFile) {
      const validFile = file as File;
      const fileExt = validFile.name.split('.').pop()
      const fileName = `${perfil?.restaurante_id}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('menuThumbsQR')
        .upload(fileName, validFile)


      const { data: { publicUrl } } = supabase.storage.from('menuThumbsQR').getPublicUrl(fileName)
      imagen_url = publicUrl
      unsplash_id = '' 
    }

  const rawFormData = {
    nombre: formData.get('nombre') as string,
    precio: parseFloat(formData.get('precio') as string),
    descripcion: formData.get('descripcion') as string,
    categoria_id: formData.get('categoria_id') as string,
    unsplash_id: unsplash_id,
    imagen_url: imagen_url,
    restaurante_id: perfil?.restaurante_id,
  }

  const { error } = await supabase.from('productos').insert([rawFormData])
  if (error) throw new Error(error.message)

  if (slug) revalidatePath(`/${slug}`, 'page')
  redirect('/admin/productos')
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient()

  // 1. Obtener datos del producto para verificar si tiene imagen en Storage
  const { data: producto } = await supabase
    .from('productos')
    .select('imagen_url, restaurantes(slug)')
    .eq('id', productId)
    .single()

  if (!producto) throw new Error("Producto no encontrado")

  // 2. Si tiene imagen en Storage, borrarla
  if (producto.imagen_url) {
    // Extraemos la ruta relativa del bucket (ej: restaurante_id/archivo.jpg)
    // La URL tiene el formato: .../public/menuThumbsQR/restaurante_id/archivo.jpg
    const relativePath = producto.imagen_url.split('/menuThumbsQR/')[1]
    
    if (relativePath) {
      const { error: storageError } = await supabase.storage
        .from('menuThumbsQR')
        .remove([relativePath])
      
      if (storageError) console.error("Error al borrar de Storage:", storageError.message)
    }
  }

  // 3. Borrar el registro de la tabla productos
  const { error: dbError } = await supabase
    .from('productos')
    .delete()
    .eq('id', productId)

  if (dbError) throw new Error(dbError.message)

  // 4. Revalidar las rutas para actualizar la UI
  const restauranteData = Array.isArray(producto.restaurantes) ? producto.restaurantes[0] : producto.restaurantes
  const slug = restauranteData?.slug
  
  if (slug) revalidatePath(`/${slug}`)
  revalidatePath('/admin/productos')
}

export async function updateProduct(formData: FormData) {
  const supabase = await createClient()
  const productId = formData.get('producto_id') as string

  // 1. Obtener datos actuales del producto (para saber si hay que borrar una imagen vieja)
  const { data: productoViejo } = await supabase
    .from('productos')
    .select('imagen_url, restaurante_id, restaurantes(slug)')
    .eq('id', productId)
    .single()

  const file = formData.get('imagen_archivo') as File
  const hasNewFile = file instanceof File && file.size > 0
  let imagen_url = productoViejo?.imagen_url
  let unsplash_id = formData.get('unsplash_id') as string

  // 2. Lógica de Reemplazo de Imagen
  if (hasNewFile || (unsplash_id && productoViejo?.imagen_url)) {
    // Si subió algo nuevo O eligió Unsplash teniendo antes una foto real -> Borrar foto vieja
    if (productoViejo?.imagen_url) {
      const oldPath = productoViejo.imagen_url.split('/menuThumbsQR/')[1]
      await supabase.storage.from('menuThumbsQR').remove([oldPath])
      imagen_url = null // Resetear si se va a usar Unsplash o nueva foto
    }

    if (hasNewFile) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${productoViejo?.restaurante_id}/${Date.now()}.${fileExt}`
      await supabase.storage.from('menuThumbsQR').upload(fileName, file)
      const { data: { publicUrl } } = supabase.storage.from('menuThumbsQR').getPublicUrl(fileName)
      imagen_url = publicUrl
      unsplash_id = ''
    }
  }

  // 3. Update en la tabla
  const { error } = await supabase
    .from('productos')
    .update({
      nombre: formData.get('nombre'),
      precio: parseFloat(formData.get('precio') as string),
      descripcion: formData.get('descripcion'),
      categoria_id: formData.get('categoria_id'),
      unsplash_id: unsplash_id,
      imagen_url: imagen_url
    })
    .eq('id', productId)

  if (error) throw new Error(error.message)

  // 4. Revalidar
  const slug = (Array.isArray(productoViejo?.restaurantes) ? productoViejo?.restaurantes[0] : productoViejo?.restaurantes)?.slug
  if (slug) revalidatePath(`/${slug}`)
  revalidatePath('/admin/productos')
  redirect('/admin/productos')
}

export async function handleSignOut() {
  const supabase = await createClient()
  
  // 1. Notificar a Supabase (esto limpia las cookies automáticamente)
  await supabase.auth.signOut()
  
  // 2. Redirigir al usuario al login
  redirect('/login')
}
