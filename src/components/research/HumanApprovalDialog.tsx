
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

export interface HumanApprovalRequest {
  call_id: string;
  node_id: string;
  query: string;
  content: string;
  approval_type: string;
  interaction_type?: "planning" | "searching" | "synthesizing";
}

export interface HumanApprovalDialogProps {
  isOpen: boolean;
  request?: HumanApprovalRequest;
  callId?: string;
  nodeId?: string;
  query?: string;
  content?: string;
  approvalType?: string;
  onApprove?: (callId: string, nodeId: string) => Promise<void>;
  onReject?: (callId: string, nodeId: string, reason: string) => Promise<void>;
  onAction?: (approved: boolean, comment?: string) => Promise<void>;
  onClose: () => void;
}

const HumanApprovalDialog: React.FC<HumanApprovalDialogProps> = ({
  isOpen,
  request,
  callId,
  nodeId,
  query,
  content,
  approvalType = 'approval',
  onApprove,
  onReject,
  onAction,
  onClose
}) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectionInput, setShowRejectionInput] = useState(false);

  // Use request object if provided, otherwise use individual props
  const effectiveCallId = request?.call_id || callId || '';
  const effectiveNodeId = request?.node_id || nodeId || '';
  const effectiveQuery = request?.query || query || '';
  const effectiveContent = request?.content || content || '';
  const effectiveApprovalType = request?.approval_type || approvalType;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      if (onAction) {
        await onAction(true);
      } else if (onApprove) {
        await onApprove(effectiveCallId, effectiveNodeId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (showRejectionInput) {
      setIsSubmitting(true);
      try {
        if (onAction) {
          await onAction(false, rejectionReason);
        } else if (onReject) {
          await onReject(effectiveCallId, effectiveNodeId, rejectionReason);
        }
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
            {effectiveApprovalType === 'planning' ? 'Research Planning' : 
             effectiveApprovalType === 'searching' ? 'Search Strategy' : 
             effectiveApprovalType === 'synthesizing' ? 'Research Synthesis' : 
             'Human Approval Needed'}
          </DialogTitle>
          <DialogDescription>
            {effectiveApprovalType === 'planning' ? 'Review the research plan and provide feedback' : 
             effectiveApprovalType === 'searching' ? 'Review the search strategy and provide feedback' : 
             effectiveApprovalType === 'synthesizing' ? 'Review the synthesis and provide feedback' : 
             'Please review the AI\'s work and provide feedback'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Research Objective</h4>
            <div className="rounded-md bg-muted p-3 text-sm">{effectiveQuery}</div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              {effectiveApprovalType === 'planning' ? 'Proposed Research Plan' : 
               effectiveApprovalType === 'searching' ? 'Search Strategy' : 
               effectiveApprovalType === 'synthesizing' ? 'Initial Synthesis' : 
               'Content for Review'}
            </h4>
            <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{effectiveContent}</div>
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
