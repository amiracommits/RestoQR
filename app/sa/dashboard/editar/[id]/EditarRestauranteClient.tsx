"use client";
import { actualizarRestaurante } from "../../actions";
import RestauranteForm from "../../RestauranteForm";

export default function EditarRestauranteClient({ restaurante }: { restaurante: any }) {

  // Wrapper client-side que llama la server action
  async function handleAction(formData: FormData) {
    return await actualizarRestaurante(formData)
  }

  return (
    <RestauranteForm
      restaurante={restaurante}
      action={handleAction}
      titulo="Editar restaurante"
      subtitulo="Modifica los datos del tenant seleccionado"
    />
  );
}