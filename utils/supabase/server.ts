import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Sobrescribimos el maxAge a 8 horas (8 * 60 * 60)
              const customOptions = { ...options, maxAge: 28800 };
              cookieStore.set(name, value, customOptions);
            });
          } catch {
            // El middleware se encargará de esto si falla en un Server Component
          }
        },
      },
    },
  );
}
