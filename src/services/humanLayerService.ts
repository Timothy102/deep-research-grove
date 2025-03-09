
// Creating a more browser-friendly implementation
// The humanlayer library might be expecting Node.js environment variables

// Mock implementation for browser environment
const createHumanLayerClient = () => {
  const apiKey = "hl-a-xg52uTvDVR_XQohWAXvz4cFjVIVve-DfCBSELw3KCK4";
  const apiUrl = "https://api.humanlayer.dev";

  // Simple implementation to work around CORS and process reference issues
  return {
    backend: {
      functions: () => ({
        respond: async (callId: string, status: any) => {
          try {
            const response = await fetch(`${apiUrl}/humanlayer/v1/agent/function_call/${callId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Origin': window.location.origin
              },
              body: JSON.stringify({
                status: {
                  approved: status.approved,
                  comment: status.comment,
                  requested_at: status.requested_at.toISOString()
                }
              })
            });
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
          } catch (error) {
            console.error("Error in respond function:", error);
            throw error;
          }
        }
      })
    }
  };
};

// Create our custom client instead of using the humanlayer library directly
const hl = createHumanLayerClient();

// Interface for function call status
interface FunctionCallStatus {
  approved: boolean;
  comment: string;
  requested_at: Date;
}

// Function to respond to approval requests
export async function respondToApproval(callId: string, approved: boolean, comment: string = "") {
  const status: FunctionCallStatus = {
    approved: approved,
    comment: comment,
    requested_at: new Date()
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
