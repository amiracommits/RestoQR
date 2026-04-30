'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert('Error: ' + error.message)
      setLoading(false)
      return
    }

    router.refresh()
    setTimeout(() => {
      router.push('/')
    }, 100)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">
      <div className="w-full max-w-sm">

        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-600 rounded-2xl mb-5">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.5 2 6 4.5 6 7c0 1.5.6 2.8 1.6 3.8L6 20h12l-1.6-9.2C17.4 9.8 18 8.5 18 7c0-2.5-2.5-5-6-5z" fill="currentColor" opacity="0.9"/>
              <path d="M9 7h6M9 7c0 1.7 1.3 3 3 3s3-1.3 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-medium text-neutral-100 tracking-tight">ZNT Restaurant</h1>
          <p className="text-sm text-neutral-500 mt-1">Panel de administración</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-widest mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <input
                  type="email"
                  className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-orange-500 transition-colors"
                  placeholder="admin@restaurante.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <input
                  type="password"
                  className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-orange-500 transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Verificando...
                </span>
              ) : (
                'Entrar al panel'
              )}
            </button>

          </form>

          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-neutral-600">acceso seguro</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
        </div>

        <p className="text-center text-xs text-neutral-700 mt-6">
          ZNT · Sistema de gestión de restaurante
        </p>

      </div>
    </div>
  )
}