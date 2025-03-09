
import React, { useState } from "react";
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

interface HumanApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  query: string;
  callId: string;
  nodeId: string;
  approvalType: string;
  onApprove: (callId: string, nodeId: string) => void;
  onReject: (callId: string, nodeId: string, reason: string) => void;
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

  const handleApprove = () => {
    onApprove(callId, nodeId);
    onClose();
  };

  const handleStartReject = () => {
    setShowReasonInput(true);
  };

  const handleCancelReject = () => {
    setShowReasonInput(false);
    setRejectionReason("");
  };

  const handleConfirmReject = () => {
    onReject(callId, nodeId, rejectionReason);
    setShowReasonInput(false);
    setRejectionReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How would you like to proceed?</DialogTitle>
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
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={handleApprove}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
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
              <Button variant="outline" onClick={handleCancelReject}>
                Cancel
              </Button>
              <Button onClick={handleConfirmReject}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Submit Rejection
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HumanApprovalDialog;
