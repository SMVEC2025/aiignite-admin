// src/lib/admin.js
import { supabase } from './supabaseClient';

// Calls your SQL function public.is_admin()
export async function isAdmin() {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return Boolean(data);
}

// After login, verify admin else sign out
export async function ensureAdminOrSignOut() {
  const ok = await isAdmin();
  if (!ok) {
    await supabase.auth.signOut();
  }
  return ok;
}
