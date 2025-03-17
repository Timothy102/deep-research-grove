
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://icpaknsdfozkbyqzpvdm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcGFrbnNkZm96a2J5cXpwdmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5MDQ4MzcsImV4cCI6MjA1NjQ4MDgzN30.2yxoPryjdl_DoikWyt5to66m3aDKwthOxUdX4wPmGi8";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

// Helper function to get session from local storage
export const getStoredSession = () => {
  try {
    const sessionStr = localStorage.getItem('supabase.auth.token');
    if (sessionStr) {
      return JSON.parse(sessionStr);
    }
  } catch (e) {
    console.error("Error retrieving session:", e);
  }
  return null;
};
