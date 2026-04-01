'use client'
import { useState } from 'react'
import { format } from 'date-fns'

export default function CajaDashboard({ restaurante, pedidosIniciales }: any) {
  const [pedidos, setPedidos] = useState(pedidosIniciales)
  const [pedidoParaFacturar, setPedidoParaFacturar] = useState<any>(null)

  const handleImprimir = () => {
    window.print() // Dispara el diálogo de impresión del navegador
  }

  return (
    <main className="min-h-screen bg-slate-900 p-6 print:p-0">
      {/* HEADER - Se oculta al imprimir */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4 print:hidden">
        <h1 className="text-2xl font-black text-white uppercase">
          💰 CAJA: <span className="text-orange-500">{restaurante.nombre}</span>
        </h1>
      </header>

      {/* GRID DE PEDIDOS - Se oculta al imprimir */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
        {pedidos.map((pedido: any) => (
          <div key={pedido.id} className="bg-slate-800 rounded-3xl border-2 border-slate-700 p-5 flex flex-col shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl font-black text-white">MESA {pedido.mesas?.numero_mesa}</span>
              <span className="text-[10px] font-bold text-slate-400">#{pedido.id.slice(0,5)}</span>
            </div>

            <div className="flex-1 space-y-2 mb-6">
              {pedido.detalle_pedidos.map((det: any) => (
                <div key={det.id} className="flex justify-between text-sm">
                  <span className="text-slate-300">{det.cantidad}x {det.productos.nombre}</span>
                  <span className="text-white font-bold">L. {(det.cantidad * det.precio).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs uppercase font-bold">Total a Pagar</span>
                <span className="text-xl font-black text-orange-500">L. {pedido.total.toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={() => setPedidoParaFacturar(pedido)}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
            >
              Generar Factura
            </button>
          </div>
        ))}
      </div>

      {/* 🧾 MODAL DE VISTA PREVIA DE FACTURA (Papel Térmico 80mm) */}
      {pedidoParaFacturar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm print:static print:bg-white print:p-0">
          <div className="bg-white w-[300px] p-6 shadow-2xl print:shadow-none print:w-[80mm] print:p-2">
            {/* Estilo para papel térmico */}
            <style jsx global>{`
              @media print {
                body { background: white; }
                @page { margin: 0; size: 80mm auto; }
              }
            `}</style>

            <div className="text-center font-mono text-xs text-black">
              <h2 className="text-lg font-black uppercase mb-1">{restaurante.nombre}</h2>
              <p className="mb-4">RTN: 0801-XXXX-XXXXXX</p>
              <div className="border-t border-dashed border-black my-2"></div>
              <p className="font-bold">FACTURA DE VENTA</p>
              <p>Mesa: {pedidoParaFacturar.mesas?.numero_mesa}</p>
              <p>{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              <div className="border-t border-dashed border-black my-2"></div>

              <table className="w-full mb-4">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-left py-1">Cant</th>
                    <th className="text-left py-1">Desc</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidoParaFacturar.detalle_pedidos.map((det: any) => (
                    <tr key={det.id}>
                      <td className="py-1">{det.cantidad}</td>
                      <td className="py-1">{det.productos.nombre}</td>
                      <td className="text-right py-1">{(det.cantidad * det.precio).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-black pt-2">
                <div className="flex justify-between text-base font-black">
                  <span>TOTAL</span>
                  <span>L. {pedidoParaFacturar.total.toFixed(2)}</span>
                </div>
              </div>

              <p className="mt-6 italic">¡Gracias por su preferencia!</p>
              <p className="text-[10px] mt-2">Desarrollado por ZNT Admin</p>
            </div>

            <div className="mt-8 flex gap-2 print:hidden">
              <button 
                onClick={handleImprimir}
                className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-lg"
              >
                🖨️ Imprimir
              </button>
              <button 
                onClick={() => setPedidoParaFacturar(null)}
                className="flex-1 border border-slate-300 font-bold py-3 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}