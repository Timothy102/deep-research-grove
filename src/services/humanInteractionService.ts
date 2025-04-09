
// This is a stub service for human interaction
// Human interaction functionality has been removed

/**
 * Stub for submitting human feedback (functionality removed)
 */
export async function submitHumanFeedback(
  nodeId: string, 
  feedback: string, 
  interactionType: string, 
  sessionId: string
) {
  console.log(`[${new Date().toISOString()}] ℹ️ Human interaction disabled, no feedback submitted`);
  
  // Return a mock success response
  return { 
    success: true, 
    message: "Human interaction disabled" 
  };
}
