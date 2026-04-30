"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { eliminarCategoria } from "./nuevo/actions"

export default function BotonEliminar({ id, nombre }: { id: string; nombre: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleEliminar() {
    const confirmar = confirm(`¿Eliminar "${nombre}"?\n\nEsto también eliminará todos los productos de esta categoría.`)
    if (!confirmar) return

    setLoading(true)
    const res = await eliminarCategoria(id)
    if (res.success) {
      router.refresh()
    } else {
      alert("Error: " + res.error)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleEliminar}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-400 bg-white/[0.04] hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      {loading ? "Eliminando..." : "Eliminar"}
    </button>
  )
}