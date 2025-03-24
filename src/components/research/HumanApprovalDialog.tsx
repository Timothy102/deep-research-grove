
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, MessageSquare, FileText, AlertTriangle, HelpCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { respondToApproval } from "@/services/humanLayerService";

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
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Show a persistent toast notification to draw user's attention
      toast(`Human input needed: ${approvalType}`, {
        id: `approval-${callId}`,
        duration: Infinity,
        icon: <HelpCircle className="h-5 w-5 text-blue-500" />,
        action: {
          label: "Review",
          onClick: () => {
            document.getElementById('human-approval-dialog')?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }
    
    console.log(`[${new Date().toISOString()}] 🔍 HumanApprovalDialog mounted with props:`, { 
      callId, 
      nodeId, 
      content: content?.substring(0, 50) + "...", 
      approvalType,
      isOpen
    });
    
    return () => {
      document.body.style.overflow = '';
      toast.dismiss(`approval-${callId}`);
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
        console.log(`[${new Date().toISOString()}] 📡 Using direct API call to HumanLayer`);
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
        console.log(`[${new Date().toISOString()}] 📡 Using direct API call to HumanLayer`);
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

  if (!isOpen && typeof isOpen !== 'undefined') return null;

  const getApprovalTypeLabel = () => {
    switch (approvalType) {
      case "synthesis":
      case "synthesizing":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
            Synthesis
          </Badge>
        );
      case "planning":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
            Planning
          </Badge>
        );
      case "searching":
        return (
          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800">
            Searching
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800">
            {approvalType}
          </Badge>
        );
    }
  };

  return (
    <div 
      id="human-approval-dialog"
      className="fixed inset-0 flex items-center justify-center z-[9999] p-4 overflow-hidden"
    >
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-semibold">
                Human Feedback Required
              </CardTitle>
            </div>
            {getApprovalTypeLabel()}
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            {approvalType === "synthesizing" 
              ? "Please review this research synthesis before proceeding" 
              : approvalType === "planning"
                ? "Please review this research plan before continuing"
                : approvalType === "searching"
                  ? "Please review these search results before continuing"
                  : "Your feedback is required to continue the research"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Research Objective</h4>
            <div className="text-sm p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
              {query}
            </div>
          </div>
          
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Content for Review</h4>
            <div className="text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-y-auto whitespace-pre-wrap border-l-2 border-primary/30 shadow-sm">
              {content}
            </div>
          </div>

          {showReasonInput && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200 pt-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
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
