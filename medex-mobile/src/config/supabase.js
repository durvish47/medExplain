import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Polyfill process in browser/web environments where it might not be globally defined
if (typeof process === 'undefined') {
  globalThis.process = { env: {} };
} else if (!process.env) {
  process.env = {};
}

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://qmdwhcpmwrhjyjukuobf.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_WL5yRRKk1Dnf2a1unOGyig_dl_HUzZH';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    "⚠️ Supabase credentials missing! Check medex-mobile/.env and restart Expo."
  );
}

/**
 * Reusable Supabase client instance.
 * Initialized using environment variables (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
 * with safe project fallback.
 */
export const supabase = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth:{ storage:AsyncStorage, autoRefreshToken:true, persistSession:true, detectSessionInUrl:false } })
  : null;

export default supabase;
