
import { toast } from "sonner";

interface HumanLayerResponse {
  id: string;
  comment?: string;
  approved: boolean;
  created_at?: string;
  responded_at?: string;
  call_id: string;
  [key: string]: any;
}

export async function respondToApproval(
  callId: string, 
  approved: boolean, 
  comment: string = ""
): Promise<HumanLayerResponse> {
  console.log(`[${new Date().toISOString()}] 🚀 Sending approval response to HumanLayer:`, {
    callId,
    approved,
    comment: comment ? comment.substring(0, 50) + "..." : ""
  });
  
  const payload = {
    approved,
    comment,
    user_info: {},
    slack_context: {},
    reject_option_name: null
  };
  
  try {
    const response = await fetch(`https://api.humanlayer.dev/humanlayer/v1/agent/function_calls/${callId}/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer hl-a-xg52uTvDVR_XQohWAXvz4cFjVIVve-DfCBSELw3KCK4"
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HumanLayer API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] ✅ HumanLayer response successful:`, data);
    
    // Dispatch a custom event to notify the system that a human interaction has completed
    const humanInteractionEvent = new CustomEvent('human_interaction_completed', {
      detail: {
        call_id: callId,
        approved,
        comment,
        response: data
      }
    });
    
    window.dispatchEvent(humanInteractionEvent);
    
    return data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error sending response to HumanLayer:`, error);
    toast.error("Failed to send response to HumanLayer");
    throw error;
  }
}
