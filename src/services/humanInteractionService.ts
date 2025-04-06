
// Human interaction service for submitting feedback to the research backend

const HUMAN_INTERACTION_URL = 'https://timothy102--vertical-deep-research-human-interaction.modal.run';

/**
 * Submit human feedback for a specific node in the reasoning process
 */
export async function submitHumanFeedback(
  nodeId: string, 
  feedback: string, 
  interactionType: string, 
  sessionId: string
) {
  try {
    console.log(`[${new Date().toISOString()}] 📤 Submitting human feedback:`, {
      nodeId,
      interactionType,
      sessionId,
      feedbackLength: feedback.length
    });

    const response = await fetch(HUMAN_INTERACTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        node_id: nodeId,
        feedback: feedback,
        interaction_type: interactionType,
        session_id: sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[${new Date().toISOString()}] ✅ Human feedback submitted successfully:`, data);
    return data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error submitting human feedback:`, error);
    // Unlike before, don't throw the error - we want to gracefully handle failures
    // Just log it and return a basic response
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
