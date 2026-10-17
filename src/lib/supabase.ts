import { createClient } from '@supabase/supabase-js';

// Both values are public by design: they ship in the browser bundle of any
// Supabase site. Access is enforced by RLS on uzidoc_templates (see
// supabase/schema.sql), never by hiding these. The secret (service role) key
// must never appear in this repository.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cqlkhsaewbhqjuyeyunj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_4CP2D5ovQc96udvgMjKbRA_YcMwl634';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'uzidoc-auth',
  },
});
