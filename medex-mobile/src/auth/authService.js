import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { hashPassword } from './cryptoUtils';

// Login data is kept on this device for now (no network needed).
// Set to false to use the Supabase public.users table instead.
export const USE_LOCAL_AUTH = true;
const useRemote = () => !USE_LOCAL_AUTH && !!supabase;

const LOCAL_USERS_KEY = '@medex_local_users';
const LATENCY_MS = 400; // small delay so the loading state is visible
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

// ── Local store ─────────────────────────────────────────────────────────────
// Users are kept in an object keyed by email, persisted to AsyncStorage so they
// survive app reloads. Passwords are stored only as hashes.
let localCache = null;

const loadLocalUsers = async () => {
  if (localCache) return localCache;
  try {
    const raw = await AsyncStorage.getItem(LOCAL_USERS_KEY);
    localCache = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Could not read local users', e);
    localCache = {};
  }
  return localCache;
};

const saveLocalUsers = async (users) => {
  try {
    await AsyncStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Could not save local users', e);
    throw new Error('We could not save your account on this device. Please try again.');
  }
};

const nextLocalId = (users) =>
  Object.values(users).reduce((max, u) => Math.max(max, u.id || 0), 0) + 1;

const toPublicUser = (u) => ({ id: u.id, email: u.email, role: u.role });

/**
 * Authentication service. Mirrors the public.users table:
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
 * In local mode the same shape is stored on the device. In remote mode the
 * rows go to public.users in Supabase.
 */
export const authService = {
  /** Creates an account. Throws a user-readable Error on failure. */
  async signUp({ email, password, role = 'patient' }) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) throw new Error('Please enter a valid email address.');
    if (!password) throw new Error('Please enter a password.');

    const passwordHash = await hashPassword(password);

    if (!useRemote()) {
      await wait(LATENCY_MS);
      const users = await loadLocalUsers();
      if (users[normalizedEmail]) {
        throw new Error('An account with this email already exists. Please log in.');
      }
      users[normalizedEmail] = {
        id: nextLocalId(users),
        email: normalizedEmail,
        password_hash: passwordHash,
        role: role || 'patient',
        created_at: new Date().toISOString(),
      };
      await saveLocalUsers(users);
      return { user: toPublicUser(users[normalizedEmail]) };
    }

    // Remote: insert into public.users. The unique constraint on email catches duplicates.
    const { data, error } = await supabase
      .from('users')
      .insert([{ email: normalizedEmail, password_hash: passwordHash, role: role || 'patient' }])
      .select('id, email, role, created_at')
      .single();

    if (error) {
      if (error.code === '23505' || error.message?.includes('users_email_key') || error.message?.includes('duplicate key')) {
        throw new Error('An account with this email already exists. Please log in.');
      }
      throw new Error(error.message || 'We could not create your account. Please try again.');
    }
    return { user: toPublicUser(data) };
  },

  /** Verifies credentials. Throws a user-readable Error on failure. */
  async signIn({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) throw new Error('Please enter your email address.');
    if (!password) throw new Error('Please enter your password.');

    const passwordHash = await hashPassword(password);

    if (!useRemote()) {
      await wait(LATENCY_MS);
      const users = await loadLocalUsers();
      const user = users[normalizedEmail];
      if (!user) {
        throw new Error('No account found with this email. Please check your email or create an account.');
      }
      if (user.password_hash !== passwordHash) {
        throw new Error('Incorrect password. Please try again.');
      }
      return { user: toPublicUser(user) };
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error) throw new Error(error.message || 'Error communicating with database.');
    if (!user) {
      throw new Error('No account found with this email. Please check your email or create an account.');
    }
    if (user.password_hash && user.password_hash !== passwordHash) {
      throw new Error('Incorrect password. Please try again.');
    }
    return { user: toPublicUser(user) };
  },

  /** Saves the role chosen during onboarding. Returns null if it could not be saved. */
  async updateUserRole({ email, role }) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !role) return null;

    if (!useRemote()) {
      const users = await loadLocalUsers();
      if (!users[normalizedEmail]) return null;
      users[normalizedEmail].role = role;
      await saveLocalUsers(users);
      return toPublicUser(users[normalizedEmail]);
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

  /** True when no account exists for this email yet. */
  async isEmailAvailable(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return false;

    if (!useRemote()) {
      const users = await loadLocalUsers();
      return !users[normalizedEmail];
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
