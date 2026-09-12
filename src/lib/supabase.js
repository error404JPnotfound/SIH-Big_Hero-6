/**
 * lib/supabase.js
 * Supabase client — reads URL and anon key from .env
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.warn(
    '[CareConnect] Supabase URL is not configured. ' +
    'Set VITE_SUPABASE_URL in your .env file. Running in demo mode.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
    storage:            localStorage,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

/** Helper: returns true if Supabase is configured (not placeholder) */
export const isSupabaseConfigured = () =>
  !!(supabaseUrl && !supabaseUrl.includes('placeholder'))
