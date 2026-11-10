'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gestionarUsuario } from './actions'
import { ROLES, type Usuario } from './types'

export default function UsuariosClient({ usuarios, usuarioActual }: { usuarios: Usuario[]; usuarioActual: string }) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  async function ejecutar(operacion: 'editar' | 'eliminar', usuario: Usuario) {
    if (operacion === 'eliminar' && !confirm(`¿Dar de baja a "${usuario.nombre_usuario || 'Sin nombre'}"? Se eliminará su perfil de este restaurante. La cuenta de autenticación en Supabase se conservará.`)) return
    setOcupado(true)
    setError('')
    setMensaje('')
    try {
      const resultado = await gestionarUsuario(operacion, usuario.id, nombre, rol)
      if (resultado.error) {
        setError(resultado.error)
      } else {
        setEditando(null)
        setMensaje(operacion === 'editar' ? 'Usuario actualizado.' : 'Usuario dado de baja.')
        router.refresh()
      }
    } catch {
      setError('No se pudo completar la operación. Intenta nuevamente.')
    } finally {
      setOcupado(false)
    }
  }

  const boton = 'rounded-lg bg-white/[0.06] px-3 py-2 text-sm transition-colors hover:bg-white/[0.1] disabled:opacity-40'

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-500">Las cuentas nuevas se crean desde Supabase. Por seguridad, no puedes eliminar tu propio perfil ni cambiar tu propio rol.</p>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
      <p role="status" className="mb-4 text-sm text-green-400">{ocupado ? 'Procesando…' : mensaje}</p>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#1a1a1a]">
        <p className="border-b border-white/[0.06] px-6 py-4 text-xs uppercase tracking-widest text-neutral-500">{usuarios.length} usuarios registrados</p>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] text-neutral-400">
            <tr><th scope="col" className="px-6 py-3">Nombre para mostrar</th><th scope="col" className="px-6 py-3">Rol</th><th scope="col" className="px-6 py-3 text-right">Acciones</th></tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b border-white/[0.04]">
                <td className="px-6 py-4">
                  {editando === usuario.id ? (
                    <input aria-label="Nombre para mostrar" form={`editar-${usuario.id}`} required value={nombre} onChange={(event) => setNombre(event.target.value)} disabled={ocupado} className="w-full min-w-44 rounded-lg border border-white/10 bg-neutral-900 px-3 py-2" />
                  ) : <span>{usuario.nombre_usuario || 'Sin nombre'}{usuario.id === usuarioActual && <span className="ml-2 text-xs text-neutral-500">(Tú)</span>}</span>}
                </td>
                <td className="px-6 py-4">
                  {editando === usuario.id ? (
                    <select aria-label="Rol" form={`editar-${usuario.id}`} required value={rol} onChange={(event) => setRol(event.target.value)} disabled={ocupado || usuario.id === usuarioActual} className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2">
                      <option value="" disabled>Selecciona un rol</option>
                      {ROLES.map((valor) => <option key={valor} value={valor}>{valor}</option>)}
                    </select>
                  ) : usuario.rol || 'Sin rol'}
                </td>
                <td className="px-6 py-4">
                  {editando === usuario.id ? (
                    <form id={`editar-${usuario.id}`} onSubmit={(event) => { event.preventDefault(); void ejecutar('editar', usuario) }} className="flex justify-end gap-2">
                      <button type="submit" disabled={ocupado || !nombre.trim() || !rol} className={`${boton} text-orange-400`}>Guardar</button>
                      <button type="button" disabled={ocupado} onClick={() => setEditando(null)} className={boton}>Cancelar</button>
                    </form>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button disabled={ocupado} onClick={() => { setEditando(usuario.id); setNombre(usuario.nombre_usuario ?? ''); setRol(usuario.rol ?? ''); setError(''); setMensaje('') }} className={boton}>Editar</button>
                      <button disabled={ocupado || usuario.id === usuarioActual} onClick={() => void ejecutar('eliminar', usuario)} className={`${boton} text-red-400`}>Eliminar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuarios.length === 0 && <p className="p-12 text-center text-sm text-neutral-500">No hay usuarios registrados para este restaurante.</p>}
      </div>
    </div>
  )
}
