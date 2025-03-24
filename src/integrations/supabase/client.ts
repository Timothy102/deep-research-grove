
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Enhanced Supabase client for improved persistence across sessions
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

// Generate a unique client identifier for this browser session
export const getClientId = () => {
  const storageKey = 'deepresearch.client.id';
  let clientId = localStorage.getItem(storageKey);
  
  if (!clientId) {
    clientId = `client_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
    localStorage.setItem(storageKey, clientId);
  }
  
  return clientId;
};
