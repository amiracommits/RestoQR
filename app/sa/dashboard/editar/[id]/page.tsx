// app/sa/dashboard/editar/[id]/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import EditarRestauranteClient from "./EditarRestauranteClient";

export default async function EditarRestaurante({ 
  params 
}: { 
  params: Promise<{ id: string }> // ← En Next.js 15 params es una Promise
}) {
  const { id } = await params // ← hay que hacer await

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: restaurante } = await supabase
    .from("restaurantes")
    .select("*")
    .eq("id", id)
    .single();

  if (!restaurante) redirect("/sa/dashboard");

  return <EditarRestauranteClient restaurante={restaurante} />;
}