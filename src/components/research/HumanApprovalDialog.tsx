
import React, { useState, useEffect } from "react";
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
  onReject,
  isOpen
}: HumanApprovalDialogProps) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log(`[${new Date().toISOString()}] 🔍 HumanApprovalDialog mounted with props:`, { 
      callId, 
      nodeId, 
      content: content?.substring(0, 50) + "...", 
      approvalType,
      isOpen
    });
    
    // Log when the component renders
    return () => {
      console.log(`[${new Date().toISOString()}] 🧹 HumanApprovalDialog unmounting for callId:`, callId);
    };
  }, [callId, nodeId, content, approvalType, isOpen]);

  const handleApprove = async () => {
    console.log(`[${new Date().toISOString()}] 👍 Approve button clicked for callId:`, callId);
    setIsSubmitting(true);
    try {
      console.log(`[${new Date().toISOString()}] 🚀 Starting approval process for callId:`, callId);
      if (onApprove) {
        console.log(`[${new Date().toISOString()}] 📞 Using provided onApprove callback`);
        await onApprove(callId, nodeId);
      } else {
        console.log(`[${new Date().toISOString()}] 📡 Using direct API call to approval endpoint`);
        await respondToApproval(callId, true);
      }
      console.log(`[${new Date().toISOString()}] ✅ Approval successful`);
      toast.success("Content has been approved");
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error approving content:`, error);
      toast.error("Failed to approve content");
    } finally {
      console.log(`[${new Date().toISOString()}] 🏁 Approval process complete, closing dialog`);
      setIsSubmitting(false);
      toast.dismiss(`approval-${callId}`);
      onClose();
    }
  };

  const handleStartReject = () => {
    console.log(`[${new Date().toISOString()}] 👎 Starting rejection process, showing reason input`);
    setShowReasonInput(true);
  };

  const handleCancelReject = () => {
    console.log(`[${new Date().toISOString()}] 🔙 Canceling rejection`);
    setShowReasonInput(false);
    setRejectionReason("");
  };

  const handleConfirmReject = async () => {
    console.log(`[${new Date().toISOString()}] 👎 Confirm reject button clicked for callId:`, callId);
    setIsSubmitting(true);
    try {
      console.log(`[${new Date().toISOString()}] 🚀 Rejecting content with callId:`, callId, "Reason:", rejectionReason);
      if (onReject) {
        console.log(`[${new Date().toISOString()}] 📞 Using provided onReject callback`);
        await onReject(callId, nodeId, rejectionReason);
      } else {
        console.log(`[${new Date().toISOString()}] 📡 Using direct API call to approval endpoint`);
        await respondToApproval(callId, false, rejectionReason);
      }
      console.log(`[${new Date().toISOString()}] ✅ Rejection successful`);
      toast.success("Content has been rejected");
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error rejecting content:`, error);
      toast.error("Failed to reject content");
    } finally {
      console.log(`[${new Date().toISOString()}] 🏁 Rejection process complete, closing dialog`);
      setIsSubmitting(false);
      setShowReasonInput(false);
      setRejectionReason("");
      toast.dismiss(`approval-${callId}`);
      onClose();
    }
  };

  // Function to call the endpoint directly with body parameters
  const respondToApproval = async (callId: string, approved: boolean, comment: string = "") => {
    console.log(`[${new Date().toISOString()}] 📤 Making POST request to approval endpoint with body:`, { call_id: callId, approved, comment });
    
    try {
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
      
      console.log(`[${new Date().toISOString()}] 📥 API response status:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${new Date().toISOString()}] ❌ API response error:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log(`[${new Date().toISOString()}] 📦 API response data:`, responseData);
      return responseData;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in respondToApproval:`, error);
      throw error;
    }
  };

  console.log(`[${new Date().toISOString()}] 🔄 Rendering HumanApprovalDialog with state:`, { 
    showReasonInput, 
    isSubmitting, 
    hasRejectionReason: !!rejectionReason,
    callId,
    approvalType
  });

  // Adding a fixed positioning wrapper to center the dialog
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl mx-auto shadow-lg animate-in fade-in slide-in-from-bottom-8 duration-300 border-0 sm:border">
        <CardHeader className="px-6 pt-6 pb-4 bg-muted/30">
          <CardTitle className="text-xl">
            {approvalType === "synthesis" ? "Review Synthesis" : "Review Required"}
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            {approvalType === "synthesis" 
              ? "Please review the synthesized content before proceeding" 
              : "Your approval is required to continue the research"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-4 space-y-5">
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">QUERY</h4>
            <p className="text-sm p-3 bg-muted rounded-md">{query}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">CONTENT</h4>
            <div className="text-sm p-4 bg-muted rounded-md max-h-[250px] overflow-y-auto whitespace-pre-wrap border-l-2 border-primary/20">
              {content}
            </div>
          </div>

          {showReasonInput && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label htmlFor="rejection-reason" className="text-sm font-medium block mb-2 text-muted-foreground">
                Reason for rejection (optional)
              </label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why you're rejecting this content..."
                className="resize-none"
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 p-6 pt-2 bg-muted/20">
          {!showReasonInput ? (
            <>
              <Button
                variant="outline"
                className="w-full sm:w-auto border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-300"
                onClick={handleStartReject}
                disabled={isSubmitting}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
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
              <Button 
                onClick={handleConfirmReject} 
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {isSubmitting ? "Processing..." : "Submit Rejection"}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default HumanApprovalDialog;
