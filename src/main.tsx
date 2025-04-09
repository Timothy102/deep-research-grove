
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { toast } from "sonner";
import HumanApprovalDialog from './components/research/HumanApprovalDialog.tsx';
import { submitFeedback } from './services/feedbackService.ts';
import { supabase } from './integrations/supabase/client';
import { LOCAL_STORAGE_KEYS, getSessionStorageKey } from './lib/constants.ts';
import { initPostHog } from './integrations/posthog/client';

// Initialize PostHog if not already initialized by the inline script
initPostHog();

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

// Listen for streaming events from the research process
const eventSource = new EventSource('/api/research/events');

eventSource.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    console.log(`[${new Date().toISOString()}] 📡 Received SSE event:`, data);
    
    // Dispatch a custom event with the same format as realtime updates
    window.dispatchEvent(new CustomEvent('research-new-event', { 
      detail: { 
        payload: data,
        timestamp: new Date().toISOString()
      },
      bubbles: true,
      composed: true
    }));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error handling SSE event:`, error);
  }
};

eventSource.onerror = (error) => {
  console.error(`[${new Date().toISOString()}] ❌ EventSource error:`, error);
  // Attempt to reconnect after a delay
  setTimeout(() => {
    console.log(`[${new Date().toISOString()}] 🔄 Attempting to reconnect EventSource`);
    eventSource.close();
    // The browser will automatically attempt to reconnect
  }, 5000);
};

// Global event handler for human interaction requests 
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === "human_interaction_request") {
    const { call_id, node_id, query, content, interaction_type } = event.data.data;
    
    console.log(`[${new Date().toISOString()}] 🧠 Received human interaction request:`, {
      call_id,
      node_id,
      interaction_type
    });
    
    toast.custom(
      (t) => (
        <HumanApprovalDialog
          content={content}
          query={query}
          callId={call_id}
          nodeId={node_id}
          approvalType={interaction_type}
          isOpen={true}
          onClose={() => toast.dismiss(t)}
          onApprove={async (callId, nodeId) => {
            try {
              await submitFeedback(callId, true);
              toast.success("Feedback submitted successfully");
              toast.dismiss(t);
              return Promise.resolve();
            } catch (error) {
              toast.error("Failed to submit feedback");
              throw error;
            }
          }}
          onReject={async (callId, nodeId, reason) => {
            try {
              await submitFeedback(callId, false, reason);
              toast.success("Feedback submitted successfully");
              toast.dismiss(t);
              return Promise.resolve();
            } catch (error) {
              toast.error("Failed to submit feedback");
              throw error;
            }
          }}
        />
      ),
      {
        id: `interaction-${call_id}`,
        duration: Infinity,
        position: "top-center"
      }
    );
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
