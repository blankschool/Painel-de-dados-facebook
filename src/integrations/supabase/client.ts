import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xftrrfomvmvllnwjroxp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHJyZm9tdm12bGxud2pyb3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTMyNTEsImV4cCI6MjA4MTM4OTI1MX0.nuMxDRKXmIYGy572hEOfNNNfsGIwZn0RcTbLZGp-lwU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
