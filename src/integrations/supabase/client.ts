import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://phbwmfjrgadzybqpjnoi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoYndtZmpyZ2FkenlicXBqbm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTA2MDAsImV4cCI6MjA4MTYyNjYwMH0.iF3hnIAToWo58kfWkFTHiT1uqj0VkFr5XbmADWDJ6fY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
