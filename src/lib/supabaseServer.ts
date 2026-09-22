import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side access to Supabase environment variables
const getSupabaseUrl = (): string => {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
};

const getSupabaseKey = (): string => {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  );
};

let serverSupabaseInstance: SupabaseClient | null = null;

export function isServerSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  return Boolean(url && key && url.startsWith('https://') && key.length > 10);
}

export function getServerSupabase(): SupabaseClient | null {
  if (!isServerSupabaseConfigured()) {
    return null;
  }

  if (!serverSupabaseInstance) {
    try {
      const url = getSupabaseUrl();
      const key = getSupabaseKey();
      serverSupabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('[Supabase] Initialized server Supabase client successfully.');
    } catch (err) {
      console.warn('[Supabase] Failed to initialize server client:', err);
      return null;
    }
  }

  return serverSupabaseInstance;
}
