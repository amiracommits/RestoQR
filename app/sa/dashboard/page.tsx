// app/sa/dashboard/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BotonEliminar from "./btnEliminar"
import BotonLogout from "./btnLogout"
import ActionMenu from "./ActionMenu"

export const dynamic = 'force-dynamic'

export default async function SADashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles_admin')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'superadmin') redirect('/unauthorized')

  const { data: restaurantes } = await supabase
    .from('restaurantes')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    // ← Sin bg aquí, lo hereda del layout
    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-medium text-neutral-100 tracking-tight">
            Restaurantes
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Administra tus tenants desde un solo lugar
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/sa/dashboard/nuevo"
            className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            + Nuevo restaurante
          </Link>
          <BotonLogout />
        </div>
      </div>

      {/* TABLA CARD */}
      <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl overflow-hidden">

        {/* SUBHEADER */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">
            {restaurantes?.length || 0} restaurantes registrados
          </p>
        </div>

        {/* TABLA */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-600 uppercase tracking-widest">Restaurante</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-600 uppercase tracking-widest">Empresa</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-600 uppercase tracking-widest">Facturación</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-600 uppercase tracking-widest">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-neutral-600 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {restaurantes?.map((res) => (
                <tr
                  key={res.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                >

                  {/* RESTAURANTE */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {res.logo_url ? (
                        <img
                          src={res.logo_url}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center text-neutral-400 text-xs font-bold">
                          {res.nombre?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-neutral-100">{res.nombre}</p>
                        <p className="text-xs text-neutral-600 font-mono mt-0.5">{res.slug}</p>
                      </div>
                    </div>
                  </td>

                  {/* EMPRESA */}
                  <td className="px-6 py-4">
                    <p className="text-neutral-300">{res.razon_social || 'Sin razón social'}</p>
                    <p className="text-xs text-neutral-600 font-mono mt-0.5">{res.rtn || 'Sin RTN'}</p>
                  </td>

                  {/* FACTURACIÓN */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-neutral-500">
                        Min: <span className="font-mono text-neutral-400">{res.rango_min?.split('-').pop()}</span>
                      </span>
                      <span className="text-neutral-500">
                        Max: <span className="font-mono text-neutral-400">{res.rango_max?.split('-').pop()}</span>
                      </span>
                    </div>
                  </td>

                  {/* ESTADO */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                      res.status === 'activo'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : res.status === 'suspendido'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : res.status === 'expirado'
                        ? 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20' // pendiente
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        res.status === 'activo'     ? 'bg-emerald-400' :
                        res.status === 'suspendido' ? 'bg-red-400' :
                        res.status === 'expirado'   ? 'bg-neutral-500' :
                        'bg-amber-400'
                      }`} />
                      {res.status === 'activo'     ? 'Activo' :
                      res.status === 'suspendido' ? 'Suspendido' :
                      res.status === 'expirado'   ? 'Expirado' :
                      'Pendiente'}
                    </span>
                  </td>

                  {/* ACCIONES */}
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <ActionMenu id={res.id} />
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* EMPTY STATE */}
        {(!restaurantes || restaurantes.length === 0) && (
          <div className="text-center py-16">
            <p className="text-sm text-neutral-600">No hay restaurantes registrados aún.</p>
          </div>
        )}

      </div>
    </div>
  )
}
