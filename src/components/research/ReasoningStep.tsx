
import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ReasoningStepProps {
  step: string;
  index: number;
  sources?: string[];
  findings?: Array<{ source: string; content?: string; finding?: any }>;
  defaultExpanded?: boolean;
  isActive?: boolean;
  rawData?: string;
  sessionId?: string;
  answer?: any;
  className?: string; // Added className prop to the interface
}

const ReasoningStep = ({ 
  step, 
  index, 
  sources = [], 
  findings = [], 
  defaultExpanded = false,
  isActive = false,
  rawData,
  sessionId,
  answer,
  className
}: ReasoningStepProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Extract type of step for styling
  const getStepType = () => {
    const stepLower = step.toLowerCase();
    if (stepLower.includes("search")) return "search";
    if (stepLower.includes("read")) return "read";
    if (stepLower.includes("synthe")) return "synthesis";
    if (stepLower.includes("reason")) return "reasoning";
    if (stepLower.includes("plan")) return "planning";
    return "default";
  };
  
  const stepType = getStepType();
  
  // Styling based on step type
  const getStepColor = () => {
    switch (stepType) {
      case "search":
        return "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40";
      case "read":
        return "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/40";
      case "synthesis":
        return "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/40";
      case "reasoning":
        return "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40";
      case "planning":
        return "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40";
      default:
        return "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40";
    }
  };
  
  const relevantFindings = findings.filter(finding => {
    // Basic relevance check
    return sources.includes(finding.source);
  });
  
  return (
    <div 
      className={cn(
        "rounded-lg border p-4 shadow-sm transition-all duration-200",
        getStepColor(),
        isActive && "ring-2 ring-primary/20 shadow-md",
        isExpanded ? "mb-4" : "mb-2",
        className
      )}
    >
      <div 
        className="flex items-start cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-0 h-5 w-5 mr-2 hover:bg-transparent"
        >
          {isExpanded ? 
            <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          }
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary mr-2">
              Step {index + 1}
            </span>
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary capitalize">
              {stepType}
            </span>
          </div>
          <p className="mt-1 text-sm">{step}</p>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 pl-7 space-y-4 text-sm animate-in fade-in duration-200">
          {answer && (
            <div className="p-3 rounded-md bg-background/80 border border-muted">
              <h4 className="font-medium text-xs uppercase text-muted-foreground mb-1">Answer</h4>
              <p className="whitespace-pre-wrap">{answer}</p>
            </div>
          )}
          
          {relevantFindings.length > 0 && (
            <div>
              <h4 className="font-medium text-xs uppercase text-muted-foreground mb-2">Findings</h4>
              <div className="space-y-2">
                {relevantFindings.map((finding, i) => (
                  <div key={i} className="p-3 rounded-md bg-background/80 border border-muted">
                    <div className="flex justify-between items-start">
                      <h5 className="font-medium text-xs truncate flex-1">
                        {finding.finding?.title || finding.source}
                      </h5>
                      {finding.source && finding.source.startsWith('http') && (
                        <a 
                          href={finding.source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {finding.content || finding.finding?.summary || "No content available"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {rawData && (
            <div className="mt-2">
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Raw Data
                </summary>
                <pre className="mt-2 p-2 rounded bg-muted/50 overflow-auto max-h-[200px] text-[10px]">
                  {rawData}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReasoningStep;
