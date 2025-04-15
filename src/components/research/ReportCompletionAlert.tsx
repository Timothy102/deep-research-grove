
import React from "react";
import { CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReportCompletionAlertProps {
  isVisible: boolean;
  onClick: () => void;
  onClose: () => void;
}

const ReportCompletionAlert = ({ isVisible, onClick, onClose }: ReportCompletionAlertProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
      <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <div className="ml-3 w-0 flex-1">
            <h3 className="text-sm font-medium text-green-800">Research report is ready</h3>
            <p className="mt-1 text-sm text-green-700">
              Your complete research report is now available
            </p>
            <div className="mt-3 flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white text-green-700 border-green-300 hover:bg-green-50"
                onClick={onClick}
              >
                <span>View report</span>
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-green-700 hover:bg-green-100"
                onClick={onClose}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCompletionAlert;
