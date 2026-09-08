import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { base44 as supabaseBase44 } from "@/api/supabaseBackend";

// Flip to true to run the whole app on Supabase (free tier) instead of Base44.
// Kept false until the Supabase anon key is wired in (see src/lib/supabaseClient.js)
// AND AuthContext is Supabase-ready — flipping prematurely breaks AI features + auth.
const USE_SUPABASE = false;

const { appId, token, functionsVersion, appBaseUrl, apiKey } = appParams;

const sdkClient = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
  ...(apiKey ? { headers: { api_key: apiKey } } : {}),
});

export const base44 = USE_SUPABASE ? supabaseBase44 : sdkClient;