
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { toast } from "sonner";
import HumanApprovalDialog from './components/research/HumanApprovalDialog.tsx';
import { respondToApproval } from './services/humanLayerService.ts';

// Global event handler for human interaction requests 
// This ensures we can handle them even if the user navigates away from the research page
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
