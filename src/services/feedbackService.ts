
import { toast } from "sonner";

interface FeedbackResponse {
  id: string;
  comment?: string;
  approved: boolean;
  created_at?: string;
  responded_at?: string;
  call_id: string;
  [key: string]: any;
}

export async function submitFeedback(
  callId: string, 
  approved: boolean, 
  comment: string = ""
): Promise<FeedbackResponse> {
  console.log(`[${new Date().toISOString()}] 🚀 Sending feedback:`, {
    callId,
    approved,
    comment: comment ? comment.substring(0, 50) + "..." : ""
  });
  
  try {
    // Process the feedback via the human interaction service
    const response = await fetch(`https://timothy102--vertical-deep-research-human-interaction.modal.run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        node_id: callId,
        feedback: comment,
        interaction_type: approved ? "approval" : "rejection",
        session_id: window.location.pathname.split('/').pop() || ''
      }),
      // Add timeout and credentials for better reliability
      credentials: 'omit', // Don't send cookies
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Feedback API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] ✅ Feedback submitted successfully:`, data);
    
    // Dispatch a custom event to notify the system that a human interaction has completed
    const humanInteractionEvent = new CustomEvent('human_interaction_completed', {
      detail: {
        call_id: callId,
        approved,
        comment,
        response: data,
        timestamp: new Date().toISOString()
      },
      bubbles: true,
      composed: true
    });
    
    window.dispatchEvent(humanInteractionEvent);
    
    // Also dispatch a research state update request to refresh data
    window.dispatchEvent(new CustomEvent('research-state-refresh-requested', {
      detail: {
        timestamp: new Date().toISOString(),
        source: 'feedback'
      },
      bubbles: true,
      composed: true
    }));
    
    return {
      id: data.id || callId,
      call_id: callId,
      approved,
      comment,
      created_at: new Date().toISOString(),
      responded_at: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error sending feedback:`, error);
    toast.error("Failed to send feedback");
    throw error;
  }
}
