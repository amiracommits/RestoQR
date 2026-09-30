"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { CategoriaMenuDin, MesaDin, ProductoMenuDin } from "./DinDashboard";

export interface UnidadPedido {
  id: string;
  producto: ProductoMenuDin;
  notas: string;
}

interface Props {
  titulo: string;
  ubicacion?: string;
  menu: CategoriaMenuDin[];
  mesas?: MesaDin[];
  mesaId?: string;
  onMesaChange?: (id: string) => void;
  items: UnidadPedido[];
  onItemsChange: (items: UnidadPedido[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  guardando: boolean;
  error: string | null;
}

const moneda = (precio: number) => `L. ${Number(precio).toFixed(2)}`;
const boton = "rounded-xl border border-white/10 px-4 py-3 text-sm font-bold disabled:opacity-40";
const primario = `${boton} bg-[#E85D26] text-white`;

export default function PedidoEditor({ titulo, ubicacion, menu, mesas, mesaId, onMesaChange, items, onItemsChange, onClose, onConfirm, guardando, error }: Props) {
  const [categoriaId, setCategoriaId] = useState(menu[0]?.id ?? "");
  const [producto, setProducto] = useState<ProductoMenuDin | null>(null);
  const [complementos, setComplementos] = useState<string[]>([]);
  const [flavorId, setFlavorId] = useState("");
  const [comentario, setComentario] = useState("");
  const [resumen, setResumen] = useState(false);
  const categoria = menu.find((item) => item.id === categoriaId) ?? menu[0];
  const opcionesComplementos = menu.flatMap((item) => item.items).filter((item) => item.es_complemento);
  const requeridos = producto?.es_plato_compuesto ? Number(producto.cant_complementos ?? 0) : 0;
  const flavors = producto?.admite_flavors ? [...(producto.productos_flavors ?? [])].sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0)) : [];
  const completo = Boolean(producto) && complementos.length === requeridos && (flavors.length === 0 || Boolean(flavorId));
  const total = items.reduce((acc, item) => acc + Number(item.producto.precio ?? 0), 0);

