
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { toast } from "sonner";
import HumanApprovalDialog from './components/research/HumanApprovalDialog.tsx';
import { respondToApproval } from './services/humanLayerService.ts';
import { supabase } from './integrations/supabase/client';

// Set default theme to light
document.documentElement.classList.add('light');
document.documentElement.style.colorScheme = 'light';

// Enable realtime subscriptions for the research_states table
supabase.channel('research_states_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'research_states' }, 
    (payload) => {
      console.log(`[${new Date().toISOString()}] 📊 Realtime update from research_states:`, payload);
    }
  )
  .subscribe((status) => {
    console.log(`[${new Date().toISOString()}] 🔌 Realtime status:`, status);
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
              await respondToApproval(callId, true);
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
              await respondToApproval(callId, false, reason);
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

createRoot(document.getElementById("root")!).render(<App />);
