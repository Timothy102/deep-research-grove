
// Creating a more browser-friendly implementation
// We're using a direct fetch implementation instead of the humanlayer library
// to avoid CORS and library compatibility issues

// Interface for function call status
interface FunctionCallStatus {
  approved: boolean;
  comment: string;
  requested_at: Date;
}

// Function to respond to approval requests
export async function respondToApproval(callId: string, approved: boolean, comment: string = "") {
  const apiKey = "hl-a-xg52uTvDVR_XQohWAXvz4cFjVIVve-DfCBSELw3KCK4";
  const apiUrl = "https://api.humanlayer.dev";

  const status: FunctionCallStatus = {
    approved: approved,
    comment: comment,
    requested_at: new Date()
  };

  try {
    // Using a direct fetch instead of the library to avoid CORS issues
    const response = await fetch(`${apiUrl}/humanlayer/v1/agent/function_call/${callId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // Removed 'Origin' header as it can cause CORS issues
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
    
    return {
      call_id: data?.call_id,
      approved: data?.status?.approved ?? null,
      comment: data?.status?.comment ?? null
    };
  } catch (error) {
    console.error("Error responding to approval:", error);
    throw error;
  }
}
