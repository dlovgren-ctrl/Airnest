import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://hpbfuuwnwbesiotgdpls.supabase.co"
const supabasePublishableKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwYmZ1dXdud2Jlc2lvdGdkcGxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDcyNDYsImV4cCI6MjA4NzU4MzI0Nn0.w-JvgF9QUQsCvcnLiHYN4YJ-eSnpbF60clMriEMbONM"

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})