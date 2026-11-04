import { supabase } from '../config/supabase';

// Simulated network latency used when Supabase isn't configured (demo mode).
const DEMO_LATENCY_MS = 900;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Thin wrapper over Supabase Auth. Throws an Error with a user-readable message
 * on failure so screens can display it directly.
 */
export const authService = {
  async signUp({ email, password }) {
    if (!supabase) {
      await wait(DEMO_LATENCY_MS);
      return { user: { email: email.trim() } };
    }
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    return data;
  },

  async signIn({ email, password }) {
    if (!supabase) {
      await wait(DEMO_LATENCY_MS);
      return { user: { email: email.trim() } };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    return data;
  },
};
