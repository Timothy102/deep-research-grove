
import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Search, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReasoningStepProps {
  step: string;
  index: number;
  sources?: string[];
}

const getStepType = (step: string): { type: string; color: string } => {
  if (step.toLowerCase().includes("research objective")) {
    return { type: "objective", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" };
  } else if (step.toLowerCase().includes("processing:")) {
    return { type: "processing", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" };
  } else if (step.toLowerCase().includes("exploring:")) {
    return { type: "exploring", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" };
  } else {
    return { type: "step", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" };
  }
};

const getStepIcon = (step: string) => {
  if (step.toLowerCase().includes("status: searching")) {
    return <Search className="h-4 w-4 text-amber-500" />;
  } else if (step.toLowerCase().includes("status: planning")) {
    return <Clock className="h-4 w-4 text-blue-500" />;
  } else if (step.toLowerCase().includes("status: completed")) {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  } else {
    return <ArrowRight className="h-4 w-4" />;
  }
};

const getSourceNumber = (source: string, step: string): number | null => {
  // Extract numbers from the step that might indicate source references
  const matches = step.match(/\[(\d+)\]|\((\d+)\)/g);
  if (!matches) return null;
  
  // Return the first number found
  const firstMatch = matches[0].replace(/[\[\]\(\)]/g, '');
  return parseInt(firstMatch, 10);
};

const ReasoningStep = ({ step, index, sources = [] }: ReasoningStepProps) => {
  const [expanded, setExpanded] = useState(index === 0);
  const { type, color } = getStepType(step);
  const stepIcon = getStepIcon(step);
  
  // Extract potential source references
  const relevantSources = sources.filter((_, i) => {
    const sourceNum = getSourceNumber(sources[i], step);
    return sourceNum !== null;
  });

  // Format the step to highlight status
  let formattedStep = step;
  const statusMatch = step.match(/\(Status: ([^)]+)\)/i);
  if (statusMatch) {
    formattedStep = step.replace(
      /\(Status: ([^)]+)\)/i, 
      ''
    ).trim();
  }

  return (
    <div className="mb-3 animate-in">
      <div 
        className={cn(
          "flex items-start space-x-2 p-3 rounded-md border transition-all duration-200",
          expanded ? "shadow-sm" : "hover:bg-gray-50 dark:hover:bg-gray-900"
        )}
        role="button"
        onClick={() => setExpanded(!expanded)}
      >
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 shrink-0 mt-0.5"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? 
            <ChevronDown className="h-4 w-4" /> : 
            <ChevronRight className="h-4 w-4" />
          }
        </Button>
        
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium">{index + 1}</span>
            </div>
            
            <Badge className={cn("font-normal", color)}>
              {type}
            </Badge>
            
            {statusMatch && (
              <Badge variant="outline" className="font-normal">
                {stepIcon}
                <span className="ml-1">{statusMatch[1]}</span>
              </Badge>
            )}
          </div>
          
          <p className="text-sm">{formattedStep}</p>
        </div>
      </div>
      
      {expanded && relevantSources.length > 0 && (
        <div className="ml-11 mt-2 space-y-2 border-l-2 pl-4 border-gray-200 dark:border-gray-800">
          <h4 className="text-xs font-medium text-muted-foreground">Related Sources:</h4>
          {relevantSources.map((source, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="inline-block w-4 h-4 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-[10px]">
                {getSourceNumber(source, step) || i+1}
              </span>
              <a 
                href={source} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 text-blue-600 dark:text-blue-400 hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {source}
              </a>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ReasoningPath = ({ reasoningPath, sources = [] }: { reasoningPath: string[], sources?: string[] }) => {
  if (!reasoningPath.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No reasoning path available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {reasoningPath.map((step, index) => (
        <ReasoningStep 
          key={index} 
          step={step} 
          index={index} 
          sources={sources} 
        />
      ))}
    </div>
  );
};

export default ReasoningPath;
