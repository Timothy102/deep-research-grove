
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { toast } from "sonner";
import { submitFeedback } from './services/feedbackService.ts';
import { supabase } from './integrations/supabase/client';
import { LOCAL_STORAGE_KEYS, getSessionStorageKey } from './lib/constants.ts';
import { initPostHog, captureEvent } from './integrations/posthog/client';

// Initialize PostHog if not already initialized by the inline script
initPostHog();

// Capture initial visit with attribution data
captureEvent('initial_visit', {
  referrer: document.referrer,
  utm_source: new URLSearchParams(window.location.search).get('utm_source'),
  utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
  utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
  landing_page: window.location.pathname,
  time: new Date().toISOString()
});

// Track the current active session ID
let currentSessionId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID) || '';

// Listen for session changes
window.addEventListener('session-selected', (event: Event) => {
  const customEvent = event as CustomEvent;
  if (customEvent.detail && customEvent.detail.sessionId) {
    console.log(`[${new Date().toISOString()}] 🔄 Session changed to:`, customEvent.detail.sessionId);
    currentSessionId = customEvent.detail.sessionId;
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, currentSessionId);
  }
});

// Enable realtime subscriptions with improved logging and recovery
supabase.channel('research_states_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'research_states' }, 
    (payload) => {
      try {
        console.log(`[${new Date().toISOString()}] 📊 Realtime update received:`, {
          table: payload.table,
          schema: payload.schema,
          event_type: payload.eventType
        });
        
        // Check if this update is for the current session
        const payloadSessionId = payload.new && typeof payload.new === 'object' && 'session_id' in payload.new 
          ? payload.new.session_id 
          : undefined;
          
        // If we have a current active session and this update is for a different session, don't process it
        if (currentSessionId && payloadSessionId && payloadSessionId !== currentSessionId) {
          console.log(`[${new Date().toISOString()}] ℹ️ Ignoring update for different session (${payloadSessionId}), current is (${currentSessionId})`);
          return;
        }
        
        // Dispatch a custom event so components can react to it immediately
        const eventDetail = { 
          payload,
          timestamp: new Date().toISOString()
        };
        
        // Dispatch the event with full payload data
        window.dispatchEvent(new CustomEvent('research_state_update', { 
          detail: eventDetail,
          bubbles: true, // Ensure event bubbles up through the DOM
          composed: true  // Allow event to pass through shadow DOM boundaries
        }));
        
        // Also dispatch a more urgent "new-event" notification that can be used 
        // to trigger immediate UI updates regardless of the payload content
        window.dispatchEvent(new CustomEvent('research-new-event', { 
          detail: { 
            type: 'realtime',
            timestamp: new Date().toISOString(),
            sessionId: payloadSessionId,
            fullPayload: payload // Include the full payload for components to use
          },
          bubbles: true,
          composed: true
        }));
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error processing realtime update:`, error);
      }
    }
  )
  .subscribe((status) => {
    console.log(`[${new Date().toISOString()}] 🔌 Realtime connection status:`, status);
    
    // Notify when connection is established or reconnected
    if (status === 'SUBSCRIBED') {
      console.log(`[${new Date().toISOString()}] ✅ Realtime subscription active`);
      
      // Attempt to reconnect if connection drops
      window.addEventListener('online', () => {
        console.log(`[${new Date().toISOString()}] 🔄 Network back online, reestablishing connections`);
        supabase.channel('research_states_changes').subscribe();
      });
    }
  });

// Add a heartbeat to ensure components are updating regularly
// and check for stale data that needs refreshing
setInterval(() => {
  window.dispatchEvent(new CustomEvent('research-heartbeat', { 
    detail: { timestamp: new Date().toISOString() }
  }));
}, 5000);

createRoot(document.getElementById("root")!).render(<App />);
