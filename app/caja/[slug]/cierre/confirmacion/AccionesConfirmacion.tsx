"use client";

import Link from "next/link";

export default function AccionesConfirmacion({ slug }: { slug: string }) {
  return (
    <div className="mt-8 flex flex-col gap-3 print:hidden">
      <button
        onClick={() => window.print()}
        className="w-full rounded-xl bg-orange-600 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-orange-500"
      >
        Descargar PDF
      </button>

      <Link
        href={`/caja/${slug}`}
        className="inline-flex w-full items-center justify-center rounded-xl border border-slate-600 px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-200 transition-colors hover:border-slate-400 hover:text-white"
      >
        Volver al Dashboard de Caja
      </Link>
    </div>
  );
}
