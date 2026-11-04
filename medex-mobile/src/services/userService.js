// src/services/userService.js
/**
 * User Service
 *
 * Provides:
 *  1. signUp – traditional email/password registration OR Google OAuth.
 *  2. onboardPatient – populate the `user_insurance_details` row for a patient.
 *
 * Uses the reusable Supabase client exported from `src/config/supabase.js`.
 */

import { supabase } from '../config/supabase';

/**
 * Register a new user with email & password.
 *
 * @param {string} email    User's email address
 * @param {string} password Plain‑text password (will be hashed by Supabase)
 * @returns {Promise<object>} Result from Supabase auth API
 *
 * Example:
 *   const { data, error } = await signUp('john@doe.com', 's3cr3t');
 */
export async function signUpWithEmail(email, password) {
  if (!supabase) {
    throw new Error('Supabase client not configured.');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  return { data, error };
}

/**
 * Initiate Google OAuth sign‑in / sign‑up flow.
 *
 * @returns {Promise<object>} Result from Supabase auth API
 *
 * The caller should handle the redirect URL that Supabase returns.
 */
export async function signUpWithGoogle() {
  if (!supabase) {
    throw new Error('Supabase client not configured.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  });

  return { data, error };
}

/**
 * Insert or update a patient's insurance details.
 *
 * @param {object} payload Object with the following shape:
 *   {
 *     user_id: number,          // FK to users.id (must exist)
 *     full_name: string,
 *     gender: string,
 *     government_id: string,
 *     occupation: string,
 *     date_of_birth: string,    // ISO date (YYYY‑MM‑DD)
 *     height_cm: number,
 *     weight_kg: number,
 *     is_smoker?: boolean,
 *     is_drinker?: boolean
 *   }
 *
 * @returns {Promise<object>} Result of the insert operation
 *
 * Note: `user_id` is defined as `UNIQUE` in the DB, so we use
 * `upsert` (insert or update) to allow re‑running the onboarding step
 * without violating the constraint.
 */
export async function onboardPatient(payload) {
  if (!supabase) {
    throw new Error('Supabase client not configured.');
  }

  // Ensure optional booleans have defaults
  const {
    user_id,
    full_name,
    gender,
    government_id,
    occupation,
    date_of_birth,
    height_cm,
    weight_kg,
    is_smoker = false,
    is_drinker = false,
  } = payload;

  const { data, error } = await supabase
    .from('user_insurance_details')
    .upsert({
      user_id,
      full_name,
      gender,
      government_id,
      occupation,
      date_of_birth,
      height_cm,
      weight_kg,
      is_smoker,
      is_drinker,
    })
    .single(); // expect one row (unique user_id)

  return { data, error };
}

/**
 * Exported API surface – callers can import the specific functions they need
 * or use the default object.
 */
export default {
  signUpWithEmail,
  signUpWithGoogle,
  onboardPatient,
};

