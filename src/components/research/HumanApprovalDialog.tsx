
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

interface HumanApprovalDialogProps {
  content: string;
  query: string;
  callId: string;
  nodeId: string;
  approvalType: string;
  onClose: () => void;
  onApprove?: (callId: string, nodeId: string) => Promise<void>;
  onReject?: (callId: string, nodeId: string, reason: string) => Promise<void>;
  isOpen?: boolean;
}

const HumanApprovalDialog = ({
  content,
  query,
  callId,
  nodeId,
  approvalType,
  onClose,
  onApprove,
  onReject
}: HumanApprovalDialogProps) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log("HumanApprovalDialog rendered with props:", { callId, nodeId, content });

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      console.log("Approving content with callId:", callId);
      if (onApprove) {
        await onApprove(callId, nodeId);
      } else {
        await respondToApproval(callId, true);
      }
      toast.success("Content has been approved");
    } catch (error) {
      console.error("Error approving content:", error);
      toast.error("Failed to approve content");
    } finally {
      setIsSubmitting(false);
      toast.dismiss(`approval-${callId}`);
      onClose();
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
      toast.success("Content has been rejected");
    } catch (error) {
      console.error("Error rejecting content:", error);
      toast.error("Failed to reject content");
    } finally {
      setIsSubmitting(false);
      setShowReasonInput(false);
      setRejectionReason("");
      toast.dismiss(`approval-${callId}`);
      onClose();
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{approvalType === "synthesis" ? "Synthesis Approval" : "Human Approval Required"}</CardTitle>
        <CardDescription>
          {approvalType === "synthesis" ? "Synthesis step requires approval" : "Human approval required"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-1">Query</h4>
          <p className="text-sm p-2 bg-muted rounded-md">{query}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-1">Content to review</h4>
          <div className="text-sm p-3 bg-muted rounded-md max-h-[200px] overflow-y-auto whitespace-pre-wrap">
            {content}
          </div>
        </div>

        {showReasonInput && (
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
        )}
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row gap-2">
        {!showReasonInput ? (
          <>
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
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleCancelReject} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReject} disabled={isSubmitting}>
              <MessageSquare className="mr-2 h-4 w-4" />
              {isSubmitting ? "Processing..." : "Submit Rejection"}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default HumanApprovalDialog;
