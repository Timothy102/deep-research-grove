
// HumanLayer service for handling human-in-the-loop interactions

const HUMANLAYER_API_KEY = "hl-a-xg52uTvDVR_XQohWAXvz4cFjVIVve-DfCBSELw3KCK4";

/**
 * Directly responds to an approval request using the HumanLayer API
 */
export const respondToApproval = async (callId: string, approved: boolean, comment: string = "") => {
  console.log(`[${new Date().toISOString()}] 📤 Sending response to HumanLayer:`, { 
    callId, 
    approved, 
    comment: comment.slice(0, 20) + (comment.length > 20 ? '...' : '') 
  });

  try {
    const response = await fetch(`https://api.humanlayer.dev/humanlayer/v1/agent/function_calls/${callId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUMANLAYER_API_KEY}`
      },
      body: JSON.stringify({
        approved,
        comment,
        user_info: {},
        slack_context: {},
        reject_option_name: null
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${new Date().toISOString()}] ❌ HumanLayer API error:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const responseData = await response.json();
    console.log(`[${new Date().toISOString()}] ✅ HumanLayer response success:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in HumanLayer response:`, error);
    throw error;
  }
};

/**
 * Gets the current status of a function call
 */
export const getApprovalStatus = async (callId: string) => {
  try {
    const response = await fetch(`https://api.humanlayer.dev/humanlayer/v1/agent/function_calls/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HUMANLAYER_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error getting approval status:", error);
    throw error;
  }
};
