import { createClient } from "@supabase/supabase-js";

/**
 * Cliente server-side únicamente — usa la service-role key, que bypassa RLS.
 * Nunca importar este módulo desde código que corre en el navegador.
 */
const globalForSupabase = globalThis as unknown as {
  supabaseStorage?: ReturnType<typeof createClient>;
};

export const supabaseStorage =
  globalForSupabase.supabaseStorage ??
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabaseStorage = supabaseStorage;
}
