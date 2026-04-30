"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Categoria {
  id?: string
  nombre?: string
  orden?: number
}

interface Props {
  categoria?: Categoria
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  titulo: string
}

export default function CategoriaForm({ categoria, action, titulo }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const inputClass = "w-full bg-[#111] border border-white/10 text-neutral-100 placeholder-neutral-600 p-3 rounded-xl outline-none focus:border-orange-500 transition-colors text-sm"
  const labelClass = "text-[10px] font-medium uppercase tracking-widest text-neutral-500"

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const res = await action(formData)
    if (res.success) {
      router.push("/productos/categorias")
    } else {
      alert("Error: " + res.error)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">

      <div className="mb-8">
        <Link
          href="/admin/categorias"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-orange-500 transition-colors mb-4"
        >
          ← Volver a categorías
        </Link>
        <h1 className="text-2xl font-medium text-neutral-100 tracking-tight">{titulo}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-8 space-y-6">

        {categoria?.id && (
          <input type="hidden" name="id" value={categoria.id} />
        )}

        {/* Nombre */}
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Nombre de la categoría</label>
          <input
            name="nombre"
            required
            defaultValue={categoria?.nombre}
            className={inputClass}
            placeholder="Ej: ☕ Cafés Calientes"
          />
          <p className="text-xs text-neutral-600">
            Tip: agrega un emoji al inicio para que se vea mejor en el menú
          </p>
        </div>

        {/* Orden */}
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Orden de aparición</label>
          <input
            name="orden"
            type="number"
            min="0"
            defaultValue={categoria?.orden ?? 0}
            className={inputClass}
            placeholder="0"
          />
          <p className="text-xs text-neutral-600">
            Número menor aparece primero en el menú del cliente
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition-colors text-sm"
        >
          {submitting
            ? "Guardando..."
            : categoria?.id ? "Guardar cambios" : "Crear categoría"}
        </button>

      </form>
    </div>
  )
}
