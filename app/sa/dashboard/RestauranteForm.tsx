"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

interface Restaurante {
  id?: string;
  nombre?: string;
  slug?: string;
  razon_social?: string;
  rtn?: string;
  direccion?: string;
  cai?: string;
  rango_min?: string;
  rango_max?: string;
  telefono?: string;
  email_facturacion?: string;
  logo_url?: string;
  status?: string;
}

interface Props {
  restaurante?: Restaurante;
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  titulo: string;
  subtitulo: string;
}

export default function RestauranteForm({ restaurante, action, titulo, subtitulo }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(restaurante?.logo_url || null);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(restaurante?.logo_url || "");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  // Clases reutilizables
  const inputClass = "w-full bg-[#111] border border-white/10 text-neutral-100 placeholder-neutral-600 p-3 rounded-xl outline-none focus:border-orange-500 transition-colors text-sm";
  const labelClass = "text-[10px] font-medium uppercase tracking-widest text-neutral-500";

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local inmediato
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("generalPImages")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data } = supabase.storage
        .from("generalPImages")
        .getPublicUrl(fileName);

      setLogoUrl(data.publicUrl);
    } catch (err) {
      alert("Error al subir imagen");
      setPreview(restaurante?.logo_url || null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  setSubmitting(true)

  // Construimos el FormData desde el form directamente
  const formData = new FormData(e.currentTarget)
  
  // Sobreescribimos logo_url con el valor del estado (que tiene la URL real)
  formData.set("logo_url", logoUrl)

  // Debug — verificar que llegan los datos
  console.log("Enviando:", {
    id:       formData.get("id"),
    nombre:   formData.get("nombre"),
    logo_url: formData.get("logo_url"),
  })

  const res = await action(formData)
  if (res.success) {
    router.push("/sa/dashboard")
  } else {
    alert("Error: " + res.error)
    setSubmitting(false)
  }
}

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* HEADER */}
      <div className="mb-8">
        <Link
          href="/sa/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-orange-500 transition-colors mb-4"
        >
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-medium text-neutral-100 tracking-tight">{titulo}</h1>
        <p className="text-sm text-neutral-500 mt-1">{subtitulo}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl p-8 space-y-8">

        {/* ID oculto para edición */}
        {restaurante?.id && <input type="hidden" name="id" value={restaurante.id} />}

        {/* SECCIÓN: Logo */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-4 pb-3 border-b border-white/[0.06]">
            Logotipo
          </h3>
          <div className="flex items-center gap-6">

            {/* Preview */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-2xl border border-white/10 bg-[#111] flex items-center justify-center cursor-pointer hover:border-orange-500 transition-colors overflow-hidden flex-shrink-0"
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-7 h-7 text-neutral-600" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3 15l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sm text-orange-500 hover:text-orange-400 font-medium transition-colors disabled:opacity-50"
              >
                {uploading ? "Subiendo imagen..." : preview ? "Cambiar logo" : "Subir logo"}
              </button>
              <p className="text-xs text-neutral-600 mt-1">PNG o JPG recomendado · Máx 2MB</p>
              {uploading && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-24 h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full animate-pulse w-2/3" />
                  </div>
                  <span className="text-xs text-neutral-600">Subiendo...</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>

        {/* SECCIÓN: Información Comercial */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-4 pb-3 border-b border-white/[0.06]">
            Información comercial
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Nombre Comercial</label>
              <input name="nombre" required defaultValue={restaurante?.nombre} className={inputClass} placeholder="Ej: Tacos La Luna" />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Slug (URL)</label>
              <input name="slug" required defaultValue={restaurante?.slug} className={inputClass} placeholder="ej: tacos-la-luna" />
            </div>
          </div>
        </div>

        {/* SECCIÓN: Datos Fiscales */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-4 pb-3 border-b border-white/[0.06]">
            Información tributaria
          </h3>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Razón Social</label>
                <input name="razon_social" required defaultValue={restaurante?.razon_social} className={inputClass} />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>RTN (15 dígitos)</label>
                <input name="rtn" required maxLength={15} defaultValue={restaurante?.rtn} className={`${inputClass} font-mono`} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Dirección Física</label>
              <textarea name="direccion" required defaultValue={restaurante?.direccion} className={`${inputClass} h-20 resize-none`} />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>CAI (40 posiciones)</label>
              <input name="cai" required maxLength={40} defaultValue={restaurante?.cai} className={`${inputClass} font-mono text-xs uppercase`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Rango Inicial (Semilla)</label>
                <input name="rango_min" required defaultValue={restaurante?.rango_min} placeholder="001-002-01-00006901" className={`${inputClass} font-mono`} />
              </div>
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Rango Final</label>
                <input name="rango_max" required defaultValue={restaurante?.rango_max} placeholder="001-002-01-00009400" className={`${inputClass} font-mono`} />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN: Contacto */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-4 pb-3 border-b border-white/[0.06]">
            Contacto y marca
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Teléfono</label>
              <input name="telefono" defaultValue={restaurante?.telefono} className={inputClass} placeholder="+504 0000-0000" />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Email facturación</label>
              <input name="email_facturacion" type="email" defaultValue={restaurante?.email_facturacion} className={inputClass} placeholder="facturacion@local.com" />
            </div>
          </div>
        </div>

        {/* SECCIÓN: Status — solo visible al editar */}
        {restaurante?.id && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-4 pb-3 border-b border-white/[0.06]">
              Estado del tenant
            </h3>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Status</label>
              <select
                name="status"
                defaultValue={restaurante?.status || 'pendiente'}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="activo" className="bg-[#111]">Activo</option>
                <option value="suspendido" className="bg-[#111]">Suspendido</option>
                <option value="expirado" className="bg-[#111]">Expirado</option>
              </select>
            </div>
          </div>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={uploading || submitting}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition-colors text-sm tracking-wide"
        >
          {submitting ? "Guardando..." : restaurante?.id ? "Guardar cambios" : "Crear restaurante"}
        </button>

      </form>
    </div>
  );
}
