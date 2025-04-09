
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// This is a stub component as human approval functionality has been removed
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
  onClose
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Human Interaction Disabled</DialogTitle>
          <DialogDescription>
            Human interaction functionality has been removed from this application.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HumanApprovalDialog;
