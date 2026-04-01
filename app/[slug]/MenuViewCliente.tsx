// app/[slug]/MenuViewCliente.tsx
'use client'
import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { submitOrder } from './actions' // Importar la accion de actions

interface Props {
  restaurante: any;
  menu: { id: string, nombre: string, items: any[] }[];
  mesaId?: string; // Prop recibida del servidor
  esPedidoAdicional: boolean; // <-- Recibimos la prop de pedido adicional
}

export default function MenuViewCliente({ restaurante, menu, mesaId, esPedidoAdicional }: Props) {
  const [pedido, setPedido] = useState<any[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [ordenCompletada, setOrdenCompletada] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [platoActual, setPlatoActual] = useState<any>(null);
  const [seleccionados, setSeleccionados] = useState<any[]>([]);
  //definicion para notas finales
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [notasManuales, setNotasManuales] = useState<{ [key: string]: string }>({});

  // *. Aplanamos todos los productos de todas las categorías para encontrar los complementos
  const listaComplementos = useMemo(() => {
  return menu.flatMap(categoria => categoria.items).filter(item => item.es_complemento);
  }, [menu]);
  
  // *. Cálculos del Carrito (Memorizados para rendimiento)
  const totalCuenta = useMemo(() => {
    return pedido.reduce((acc, item) => acc + Number(item.precio), 0)
  }, [pedido])

  // * Agrupamos los productos para el desglose visual del cliente
  const itemsAgrupados = useMemo(() => {
    const grupos = new Map()
    pedido.forEach(item => {
      if (!grupos.has(item.id)) {
        grupos.set(item.id, { ...item, cantidad: 1 })
      } else {
        grupos.get(item.id).cantidad += 1
      }
    })
    return Array.from(grupos.values())
  }, [pedido])

  const agregarAlPedido = (item: any, notas?:string) => {
    const itemConNotas = { ...item, notas: notas || null };
    setPedido(prev => [...prev, itemConNotas]);
  }

    // *. El interceptor: decide si va directo al carro o abre el modal
    const handleIntentoAgregar = (item: any) => {
      if (item.es_plato_compuesto) {
        setPlatoActual(item);
        setSeleccionados([]);
        setModalAbierto(true);
      } else {
        agregarAlPedido(item);
      }
    };

      // Para pre confirmacion con notas
      const handlePreConfirmacion = () => {
        setIsCartOpen(false); 
        setShowFinalReview(true); 
      };

      // Función para actualizar la nota de un item específico en el estado
      const handleNotaChange = (itemId: string, nota: string) => {
        setNotasManuales(prev => ({ ...prev, [itemId]: nota }));
      };


  const handleConfirmarOrden = async () => {
    if (!mesaId) return alert("Escanea el QR de tu mesa de nuevo.")
    
    setEnviando(true)
    try {
      const resultado = await submitOrder({
        restaurante_id: restaurante.id,
        mesa_id: mesaId,
        total: totalCuenta,
        items: itemsAgrupados, // Usamos los items ya sumados
        es_adicional: esPedidoAdicional
      })

      if (resultado.success) {
        setOrdenCompletada(true)
        setPedido([])
        setIsCartOpen(false)
      }
    } catch (error) {
      alert("Hubo un error al enviar tu pedido. Intenta de nuevo.")
    } finally {
      setEnviando(false)
    }
  }



  const getProductImage = (nombre: string, unsplashId?: string, url?: string) => {
    if (url) return url
    if (unsplashId) return `https://images.unsplash.com/photo-${unsplashId}?auto=format&fit=crop&q=80&w=400`
    return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=60&w=400&sig=${encodeURIComponent(nombre)}`
  }



  const scrollToCategory = (id: string) => {
    const element = document.getElementById(`category-${id}`)
    if (element) {
      const offset = 130 
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  const crearPedidoFinal = async () => {
    if (!mesaId) {
      alert("No se detectó el número de mesa. Por favor, escanea el QR de nuevo.");
      return;
    }

    const nuevoPedido = {
      restaurante_id: restaurante.id,
      mesa_id: mesaId,
      estado: 'pendiente',
      // total: calcularTotal(), 
    };

    console.log("Pedido listo para procesar:", nuevoPedido);
  }

  const eliminarUno = (id: string) => {
    const index = pedido.findLastIndex(item => item.id === id)
    if (index > -1) {
      const nuevoPedido = [...pedido]
      nuevoPedido.splice(index, 1)
      setPedido(nuevoPedido)
      if (nuevoPedido.length === 0) setIsCartOpen(false)
    }
  }


  if (ordenCompletada) {
  return (
    <div className="min-h-screen bg-[#1E389E] flex flex-col items-center justify-center p-8 text-center text-white">
      <div className="text-7xl mb-6 animate-bounce">👨‍🍳</div>
      <h2 className="text-3xl font-black mb-2">¡Pedido Recibido!</h2>
      <p className="text-blue-100 mb-10">Tu orden ya está en la cocina. El personal llegará pronto a tu mesa.</p>
      {/* Botón removido para forzar re-escaneo del QR */}
    </div>
  )
}



  return (
    <main className="min-h-screen bg-slate-50 flex flex-col relative pb-24">
      {/* Indicador visual de mesa */}
      {mesaId && (
        <div className="bg-[#1E389E] text-[10px] text-white text-center py-1 font-bold uppercase tracking-widest sticky top-0 z-[70]">
          📍 Pedido para Mesa Identificada
        </div>
      )}

      {/* Banner sutil para orden adicional*/}
      {esPedidoAdicional && (
      <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-center gap-3">
        <span className="text-xl">📝</span>
        <p className="text-[11px] font-bold text-amber-800 uppercase tracking-tight">
          Orden en curso detectada. <br/>
          <span className="text-amber-600 font-medium normal-case">Lo nuevo se cargará a la cuenta de la 
            <span className="font-black ml-1">MESA {restaurante.mesas?.find((m:any) => m.id === mesaId)?.numero_mesa || 'Seleccionada'}</span>.
          </span>
        </p>
      </div>
      )}
      
      {/* 1. Header Fijo Superior (ZNT Blue) */}
      <header className={`bg-[#1E389E] sticky ${mesaId ? 'top-[20px]' : 'top-0'} z-[60] shadow-md p-4 flex justify-between items-center h-[65px] border-b border-blue-800/30`}>
        <h1 className="text-xl font-black text-white tracking-tight truncate">
          {restaurante.nombre}
        </h1>
        <div className="bg-orange-500 text-white px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-1.5 shadow-md">
          🛒 {pedido.length}
        </div>
      </header>

      {/* 2. Barra de Categorías Horizontal */}
      <nav className={`bg-white sticky ${mesaId ? 'top-[85px]' : 'top-[65px]'} z-50 border-b border-slate-100 shadow-inner`}>
        <div className="flex flex-row overflow-x-auto whitespace-nowrap p-3 gap-2 scrollbar-hide scroll-smooth">
          {menu.map((cat, index) => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className="inline-block px-4 py-2 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-orange-500 hover:text-white transition-all"
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </nav>

      {/* 3. BARRA FLOTANTE (Solo aparece si hay items) */}
      {pedido.length > 0 && !isCartOpen && (
        <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 animate-bounce-subtle">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full max-w-md mx-auto bg-[#1E389E] text-white p-4 rounded-3xl shadow-2xl flex justify-between items-center transform transition-transform active:scale-95 border-2 border-blue-400/20"
          >
            <div className="flex items-center gap-3">
              <span className="bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">
                {pedido.length}
              </span>
              <span className="font-bold tracking-tight">Ver mi pedido</span>
            </div>
            <span className="text-xl font-black">L. {totalCuenta.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* 4. DESGLOSE DEL PEDIDO (Drawer / Modal) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end">
          {/* Fondo para cerrar al tocar fuera */}
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />
          
          <div className="relative bg-white rounded-t-[40px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            {/* Tirador para cerrar */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
            
            <div className="p-8 overflow-y-auto">
              <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                Tu Orden <span className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{restaurante.nombre}</span>
              </h3>

              <div className="space-y-6">
                {itemsAgrupados.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b border-slate-50 pb-4">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{item.nombre}</p>
                      <p className="text-xs text-slate-400">L. {item.precio.toFixed(2)} c/u</p>
              </div>

              <div className="flex-1">
                <p className="font-bold text-slate-800">{item.nombre}</p>
                {/* Mostramos las notas si existen */}
                {item.notas && (
                  <p className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded inline-block">
                    {item.notas}
                  </p>
                )}
                <p className="text-xs text-slate-400">L. {item.precio.toFixed(2)} c/u</p>
              </div>
                    
              <div className="flex items-center gap-4">
                      <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-3">
                        <button 
                          onClick={() => eliminarUno(item.id)}
                          className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-slate-400 hover:text-red-500 font-bold"
                        >
                          -
                        </button>
                        <span className="font-black text-slate-900 w-4 text-center">{item.cantidad}</span>
                        <button 
                          onClick={() => agregarAlPedido(item)}
                          className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-orange-500 font-bold"
                        >
                          +
                        </button>
                      </div>
                      <p className="font-bold text-slate-900 w-20 text-right">
                        L. {(item.precio * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen Final */}
              <div className="mt-10 space-y-3">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>L. {(totalCuenta).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-2xl font-black text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total</span>
                  <span className="text-orange-600">L. {totalCuenta.toFixed(2)}</span>
                </div>
              </div>

             <button 
              onClick={handlePreConfirmacion}
              disabled={enviando}
              className={`w-full font-black py-5 rounded-3xl mt-8 shadow-xl text-xl transition-all active:scale-95 ${
                enviando ? 'bg-slate-400' : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
            >
              {enviando ? 'Enviando a cocina...' : 'Confirmar Orden'}
            </button>
              
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-full text-slate-400 font-bold py-4 mt-2"
              >
                Seguir pidiendo
              </button>
            </div>
          </div>
        </div>
      )}



      {/* 5. Contenido de Productos */}
      <div className="flex-1 p-4 space-y-10">
        {menu.map(category => (
          <section key={category.id} id={`category-${category.id}`} className="scroll-mt-[150px]">
            <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight border-b-2 border-orange-100 pb-2">
              {category.nombre}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {category.items.map(item => (
                <div key={item.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex gap-4 transition-all active:scale-[0.97]">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-inner bg-slate-100 flex-shrink-0">
                    <Image
                      src={getProductImage(item.nombre, item.unsplash_id, item.imagen_url)}
                      alt={item.nombre}
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.nombre}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-2">
                        {item.descripcion}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <p className="font-extrabold text-lg text-orange-600">
                        L. {item.precio.toFixed(2)}
                      </p>
                     <button
                        onClick={() => handleIntentoAgregar(item)} 
                        className="bg-[#1E389E] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg active:scale-90"
                      >
                        +
                      </button>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* 6. MODAL DE COMPLEMENTOS */}
      {modalAbierto && platoActual && (
        <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
          {/* Overlay para cerrar */}
          <div className="absolute inset-0" onClick={() => setModalAbierto(false)} />
          
          <div className="relative bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-black text-slate-900 leading-tight">
                  CONFIGURA TU <br/>
                  <span className="text-orange-600 uppercase">{platoActual.nombre}</span>
                </h3>
                <button onClick={() => setModalAbierto(false)} className="text-slate-300 hover:text-slate-500 text-2xl">✕</button>
              </div>
              <p className="text-slate-500 font-bold">
                Selecciona <span className="text-[#1E389E] underline">{platoActual.cant_complementos} acompañamientos</span> para continuar.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {listaComplementos.length > 0 ? (
                listaComplementos.map((comp) => {
                  const estaSeleccionado = seleccionados.find(s => s.id === comp.id);
                  return (
                    <button
                      key={comp.id}
                      onClick={() => {
                        if (estaSeleccionado) {
                          setSeleccionados(prev => prev.filter(s => s.id !== comp.id));
                        } else if (seleccionados.length < platoActual.cant_complementos) {
                          setSeleccionados(prev => [...prev, comp]);
                        }
                      }}
                      className={`w-full flex justify-between items-center p-5 rounded-3xl border-2 transition-all active:scale-95 ${
                        estaSeleccionado 
                          ? 'border-orange-500 bg-orange-50 shadow-inner' 
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <span className={`font-bold text-lg ${estaSeleccionado ? 'text-orange-700' : 'text-slate-700'}`}>
                        {comp.nombre}
                      </span>
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                        estaSeleccionado ? 'bg-orange-500 border-orange-500' : 'border-slate-300 bg-white'
                      }`}>
                        {estaSeleccionado && <span className="text-white font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-center text-slate-400 py-10 italic">No hay complementos disponibles en este momento.</p>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <button
                disabled={seleccionados.length !== platoActual.cant_complementos}
                onClick={() => {
                  const notas = `Acompañamientos: ${seleccionados.map(s => s.nombre).join(', ')}`;
                  agregarAlPedido(platoActual, notas);
                  setModalAbierto(false);
                }}
                className={`w-full font-black py-5 rounded-[24px] shadow-xl text-xl transition-all ${
                  seleccionados.length === platoActual.cant_complementos
                    ? 'bg-[#1E389E] text-white hover:bg-blue-800'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {seleccionados.length === platoActual.cant_complementos 
                  ? `AGREGAR POR L. ${platoActual.precio.toFixed(2)}` 
                  : `Faltan ${platoActual.cant_complementos - seleccionados.length} selección(es)`}
              </button>
            </div>
          </div>
        </div>
      )
    }
    {/* 7. MODAL DE REVISIÓN FINAL Y NOTAS */}
    {showFinalReview && (
      <div className="fixed inset-0 z-[400] bg-slate-900/90 backdrop-blur-lg flex flex-col justify-end">
        <div className="relative bg-white rounded-t-[40px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
          
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-900">¿Alguna nota extra?</h3>
              <p className="text-slate-500 text-sm font-medium italic">Ej: "Sin cebolla", "Término medio", etc.</p>
            </div>
            <button onClick={() => setShowFinalReview(false)} className="text-slate-300 text-xl">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {itemsAgrupados.map((item) => (
              <div key={item.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <div className="flex justify-between mb-3">
                  <span className="font-bold text-slate-800">{item.cantidad}x {item.nombre}</span>
                  <span className="text-[10px] font-black bg-slate-200 px-2 py-1 rounded-full uppercase text-slate-500">Opcional</span>
                </div>
                
                {/* Si ya trae complementos del modal anterior, se los recordamos aquí */}
                {item.notas && (
                  <p className="text-[10px] text-orange-600 font-bold mb-2">✓ {item.notas}</p>
                )}

                <textarea
                placeholder="Escribe aquí tus instrucciones..."
                  value={notasManuales[item.id] || ""} 
                  onChange={(e) => handleNotaChange(item.id, e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-base text-slate-900 font-semibold focus:ring-2 focus:ring-[#1E389E] focus:border-transparent outline-none resize-none h-24 shadow-sm placeholder:text-slate-400"
                />
              </div>
            ))}
          </div>

          <div className="p-8 bg-white border-t border-slate-100">
            <button
              disabled={enviando}
              onClick={async () => {
              // 1. Validación de seguridad (Guarda)
              if (!mesaId) {
                alert("Error: No se detectó el número de mesa. Por favor, escanea el QR de nuevo.");
                return; 
              }
                setEnviando(true);
                
                // CONCATENAMOS: Notas de Complementos + Notas Manuales
                const itemsConNotasFinales = itemsAgrupados.map(item => {
                  const notaManual = notasManuales[item.id] || "";
                  const notaBase = item.notas || "";
                  return {
                    ...item,
                    // Si hay nota manual, la pegamos a los complementos con un separador claro
                    notas: notaManual 
                      ? `${notaBase}${notaBase ? ' | NOTA: ' : ''}${notaManual}`.trim() 
                      : notaBase
                  };
                });

                const resultado = await submitOrder({
                  restaurante_id: restaurante.id,
                  mesa_id: mesaId,
                  total: totalCuenta,
                  items: itemsConNotasFinales,
                  es_adicional: esPedidoAdicional
                });

                if (resultado.success) {
                  setOrdenCompletada(true);
                  setPedido([]);
                  setShowFinalReview(false);
                }
                setEnviando(false);
              }}
              className="w-full bg-orange-600 text-white font-black py-5 rounded-[24px] shadow-xl text-xl active:scale-95 transition-all"
            >
              {enviando ? 'Cocinando...' : '¡ENVIAR A COCINA! 👨‍🍳'}
            </button>
          </div>
        </div>
      </div>
)}

    </main>
  )
}
