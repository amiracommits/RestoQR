'use client'
import { deleteProduct } from './nuevo/actions'
import { useState } from 'react'

export default function BotonEliminar({ id, nombre }: { id: string, nombre: string }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEliminar = async () => {
    const confirmado = confirm(`¿Estás seguro de que deseas eliminar "${nombre}"? Esta acción borrará permanentemente el registro y su imagen asociada.`)
    
    if (confirmado) {
      setIsDeleting(true)
      try {
        await deleteProduct(id)
      } catch (error) {
        alert("No se pudo eliminar el producto. Inténtalo de nuevo.")
        setIsDeleting(false)
      }
    }
  }

  return (
    <button 
      onClick={handleEliminar}
      disabled={isDeleting}
      className={`transition-colors ${isDeleting ? 'opacity-30 cursor-not-allowed' : 'text-slate-400 hover:text-red-600'}`}
      title="Eliminar producto"
    >
      {isDeleting ? '⌛' : '🗑️'}
    </button>
  )
}