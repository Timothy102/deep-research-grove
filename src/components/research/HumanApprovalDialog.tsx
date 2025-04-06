
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { submitHumanFeedback } from "@/services/humanInteractionService";

export interface HumanApprovalDialogProps {
  isOpen: boolean;
  callId: string;
  nodeId: string;
  query: string;
  content: string;
  approvalType?: string;
  onApprove: (callId: string, nodeId: string) => Promise<void>;
  onReject: (callId: string, nodeId: string, reason: string) => Promise<void>;
  onClose: () => void;
}

const HumanApprovalDialog: React.FC<HumanApprovalDialogProps> = ({
  isOpen,
  callId,
  nodeId,
  query,
  content,
  approvalType = 'approval',
  onApprove,
  onReject,
  onClose
}) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      // Submit feedback directly using our internal service
      await submitHumanFeedback(nodeId, "Approved", "approve", callId);
      await onApprove(callId, nodeId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (showRejectionInput) {
      setIsSubmitting(true);
      try {
        // Submit feedback with rejection reason
        await submitHumanFeedback(nodeId, rejectionReason, "reject", callId);
        await onReject(callId, nodeId, rejectionReason);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setShowRejectionInput(true);
    }
  };

  const handleCancel = () => {
    if (showRejectionInput) {
      setShowRejectionInput(false);
      setRejectionReason("");
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {approvalType === 'planning' ? 'Research Planning' : 
             approvalType === 'searching' ? 'Search Strategy' : 
             approvalType === 'synthesizing' ? 'Research Synthesis' : 
             'Human Approval Needed'}
          </DialogTitle>
          <DialogDescription>
            {approvalType === 'planning' ? 'Review the research plan and provide feedback' : 
             approvalType === 'searching' ? 'Review the search strategy and provide feedback' : 
             approvalType === 'synthesizing' ? 'Review the synthesis and provide feedback' : 
             'Please review the AI\'s work and provide feedback'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Research Objective</h4>
            <div className="rounded-md bg-muted p-3 text-sm">{query}</div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {approvalType === 'planning' ? 'Proposed Research Plan' : 
               approvalType === 'searching' ? 'Search Strategy' : 
               approvalType === 'synthesizing' ? 'Initial Synthesis' : 
               'Content for Review'}
            </h4>
            <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{content}</div>
          </div>
          
          {showRejectionInput && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Feedback</h4>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide feedback on why this isn't acceptable and what could be improved..."
                className="resize-none"
                rows={4}
              />
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-end items-center gap-2">
          {showRejectionInput ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>Submit Feedback</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting}
              >
                <ThumbsDown className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                variant="default"
                onClick={handleApprove}
                className="bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HumanApprovalDialog;
