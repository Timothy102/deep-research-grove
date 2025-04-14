
import { useState, useCallback } from 'react';
import { submitHumanFeedback } from "@/services/humanInteractionService";
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/use-analytics";

export interface HumanApprovalRequest {
  call_id: string;
  node_id: string;
  query: string;
  content: string;
  approval_type: string;
  interaction_type?: "planning" | "searching" | "synthesizing";
}

interface UseHumanApprovalProps {
  currentSessionIdRef: React.MutableRefObject<string | null>;
  researchIdRef: React.MutableRefObject<string | null>;
}

export const useHumanApproval = ({ currentSessionIdRef, researchIdRef }: UseHumanApprovalProps) => {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [humanApprovalRequest, setHumanApprovalRequest] = useState<HumanApprovalRequest | null>(null);
  const { trackEvent } = useAnalytics();

  const handleApprovalAction = useCallback(async (approved: boolean, comment?: string) => {
    if (!humanApprovalRequest || !currentSessionIdRef.current || !researchIdRef.current) return;
    
    try {
      await submitHumanFeedback({
        call_id: humanApprovalRequest.call_id,
        node_id: humanApprovalRequest.node_id,
        approved,
        comment,
        query: humanApprovalRequest.query,
        session_id: currentSessionIdRef.current,
        research_id: researchIdRef.current,
        approval_type: humanApprovalRequest.approval_type
      });
      
      setShowApprovalDialog(false);
      setHumanApprovalRequest(null);
      
      if (approved) {
        toast.success("Approved! Research will continue.");
      } else {
        toast.info("Research step rejected.");
      }
      
      trackEvent('human_approval_action', {
        approved,
        has_comment: !!comment,
        approval_type: humanApprovalRequest.approval_type
      });
      
    } catch (error) {
      console.error("Error submitting approval action:", error);
      toast.error("Error submitting approval");
    }
  }, [humanApprovalRequest, currentSessionIdRef, researchIdRef, trackEvent]);
  
  return {
    showApprovalDialog,
    setShowApprovalDialog,
    humanApprovalRequest,
    setHumanApprovalRequest,
    handleApprovalAction
  };
};
