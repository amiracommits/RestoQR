import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import BotonEliminar from "./BotonEliminar"

export const dynamic = "force-dynamic"

export default async function CategoriasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/unauthorized")

  const { data: perfil } = await supabase
    .from("perfiles_admin")
    .select("rol, restaurante_id")
    .eq("id", user.id)
    .single()

  if (!perfil || !["admin", "superadmin"].includes(perfil.rol)) {
    redirect("/unauthorized")
  }

  // Solo categorías de SU restaurante
  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .eq("restaurante_id", perfil.restaurante_id)
    .order("orden", { ascending: true })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium text-neutral-100 tracking-tight">Categorías</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Organiza las secciones de tu menú</p>
        </div>
        <Link
          href="/admin/categorias/nuevo"
          className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          + Nueva categoría
        </Link>
      </div>

      {/* TABLA */}
      <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl overflow-hidden">

        <div className="px-6 py-4 border-b border-white/[0.06]">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">
            {categorias?.length || 0} categorías registradas
          </p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="text-left px-6 py-3 text-xs font-medium text-neutral-600 uppercase tracking-widest">Orden</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-neutral-600 uppercase tracking-widest">Nombre</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-neutral-600 uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias?.map((cat) => (
              <tr key={cat.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">

                {/* ORDEN */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 text-neutral-400 text-xs font-mono font-bold">
                    {cat.orden}
                  </span>
                </td>

                {/* NOMBRE */}
                <td className="px-6 py-4">
                  <p className="font-medium text-neutral-100 text-base">{cat.nombre}</p>
                </td>

                {/* ACCIONES */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/productos/categorias/${cat.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-orange-500 bg-white/[0.04] hover:bg-white/[0.07] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Editar
                    </Link>
                    <BotonEliminar id={cat.id} nombre={cat.nombre} />
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {(!categorias || categorias.length === 0) && (
          <div className="text-center py-16">
            <p className="text-sm text-neutral-600">No hay categorías creadas aún.</p>
            <Link href="/productos/categorias/nuevo" className="text-orange-500 text-sm hover:text-orange-400 mt-2 inline-block">
              Crear primera categoría →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}