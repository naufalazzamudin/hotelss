import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Environment variables provided by Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if valid Supabase configuration is present
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder') &&
    supabaseAnonKey.length > 20
  );
}

// Fallback dummy URL to prevent createClient throwing on startup if env is empty
const safeUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key-01234567890123456789';

export const supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * Normalizes username input to a standard Supabase Auth email format.
 * If user already provided an email (contains '@'), returns it as-is.
 * Otherwise, maps e.g. "ITMANAGER" to "itmanager@hotel-it.internal".
 */
export function usernameToEmail(usernameOrEmail: string): string {
  const trimmed = usernameOrEmail.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  return `${trimmed}@hotel-it.internal`;
}

/**
 * Extracts clean username from email (e.g. "itmanager@hotel-it.internal" -> "ITMANAGER")
 */
export function emailToUsername(email: string): string {
  if (email.endsWith('@hotel-it.internal')) {
    return email.replace('@hotel-it.internal', '').toUpperCase();
  }
  return email.split('@')[0].toUpperCase();
}
