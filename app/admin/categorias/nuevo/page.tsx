"use client"
import { crearCategoria } from "./actions"
import CategoriaForm from "../CategoriaForm"

export default function NuevaCategoriaPage() {
  return (
    <CategoriaForm
      action={crearCategoria}
      titulo="Nueva categoría"
    />
  )
}