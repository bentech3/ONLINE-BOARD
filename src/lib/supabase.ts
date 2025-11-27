// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Ensure the key exists before creating the client instance
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables!")
}

export const supabase = createClient(supabaseUrl, supabaseKey)