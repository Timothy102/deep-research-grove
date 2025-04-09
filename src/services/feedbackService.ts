
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
  console.log(`[${new Date().toISOString()}] ℹ️ Feedback system disabled, not sending:`, {
    callId,
    approved,
    comment: comment ? comment.substring(0, 50) + "..." : ""
  });
  
  // Just dispatch a research state update request to refresh data
  window.dispatchEvent(new CustomEvent('research-state-refresh-requested', {
    detail: {
      timestamp: new Date().toISOString(),
      source: 'feedback'
    },
    bubbles: true,
    composed: true
  }));
  
  // Return a mock response object
  return {
    id: "disabled",
    call_id: callId,
    approved: true,
    comment: "Human interaction disabled",
    created_at: new Date().toISOString(),
    responded_at: new Date().toISOString()
  };
}
