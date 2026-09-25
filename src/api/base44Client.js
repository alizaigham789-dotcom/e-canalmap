import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { base44 as supabaseBase44 } from "@/api/supabaseBackend";

// Keep the backend choice explicit. Hostinger serves the Base44 SDK through
// the same-origin /api proxy, while Supabase is an intentional alternative.
export const BACKEND_PROVIDER = (import.meta.env.VITE_APP_BACKEND || 'base44').toLowerCase();
export const USE_SUPABASE = BACKEND_PROVIDER === 'supabase';

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