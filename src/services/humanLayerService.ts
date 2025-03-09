
import { createClient } from 'humanlayer';

// Create the HumanLayer client
const hlClient = createClient({
  apiKey: "hl-a-xg52uTvDVR_XQohWAXvz4cFjVIVve-DfCBSELw3KCK4",
  verbose: true, // Optional for debugging
  runId: "approval-request" // Optional identifier
});

// Function to respond to approval requests
export async function respondToApproval(callId: string, approved: boolean, comment: string = "") {
  try {
    const response = await hlClient.backend?.functions().respond(callId, {
      approved: approved,
      comment: comment
    });
    
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
