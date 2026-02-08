import { createClient } from "@supabase/supabase-js";

type SupabaseClient = ReturnType<typeof createClient>;

export const getSupabaseServer = (): SupabaseClient | null => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRole) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      persistSession: false
    }
  });
};
