
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, MessageSquare, FileText } from "lucide-react";
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
  session?: any; // Added session prop to match usage in ResearchPage
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
  isOpen,
  session
}: HumanApprovalDialogProps) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scrolling when dialog is open
      document.body.style.overflow = 'hidden';
    }
    
    console.log(`[${new Date().toISOString()}] 🔍 HumanApprovalDialog mounted with props:`, { 
      callId, 
      nodeId, 
      content: content?.substring(0, 50) + "...", 
      approvalType,
      isOpen
    });
    
    // Cleanup function
    return () => {
      document.body.style.overflow = '';
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

  // Return null if dialog shouldn't be shown
  if (!isOpen && typeof isOpen !== 'undefined') return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 overflow-hidden">
      {/* Enhanced backdrop with blur effect */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <Card className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200 relative z-50 shadow-xl bg-white dark:bg-gray-900 overflow-hidden">
        <div className="absolute top-3 right-3">
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={onClose}
            aria-label="Close"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
        
        <CardHeader className="space-y-2 p-6 pb-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-semibold">
              {approvalType === "synthesis" ? "Review Synthesis" : "Approval Required"}
            </CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            {approvalType === "synthesis" 
              ? "Please review the synthesized content before proceeding" 
              : "Your approval is required to continue the research"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Query</h4>
            <div className="text-sm p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
              {session?.query || query}
            </div>
          </div>
          
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Content</h4>
            <div className="text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-y-auto whitespace-pre-wrap border-l-2 border-primary/30 shadow-sm">
              {content}
            </div>
          </div>

          {showReasonInput && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Reason for rejection
              </h4>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why you're rejecting this content..."
                className="resize-none w-full focus:ring-primary/30 min-h-[100px]"
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          {!showReasonInput ? (
            <>
              <Button
                variant="outline"
                className="w-full sm:w-auto bg-white hover:bg-red-50 hover:text-red-600 dark:bg-gray-800 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:border-gray-700"
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
              <Button 
                variant="outline" 
                onClick={handleCancelReject} 
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmReject} 
                disabled={isSubmitting || !rejectionReason.trim()}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
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
