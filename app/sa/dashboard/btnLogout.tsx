"use client";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function btnLogout() {
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    // Cerramos la sesión en Supabase
    await supabase.auth.signOut();
    // Redirigimos al login y limpiamos el historial para evitar volver atrás
    router.replace("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="text-[10px] font-black text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-400/30 px-3 py-1.5 rounded-lg transition-all uppercase tracking-tighter"
    >
      Terminar Sesión
    </button>
  );
}
