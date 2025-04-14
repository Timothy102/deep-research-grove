
import { toast } from "sonner";

interface FeedbackSubmission {
  rating: number;
  comment: string;
  session_id: string;
  research_id: string;
  query: string;
}

export async function submitFeedback(feedback: FeedbackSubmission): Promise<void> {
  console.log(`[${new Date().toISOString()}] 🚀 Sending feedback:`, {
    rating: feedback.rating,
    sessionId: feedback.session_id,
    researchId: feedback.research_id,
    comment: feedback.comment ? feedback.comment.substring(0, 50) + "..." : ""
  });
  
  try {
    // This function could be updated to send feedback to a different endpoint
    // For now, we'll just log it and return a successful response
    console.log(`[${new Date().toISOString()}] ✅ Feedback logged successfully:`, feedback);
    
    // Dispatch a custom event to notify the system that feedback has been submitted
    window.dispatchEvent(new CustomEvent('research-state-refresh-requested', {
      detail: {
        timestamp: new Date().toISOString(),
        source: 'feedback'
      },
      bubbles: true,
      composed: true
    }));
    
    return;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error sending feedback:`, error);
    toast.error("Failed to send feedback");
    throw error;
  }
}
