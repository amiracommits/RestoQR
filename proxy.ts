import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
 
  // Llamamos a la lógica de sesión
  const response = await updateSession(request)
  
  // Verificamos si updateSession está intentando redirigir
  if (response.status >= 300 && response.status < 400) {
    console.log("🔄 Redirección detectada hacia:", response.headers.get('location'))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}