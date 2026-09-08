import { createClient } from "@supabase/supabase-js";

// Supabase project URL + anon public key (hardcoded fallbacks so the app works
// without build env vars). The anon key is public-safe — RLS protects the data.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ikxbvgmalusemygfqeiq.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_IjDU__SpMgLaaxCxQtkzTw_hSnW-B1x";

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