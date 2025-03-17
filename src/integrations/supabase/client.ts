
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://icpaknsdfozkbyqzpvdm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljcGFrbnNkZm96a2J5cXpwdmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5MDQ4MzcsImV4cCI6MjA1NjQ4MDgzN30.2yxoPryjdl_DoikWyt5to66m3aDKwthOxUdX4wPmGi8";

// Enhanced Supabase client for improved persistence across sessions
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
    storageKey: 'supabase.auth.token',  // Explicitly set the storage key
    storage: {
      getItem: (key) => {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        } catch (error) {
          console.error('Error retrieving from storage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.error('Error setting storage item:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing storage item:', error);
        }
      }
    }
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

// Helper function to ensure persistent sessions
export const syncSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Ensure the session is properly stored
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
      return session;
    }
  } catch (e) {
    console.error("Error syncing session:", e);
  }
  return null;
};