  const seleccionar = (item: ProductoMenuDin) => {
    setProducto(item);
    setComplementos([]);
    setFlavorId("");
    setComentario("");
  };
  const agregar = () => {
    if (!producto || !completo) return;
    const notas = [
      flavors.find((item) => item.id === flavorId)?.nombre ? `Especialidad: ${flavors.find((item) => item.id === flavorId)?.nombre}` : null,
      complementos.length ? `Acompanamientos: ${complementos.map((id) => opcionesComplementos.find((item) => item.id === id)?.nombre).join(", ")}` : null,
      comentario.trim() ? `Nota: ${comentario.trim()}` : null,
    ].filter(Boolean).join(" | ");
    onItemsChange([...items, { id: crypto.randomUUID(), producto, notas }]);
    setProducto(null);
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm sm:p-4">
      <div role="dialog" aria-modal="true" aria-label={titulo} className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden bg-[#141414] shadow-2xl sm:rounded-2xl">
        <header className="shrink-0 border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold text-orange-400">{ubicacion ?? "Mesero"}</p><h2 className="text-lg font-black">{titulo}</h2></div>
            <button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar pedido" className={boton}><XMarkIcon className="h-5 w-5" /></button>
          </div>
          {mesas && <label className="mt-3 block text-sm font-bold">Mesa
            <select value={mesaId} onChange={(event) => onMesaChange?.(event.target.value)} disabled={guardando} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0f0f0f] px-3">
              <option value="">Seleccionar mesa</option>
              {mesas.map((mesa) => {
                const localidad = Array.isArray(mesa.localidades) ? mesa.localidades[0] : mesa.localidades;
                return <option key={mesa.id} value={mesa.id}>Mesa {mesa.numero_mesa}{localidad?.nombre ? ` - ${localidad.nombre}` : ""}{mesa.estado ? ` - ${mesa.estado}` : ""}</option>;
              })}
            </select>
          </label>}
        </header>
        <section className="min-h-0 flex-1 overflow-y-auto p-4">
          {resumen ? <div className="space-y-3">
            <h3 className="text-lg font-black">Resumen del pedido · {items.length} productos</h3>
            {items.length === 0 && <p className="text-neutral-400">Agrega un producto para continuar.</p>}
            {items.map((item, index) => <article key={item.id} className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 p-3">
              <div className="flex items-start justify-between gap-3"><h4 className="font-bold">{index + 1}. {item.producto.nombre}</h4><span className="shrink-0 text-yellow-300">{moneda(item.producto.precio)}</span></div>
              {item.notas && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-orange-200">{item.notas}</p>}
              <button type="button" disabled={guardando} onClick={() => onItemsChange(items.filter((unidad) => unidad.id !== item.id))} className="mt-3 text-sm font-bold text-red-300" aria-label={`Eliminar producto ${index + 1}: ${item.producto.nombre}`}>Eliminar</button>
            </article>)}
          </div> : producto ? <div className="space-y-5">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black">{producto.nombre}</h3><p className="mt-1 text-orange-300">{moneda(producto.precio)} · 1 unidad</p></div><button type="button" className={boton} onClick={() => setProducto(null)}>Cancelar</button></div>
            {flavors.length > 0 && <fieldset><legend className="mb-2 font-black text-teal-300">Especialidad · selecciona una</legend><div className="flex flex-wrap gap-2">{flavors.map((flavor) => <button key={flavor.id} type="button" aria-pressed={flavorId === flavor.id} onClick={() => setFlavorId(flavor.id)} className={`${boton} ${flavorId === flavor.id ? "border-orange-400 bg-orange-500/20 text-orange-200" : "bg-white/5"}`}>{flavor.nombre}</button>)}</div></fieldset>}
            {requeridos > 0 && <fieldset><legend className="mb-2 font-black text-teal-300">Complementos · {complementos.length}/{requeridos}</legend><p className="mb-3 text-sm text-neutral-400">Selecciona {requeridos} complementos.</p><div className="flex flex-wrap gap-2">{opcionesComplementos.map((item) => {
              const activo = complementos.includes(item.id);
              return <button key={item.id} type="button" aria-pressed={activo} disabled={!activo && complementos.length >= requeridos} onClick={() => setComplementos(activo ? complementos.filter((id) => id !== item.id) : [...complementos, item.id])} className={`${boton} ${activo ? "border-orange-400 bg-orange-500/20 text-orange-200" : "bg-white/5"}`}>{item.nombre}</button>;
            })}</div></fieldset>}
            <label className="block font-bold">Instrucciones especiales para cocina (opcional)<textarea value={comentario} onChange={(event) => setComentario(event.target.value)} rows={3} placeholder="Ej. sin sal, salsa aparte..." className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f0f0f] p-3 text-sm font-normal" /></label>
          </div> : <div>
            <p className="mb-3 text-sm text-neutral-400">Selecciona un producto y personaliza cada unidad por separado.</p>
            <nav aria-label="Categorias de productos" className="mb-4 flex gap-2 overflow-x-auto">{menu.map((item) => <button type="button" key={item.id} onClick={() => setCategoriaId(item.id)} aria-pressed={categoria?.id === item.id} className={`${boton} shrink-0 ${categoria?.id === item.id ? "bg-orange-500/20 text-orange-300" : "bg-white/5"}`}>{item.nombre}</button>)}</nav>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{categoria?.items.map((item) => <button type="button" key={item.id} onClick={() => seleccionar(item)} className="rounded-xl border border-white/10 bg-white/5 p-4 text-left active:bg-orange-500/20"><span className="block font-black">{item.nombre}</span>{item.descripcion && <span className="mt-1 block text-sm text-neutral-400">{item.descripcion}</span>}<span className="mt-2 block font-bold text-orange-300">{moneda(item.precio)}</span></button>)}</div>
            {!categoria?.items.length && <p className="text-neutral-400">No hay productos en esta categoria.</p>}
          </div>}
        </section>
        <footer className="shrink-0 border-t border-white/10 bg-[#111] p-4">
          {error && <p role="alert" className="mb-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <p className="mb-3 flex justify-between gap-3 text-sm"><span>{items.length} productos agregados</span><strong className="text-yellow-300">{moneda(total)}</strong></p>
          <div className="flex flex-wrap justify-between gap-2">
            {resumen ? <><button type="button" className={boton} disabled={guardando} onClick={() => setResumen(false)}>Agregar algo mas</button><button type="button" className={primario} disabled={guardando || !items.length || Boolean(mesas && !mesaId)} onClick={onConfirm}>{guardando ? "Guardando..." : "Confirmar pedido"}</button></> : <>
              {producto && <button type="button" className={primario} disabled={!completo} onClick={agregar}>Agregar al pedido</button>}
              <button type="button" className={boton} disabled={!items.length || Boolean(producto)} onClick={() => setResumen(true)}>Finalizar</button>
            </>}
          </div>
          {producto && <p className="mt-2 text-xs text-neutral-400">Agrega o cancela esta unidad antes de finalizar.</p>}
        </footer>
      </div>
    </div>
  );
}
