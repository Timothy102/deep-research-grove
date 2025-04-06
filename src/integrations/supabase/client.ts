
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
  },
  // Add persistent storage options for better session management
  global: {
    fetch: (input, init) => fetch(input, init),
  },
  db: {
    schema: 'public',
  },
});

// Helper function to get session from local storage with better error handling
export const getStoredSession = () => {
  try {
    const sessionStr = localStorage.getItem('supabase.auth.token');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      console.log(`[${new Date().toISOString()}] 📋 Retrieved stored session:`, session?.access_token ? 'Valid token exists' : 'No valid token');
      return session;
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
      console.log(`[${new Date().toISOString()}] 🔄 Synced session to localStorage: ${session.access_token.substring(0, 15)}...`);
      return session;
    }
  } catch (e) {
    console.error("Error syncing session:", e);
  }
  return null;
};

// Generate a unique client identifier for this browser session
// Now with more entropy and session/tab isolation
export const getClientId = () => {
  const storageKey = 'deepresearch.client.id';
  let clientId = localStorage.getItem(storageKey);
  
  if (!clientId) {
    // Create a more unique identifier with multiple sources of entropy
    const random = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    const tabId = crypto.randomUUID ? crypto.randomUUID() : `tab_${Math.random().toString(36).substring(2, 9)}`;
    
    clientId = `client_${random}_${timestamp}_${tabId}`;
    localStorage.setItem(storageKey, clientId);
    
    // Also store in sessionStorage to ensure tab isolation
    sessionStorage.setItem(storageKey, clientId);
    
    console.log(`[${new Date().toISOString()}] 🆕 Generated new client ID:`, clientId);
  } else {
    // Verify the client ID matches the session storage (tab-specific)
    const sessionClientId = sessionStorage.getItem(storageKey);
    
    // If this is a different tab, regenerate the client ID to ensure isolation
    if (!sessionClientId) {
      // Create a tab-specific ID
      const tabSpecificId = `${clientId}_tab_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9)}`;
      
      sessionStorage.setItem(storageKey, tabSpecificId);
      
      // Also update localStorage for this tab
      localStorage.setItem(storageKey, tabSpecificId);
      
      clientId = tabSpecificId;
      console.log(`[${new Date().toISOString()}] 🔄 Generated tab-specific client ID:`, clientId);
    }
  }
  
  return clientId;
};

// Function to verify if the connection to Supabase is working properly
export const checkSupabaseConnection = async () => {
  try {
    // Simple query to test connection
    const { data, error } = await supabase
      .from('research_states')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Supabase connection test failed:`, error);
      return false;
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Supabase connection test successful`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 🔥 Critical error testing Supabase connection:`, error);
    return false;
  }
};

// Exponential backoff reconnection to Supabase
export const reconnectToSupabase = async (maxRetries = 5, initialDelay = 1000) => {
  let retries = 0;
  let delay = initialDelay;
  
  while (retries < maxRetries) {
    console.log(`[${new Date().toISOString()}] 🔄 Attempting to reconnect to Supabase (attempt ${retries + 1}/${maxRetries})...`);
    
    if (await checkSupabaseConnection()) {
      console.log(`[${new Date().toISOString()}] ✅ Successfully reconnected to Supabase`);
      return true;
    }
    
    retries++;
    if (retries >= maxRetries) break;
    
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2;
  }
  
  console.error(`[${new Date().toISOString()}] ❌ Failed to reconnect to Supabase after ${maxRetries} attempts`);
  return false;
};
