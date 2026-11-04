import { supabase } from '../config/supabase';
import { hashPassword } from './cryptoUtils';

// Simulated latency used when Supabase isn't configured (demo mode).
const DEMO_LATENCY_MS = 600;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory demo store so signup -> login works seamlessly even without an active DB connection
const demoUsers = new Map();

/**
 * Authentication Service wired directly to:
 * 
 *   create table public.users (
 *     id serial not null,
 *     email character varying(100) not null,
 *     password_hash character varying(255) null,
 *     role public.user_role not null,
 *     created_at timestamp with time zone null default CURRENT_TIMESTAMP,
 *     constraint users_pkey primary key (id),
 *     constraint users_email_key unique (email)
 *   );
 * 
 * Users are stored in public.users on signup, and verified against it on login.
 */
export const authService = {
  /**
   * Registers a new user directly into public.users table.
   */
  async signUp({ email, password, role = 'patient' }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) throw new Error('Please enter a valid email address.');
    if (!password) throw new Error('Please enter a password.');

    const passwordHash = await hashPassword(password);

    // Offline / Demo fallback when Supabase keys are not configured in .env
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

    // 1. Check if email is already registered in public.users
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      throw new Error('An account with this email already exists. Please log in.');
    }

    // 2. Insert into public.users
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

    // Also cache locally for immediate offline re-login
    demoUsers.set(normalizedEmail, {
      id: data.id,
      email: data.email,
      password_hash: passwordHash,
      role: data.role,
    });

    return {
      user: {
        id: data.id,
        email: data.email,
        role: data.role,
      },
    };
  },

  /**
   * Logs in by verifying credentials against public.users table.
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
        throw new Error('No account found with this email. Please check your email or create an account.');
      }
      if (demoUser.password_hash && demoUser.password_hash !== passwordHash) {
        throw new Error('Incorrect password. Please try again.');
      }
      return { user: { id: demoUser.id, email: demoUser.email, role: demoUser.role } };
    }

    // 1. Query user from public.users table (case-insensitive email matching)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      // If table query fails, check cached demo user before throwing
      const cached = demoUsers.get(normalizedEmail);
      if (cached && cached.password_hash === passwordHash) {
        return { user: { id: cached.id, email: cached.email, role: cached.role } };
      }
      throw new Error(error.message || 'Error communicating with database.');
    }

    if (!user) {
      // Check cached user
      const cached = demoUsers.get(normalizedEmail);
      if (cached) {
        if (cached.password_hash !== passwordHash) {
          throw new Error('Incorrect password. Please try again.');
        }
        return { user: { id: cached.id, email: cached.email, role: cached.role } };
      }
      throw new Error('No account found with this email. Please check your email or create an account.');
    }

    // 2. Verify hashed password against stored password_hash
    if (user.password_hash && user.password_hash !== passwordHash) {
      throw new Error('Incorrect password. Please try again.');
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
   * Updates user role in public.users table.
   */
  async updateUserRole({ email, role }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !role) return null;

    const cached = demoUsers.get(normalizedEmail);
    if (cached) cached.role = role;

    if (!supabase) {
      return { id: cached?.id || 1, email: normalizedEmail, role };
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .ilike('email', normalizedEmail)
      .select('id, email, role')
      .maybeSingle();

    if (error) {
      console.warn('Failed to update role in public.users:', error.message);
      return null;
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
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error) return true;
    return !data;
  },
};
