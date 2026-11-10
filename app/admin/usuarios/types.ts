export const ROLES = ['admin', 'cocina', 'cajero', 'superadmin', 'meseros', 'conta'] as const

export type Usuario = {
  id: string
  nombre_usuario: string | null
  rol: string | null
}
