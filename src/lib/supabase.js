import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// null when not configured – direct mode works without Supabase
export const supabase = url && key ? createClient(url, key) : null;
