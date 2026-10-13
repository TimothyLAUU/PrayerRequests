import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const demoMode = !url && !key;
export let configurationError = '';
export let supabase = null;
if (!demoMode) {
  try {
    if (!url || !key) throw new Error('Missing settings');
    supabase = createClient(url, key);
  } catch {
    configurationError = 'Supabase configuration is incomplete or invalid. Check both environment variables and rebuild.';
  }
}
