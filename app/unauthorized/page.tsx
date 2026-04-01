// app/unauthorized/page.tsx
import Link from 'next/link';
export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-center">
      {/* Icono de Escudo/Bloqueo */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
        <span className="text-8xl relative z-10">🛡️</span>
      </div>

      <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">
        Acceso No Permitido
      </h1>
      
      <p className="text-slate-400 max-w-md mb-10 font-medium leading-relaxed">
        Lo sentimos, no tienes los permisos necesarios para acceder a este recurso o estás intentando ingresar a un restaurante que no te pertenece.
      </p>

      <div className="space-y-4 w-full max-w-xs">
        <Link 
          href="/login"
          className="block w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-orange-900/20 uppercase tracking-widest text-sm"
        >
          Volver al Inicio de Sesión
        </Link>
        
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          ID de Intento Registrado • {new Date().toLocaleDateString()}
        </p>
      </div>
    </main>
  )
}