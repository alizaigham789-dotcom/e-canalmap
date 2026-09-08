import { createClient } from "@supabase/supabase-js";

// Supabase project URL (hardcoded fallback so the app works without build env vars).
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ikxbvgmalusemygfqeiq.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_ANON_KEY) {
  console.warn(
    "[Supabase] anon key missing. Add VITE_SUPABASE_ANON_KEY (Supabase → Settings → API → 'anon public')."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});