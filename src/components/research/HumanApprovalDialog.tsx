
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HumanApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  query: string;
  callId: string;
  nodeId: string;
  approvalType: string;
  onApprove?: (callId: string, nodeId: string) => Promise<void>;
  onReject?: (callId: string, nodeId: string, reason: string) => Promise<void>;
}

const HumanApprovalDialog: React.FC<HumanApprovalDialogProps> = ({
  isOpen,
  onClose,
  content,
  query,
  callId,
  nodeId,
  approvalType,
  onApprove,
  onReject,
}) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Log when the dialog should show
  useEffect(() => {
    if (isOpen) {
      console.log("Dialog opened with props:", { callId, nodeId, content });
    }
  }, [isOpen, callId, nodeId, content]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      console.log("Approving content with callId:", callId);
      if (onApprove) {
        await onApprove(callId, nodeId);
      } else {
        await respondToApproval(callId, true);
      }
      toast({
        title: "Approved",
        description: "Content has been approved",
      });
      onClose();
    } catch (error) {
      console.error("Error approving content:", error);
      toast({
        title: "Error",
        description: "Failed to approve content",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartReject = () => {
    setShowReasonInput(true);
  };

  const handleCancelReject = () => {
    setShowReasonInput(false);
    setRejectionReason("");
  };

  const handleConfirmReject = async () => {
    setIsSubmitting(true);
    try {
      console.log("Rejecting content with callId:", callId);
      if (onReject) {
        await onReject(callId, nodeId, rejectionReason);
      } else {
        await respondToApproval(callId, false, rejectionReason);
      }
      toast({
        title: "Rejected",
        description: "Content has been rejected",
      });
      setShowReasonInput(false);
      setRejectionReason("");
      onClose();
    } catch (error) {
      console.error("Error rejecting content:", error);
      toast({
        title: "Rejection Error",
        description: "Failed to reject content",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to call the endpoint directly
  const respondToApproval = async (callId: string, approved: boolean, comment: string = "") => {
    console.log("Direct API call to approval endpoint with:", { callId, approved, comment });
    const response = await fetch('https://timothy102--vertical-deep-research-respond-to-approval.modal.run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        call_id: callId,
        approved: approved,
        comment: comment
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API response error:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  };

  console.log("Dialog props:", { isOpen, callId, nodeId, content, query });

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        console.log("Dialog open state changing to:", open);
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Human Approval Required</DialogTitle>
          <DialogDescription className="text-sm opacity-70">
            {approvalType === "synthesis" ? "Synthesis step requires approval" : "Human approval required"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
          <div className="mb-2">
            <h4 className="text-sm font-medium mb-1">Query</h4>
            <p className="text-sm p-2 bg-muted rounded-md">{query}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-1">Content to review</h4>
            <div className="text-sm p-3 bg-muted rounded-md max-h-[300px] overflow-y-auto whitespace-pre-wrap">
              {content}
            </div>
          </div>
        </div>

        {!showReasonInput ? (
          <DialogFooter className="flex sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleStartReject}
              disabled={isSubmitting}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleApprove}
              disabled={isSubmitting}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isSubmitting ? "Processing..." : "Approve"}
            </Button>
          </DialogFooter>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="rejection-reason" className="text-sm font-medium">
                Reason for rejection (optional)
              </label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why you're rejecting this content..."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelReject} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleConfirmReject} disabled={isSubmitting}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {isSubmitting ? "Processing..." : "Submit Rejection"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HumanApprovalDialog;
