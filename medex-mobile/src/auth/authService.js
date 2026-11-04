import { supabase } from '../config/supabase';
import { hashPassword } from './cryptoUtils';

// Simulated network latency used when Supabase isn't configured (demo mode).
const DEMO_LATENCY_MS = 800;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory demo store for when running offline / without Supabase configured
const demoUsers = new Map();

/**
 * Authentication Service wired directly to Supabase:
 * 1. Queries and inserts into `public.users` table matching your schema:
 *    - id (serial)
 *    - email (varchar 100, unique)
 *    - password_hash (varchar 255)
 *    - role (public.user_role: 'patient' | 'doctor')
 *    - created_at (timestamp)
 * 2. Simultaneously manages Supabase Auth session (GoTrue) so user tokens
 *    and RLS sessions are established.
 */
export const authService = {
  /**
   * Registers a new user into public.users table and creates a Supabase Auth session.
   */
  async signUp({ email, password, role = 'patient' }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) throw new Error('Please enter a valid email address.');
    if (!password) throw new Error('Please enter a password.');

    const passwordHash = await hashPassword(password);

    // Offline / Demo fallback when EXPO_PUBLIC_SUPABASE_URL is not set
    if (!supabase) {
      await wait(DEMO_LATENCY_MS);
      if (demoUsers.has(normalizedEmail)) {
        throw new Error('An account with this email already exists. Please log in.');
      }
      const fakeUser = {
        id: demoUsers.size + 1,
        email: normalizedEmail,
        password_hash: passwordHash,
        role: role || 'patient',
        created_at: new Date().toISOString(),
      };
      demoUsers.set(normalizedEmail, fakeUser);
      return { user: { id: fakeUser.id, email: fakeUser.email, role: fakeUser.role } };
    }

    // 1. Check if user already exists in public.users
    const { data: existing } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      throw new Error('An account with this email already exists. Please log in.');
    }

    // 2. Also register with Supabase Auth (GoTrue) to establish session
    try {
      await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { role },
        },
      });
    } catch (authErr) {
      console.warn('Supabase Auth signUp note:', authErr?.message);
    }

    // 3. Insert new user record into public.users table
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: normalizedEmail,
          password_hash: passwordHash,
          role: role || 'patient',
        },
      ])
      .select('id, email, role, created_at')
      .single();

    if (error) {
      if (
        error.code === '23505' ||
        error.message?.includes('users_email_key') ||
        error.message?.includes('duplicate key')
      ) {
        throw new Error('An account with this email already exists. Please log in.');
      }
      throw new Error(error.message || 'We could not create your account. Please try again.');
    }

    return {
      user: {
        id: data.id,
        email: data.email,
        role: data.role,
      },
    };
  },

  /**
   * Verifies credentials against public.users table and signs into Supabase Auth.
   */
  async signIn({ email, password }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) throw new Error('Please enter your email address.');
    if (!password) throw new Error('Please enter your password.');

    const passwordHash = await hashPassword(password);

    // Offline / Demo fallback
    if (!supabase) {
      await wait(DEMO_LATENCY_MS);
      const demoUser = demoUsers.get(normalizedEmail);
      if (!demoUser) {
        return {
          user: {
            id: 1,
            email: normalizedEmail,
            role: 'patient',
          },
        };
      }
      if (demoUser.password_hash && demoUser.password_hash !== passwordHash) {
        throw new Error('Incorrect password. Please try again.');
      }
      return { user: { id: demoUser.id, email: demoUser.email, role: demoUser.role } };
    }

    // 1. Query public.users table
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Error communicating with database.');
    }

    if (!user) {
      throw new Error('No account found with this email. Please check your email or create an account.');
    }

    // 2. Verify password hash
    if (user.password_hash && user.password_hash !== passwordHash) {
      throw new Error('Incorrect password. Please try again.');
    }

    // 3. Establish active Supabase Auth session
    try {
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
    } catch (authErr) {
      console.warn('Supabase Auth signIn note:', authErr?.message);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  },

  /**
   * Updates user role in public.users and in Supabase Auth metadata.
   */
  async updateUserRole({ email, role }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !role) return null;

    if (!supabase) {
      const demoUser = demoUsers.get(normalizedEmail);
      if (demoUser) demoUser.role = role;
      return { id: demoUser?.id || 1, email: normalizedEmail, role };
    }

    // 1. Update public.users table
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('email', normalizedEmail)
      .select('id, email, role')
      .maybeSingle();

    if (error) {
      console.warn('Failed to update role in public.users:', error.message);
    }

    // 2. Update Supabase Auth user metadata
    try {
      await supabase.auth.updateUser({
        data: { role },
      });
    } catch {
      // Non-blocking
    }

    return data;
  },

  /**
   * Checks if an email is available in public.users.
   */
  async isEmailAvailable(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return false;

    if (!supabase) {
      return !demoUsers.has(normalizedEmail);
    }

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) return true;
    return !data;
  },

  /**
   * Signs out from Supabase Auth.
   */
  async signOut() {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err?.message);
      }
    }
  },
};
