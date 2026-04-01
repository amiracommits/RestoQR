'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client' 
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Inicializamos el cliente de Supabase para el navegador
  const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        // 1. Intentar el Login
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        // ... (después del signInWithPassword exitoso)
        // 1. Forzamos el refresco de cookies
        router.refresh()

        // 2. Esperamos un milisegundo para asegurar que la cookie se asiente
        setTimeout(() => {
          router.push('/') // Vamos a la raíz y dejamos que app/page.tsx decida el rol
        }, 100);

        if (error) {
          alert('Error: ' + error.message)
          setLoading(false)
          return
        }

      }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900">ZNT Admin</h1>
          <p className="text-slate-500 mt-2">Gestiona el menú de tu restaurante</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Correo Electrónico</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
              placeholder="admin@restaurante.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Entrar al Panel'}
          </button>
        </form>
      </div>
    </div>
  )
}