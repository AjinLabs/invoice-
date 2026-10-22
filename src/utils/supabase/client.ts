import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jnqwoxgvxylqjvnpjfnm.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_JQEZ9O6bVL62zZUT6X534w_RGN6OANj';

export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey);
