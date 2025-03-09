
import { humanlayer } from 'humanlayer';

// Create the HumanLayer client
const hl = humanlayer({
  apiKey: "hl-a-xg52uTvDVR_XQohWAXvz4cFjVIVve-DfCBSELw3KCK4",
  verbose: true, // Optional for debugging
  runId: "approval-request" // Optional identifier
});

// Interface for function call status
interface FunctionCallStatus {
  approved: boolean;
  comment: string;
}

// Function to respond to approval requests
export async function respondToApproval(callId: string, approved: boolean, comment: string = "") {
  const status: FunctionCallStatus = {
    approved: approved,
    comment: comment
  };

  try {
    const response = await hl.backend?.functions().respond(callId, status);
    
    return {
      call_id: response?.call_id,
      approved: response?.status?.approved ?? null,
      comment: response?.status?.comment ?? null
    };
  } catch (error) {
    console.error("Error responding to approval:", error);
    throw error;
  }
}
