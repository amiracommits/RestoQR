// app/sa/dashboard/nuevo/page.tsx
"use client";
import { guardarRestaurante } from "../actions";
import RestauranteForm from "../RestauranteForm";

export default function NuevoRestaurante() {
  return (
    <RestauranteForm
      action={guardarRestaurante}
      titulo="Registrar nuevo tenant"
      subtitulo="Configuración de parámetros legales y tributarios (DEI)"
    />
  );
}