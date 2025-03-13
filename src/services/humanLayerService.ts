
// This file can be simplified since we're now using direct API calls instead of the HumanLayer SDK

/**
 * Directly responds to an approval request using the Modal endpoint
 */
export const respondToApproval = async (callId: string, approved: boolean, comment: string = "") => {
  const response = await fetch('https://timothy102--vertical-deep-research-respond-to-approval.modal.run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      call_id: callId,
      approved,
      comment
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};
