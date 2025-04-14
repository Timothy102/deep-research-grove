
import { useState, useEffect } from "react";

type ProgressIndicatorProps = {
  currentStage?: string;
  events?: string[];
  isLoading?: boolean;
  steps?: number;
  sources?: number;
  findings?: number;
};

export const ProgressIndicator = ({
  isLoading = true,
  currentStage = "Initializing",
  events = [],
  steps = 0,
  sources = 0,
  findings = 0,
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
      <div className="flex items-center">
        <div className="flex space-x-1 mr-2">
          <span className="loading-dot w-2 h-2 bg-primary/60 rounded-full animate-pulse"></span>
          <span className="loading-dot w-2 h-2 bg-primary/60 rounded-full animate-pulse delay-75"></span>
          <span className="loading-dot w-2 h-2 bg-primary/60 rounded-full animate-pulse delay-150"></span>
        </div>
        <p className="text-sm font-medium">{loadingText}</p>
      </div>
      
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Steps: {steps}</span>
        <span>Sources: {sources}</span>
        <span>Findings: {findings}</span>
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
