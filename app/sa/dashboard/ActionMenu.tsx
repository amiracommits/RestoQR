"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import BotonEliminar from "./btnEliminar";

export default function ActionMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => setOpen((prev) => !prev);

  useEffect(() => {
    if (open && ref.current && menuRef.current) {
      const rect = ref.current.getBoundingClientRect();
      const menuHeight = menuRef.current.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < menuHeight + 10);
    }
  }, [open]);

  return (
    <div className="relative" ref={ref}>

      {/* BOTÓN */}
      <button
        onClick={handleToggle}
        className="p-2 rounded-lg hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200 transition-colors text-lg leading-none"
      >
        ⋯
      </button>

      {/* DROPDOWN */}
      <div
        ref={menuRef}
        style={{ transformOrigin: openUp ? "bottom right" : "top right" }}
        className={`absolute right-0 w-44 bg-[#1f1f1f] border border-white/[0.08] rounded-xl z-50 overflow-hidden
          transform transition-all duration-150 ease-out
          ${openUp ? "bottom-full mb-2" : "top-full mt-2"}
          ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}
        `}
      >
        <Link
          href={`/sa/dashboard/editar/${id}`}
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/[0.05] hover:text-neutral-100 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-neutral-500">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Editar
        </Link>

        <div className="h-px bg-white/[0.06] mx-3" />

        <div className="px-2 py-1">
          <BotonEliminar id={id} />
        </div>

      </div>
    </div>
  );
}