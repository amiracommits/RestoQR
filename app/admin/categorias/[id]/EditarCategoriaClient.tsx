// app/productos/categorias/[id]/EditarCategoriaClient.tsx
"use client"
import { actualizarCategoria } from "../nuevo/actions"
import CategoriaForm from "../CategoriaForm"

export default function EditarCategoriaClient({ categoria }: { categoria: any }) {
  async function handleAction(formData: FormData) {
    return await actualizarCategoria(formData)
  }

  return (
    <CategoriaForm
      categoria={categoria}
      action={handleAction}
      titulo="Editar categoría"
    />
  )
}