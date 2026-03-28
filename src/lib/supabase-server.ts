import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client (keys never exposed to browser)
export function createServerSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
}
