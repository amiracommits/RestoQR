// app/admin/pedidos/page.tsx
// ✅ Server Component — sin 'use client'
// Se encarga SOLO de obtener los datos y pasarlos al componente cliente

import PedidosClient from './PedidosClient'
import { getAdminOrders } from './actions'

export default async function PedidosPage() {
  // La llamada a la Server Action se hace aquí, en el servidor
  // Si falla, Next.js manejará el error antes de renderizar
  const pedidosIniciales = await getAdminOrders()

  return <PedidosClient pedidosIniciales={pedidosIniciales} />
}
