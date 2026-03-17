import Sidebar from './components/Sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* El Menú Lateral persistente */}
      <Sidebar />

      {/* El contenido dinámico de cada página */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}