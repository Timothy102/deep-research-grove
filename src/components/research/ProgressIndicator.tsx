
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

type ProgressIndicatorProps = {
  isLoading: boolean;
  currentStage?: string;
  events?: string[];
  onShowReport?: () => void;
  hasReportUpdates?: boolean;
};

export const ProgressIndicator = ({
  isLoading,
  currentStage = "Initializing",
  events = [],
  onShowReport,
  hasReportUpdates = false,
}: ProgressIndicatorProps) => {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 500);
    
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  const loadingText = `${currentStage}${".".repeat(dots)}`;

  return (
    <div className="p-4 rounded-md bg-primary/5 border border-primary/10 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex space-x-1 mr-2">
            <span className="loading-dot w-2 h-2 bg-primary/60 rounded-full animate-pulse"></span>
            <span className="loading-dot w-2 h-2 bg-primary/60 rounded-full animate-pulse delay-75"></span>
            <span className="loading-dot w-2 h-2 bg-primary/60 rounded-full animate-pulse delay-150"></span>
          </div>
          <p className="text-sm font-medium">{loadingText}</p>
        </div>
        
        {onShowReport && hasReportUpdates && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20"
            onClick={onShowReport}
          >
            <FileText className="h-3 w-3" />
            <span>View Report</span>
          </Button>
        )}
      </div>
      
      {events.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-primary/20">
          <ul className="space-y-1 text-xs text-muted-foreground">
            {events.slice(-3).map((event, i) => (
              <li key={i} className="animate-fade-in">{event}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
