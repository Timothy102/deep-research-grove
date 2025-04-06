
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { toast } from "sonner";
import HumanApprovalDialog from './components/research/HumanApprovalDialog.tsx';
import { submitHumanFeedback } from './services/humanInteractionService.ts';
import { supabase } from './integrations/supabase/client';
import { updateResearchState } from './services/researchStateService';

// Enable realtime subscriptions with improved logging
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
      
      // Dispatch the event
      window.dispatchEvent(new CustomEvent('research_state_update', { detail: eventDetail }));
      
      // Also dispatch a more urgent "new-event" notification that can be used 
      // to trigger immediate UI updates regardless of the payload content
      window.dispatchEvent(new CustomEvent('research-new-event', { 
        detail: { 
          type: 'realtime',
          timestamp: new Date().toISOString(),
          sessionId: payload.new && typeof payload.new === 'object' && 'session_id' in payload.new 
            ? payload.new.session_id 
            : undefined
        }
      }));
    }
  )
  .subscribe((status) => {
    console.log(`[${new Date().toISOString()}] 🔌 Realtime connection status:`, status);
    
    // Notify when connection is established or reconnected
    if (status === 'SUBSCRIBED') {
      console.log(`[${new Date().toISOString()}] ✅ Realtime subscription active`);
    }
  });

// Global event handler for human interaction requests 
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === "human_interaction_request") {
    const { call_id, node_id, query, content, interaction_type, session_id, research_id } = event.data.data;
    
    console.log(`[${new Date().toISOString()}] 🧠 Received human interaction request:`, {
      call_id,
      node_id,
      interaction_type,
      session_id,
      research_id
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
              // Submit feedback through our internal service
              await submitHumanFeedback(nodeId, "Approved", "approve", callId);
              
              // Store interaction directly in research_states
              if (session_id && research_id) {
                await updateResearchState(research_id, session_id, {
                  custom_data: JSON.stringify({
                    call_id: callId,
                    node_id: nodeId,
                    approved: true,
                    interaction_type: interaction_type,
                    timestamp: new Date().toISOString()
                  })
                });
              }
              
              // Dispatch a custom event to notify the system that a human interaction has completed
              const humanInteractionEvent = new CustomEvent('human_interaction_completed', {
                detail: {
                  call_id: callId,
                  node_id: nodeId,
                  approved: true,
                  session_id: session_id,
                  research_id: research_id
                }
              });
              
              window.dispatchEvent(humanInteractionEvent);
              
              toast.success("Feedback submitted successfully");
              toast.dismiss(t);
              return Promise.resolve();
            } catch (error) {
              console.error("Error submitting approval:", error);
              toast.error("Failed to submit feedback");
              throw error;
            }
          }}
          onReject={async (callId, nodeId, reason) => {
            try {
              // Submit feedback through our internal service
              await submitHumanFeedback(nodeId, reason, "reject", callId);
              
              // Store interaction directly in research_states
              if (session_id && research_id) {
                await updateResearchState(research_id, session_id, {
                  custom_data: JSON.stringify({
                    call_id: callId,
                    node_id: nodeId, 
                    approved: false,
                    interaction_type: interaction_type,
                    comment: reason,
                    timestamp: new Date().toISOString()
                  })
                });
              }
              
              // Dispatch a custom event to notify the system that a human interaction has completed
              const humanInteractionEvent = new CustomEvent('human_interaction_completed', {
                detail: {
                  call_id: callId,
                  node_id: nodeId,
                  approved: false,
                  comment: reason,
                  session_id: session_id,
                  research_id: research_id
                }
              });
              
              window.dispatchEvent(humanInteractionEvent);
              
              toast.success("Feedback submitted successfully");
              toast.dismiss(t);
              return Promise.resolve();
            } catch (error) {
              console.error("Error submitting rejection:", error);
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
setInterval(() => {
  window.dispatchEvent(new CustomEvent('research-heartbeat', { 
    detail: { timestamp: new Date().toISOString() }
  }));
}, 5000);

createRoot(document.getElementById("root")!).render(<App />);
