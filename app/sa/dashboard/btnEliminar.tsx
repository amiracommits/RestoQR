"use client";
import { eliminarRestaurante } from "./actions";

export default function BotonEliminar({ id }: { id: string }) {
  const handleAction = async (formData: FormData) => {
    if (confirm("¿Estás seguro de eliminar este restaurante?")) {
      await eliminarRestaurante(formData);
    }
  };

  return (
    <form action={handleAction}>
      <input type="hidden" name="id" value={id} />
      <button
          type="submit"
          className="w-full text-left px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          Eliminar
    </button>
    </form>
  );
}