
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { toast } from "sonner";
import HumanApprovalDialog from './components/research/HumanApprovalDialog.tsx';
import { submitFeedback } from './services/feedbackService.ts';
import { supabase } from './integrations/supabase/client';

// Enable realtime subscriptions with improved logging and recovery
supabase.channel('research_states_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'research_states' }, 
    (payload) => {
      console.log(`[${new Date().toISOString()}] 📊 Realtime update received:`, payload);
      
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
          sessionId: payload.new && typeof payload.new === 'object' && 'session_id' in payload.new 
            ? payload.new.session_id 
            : undefined,
          fullPayload: payload // Include the full payload for components to use
        },
        bubbles: true,
        composed: true
      }));
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
