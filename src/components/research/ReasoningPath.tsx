
import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Search, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Finding {
  source: string;
  content?: string;
}

interface ReasoningStepProps {
  step: string;
  index: number;
  sources?: string[];
  findings?: Finding[];
  defaultExpanded?: boolean;
}

const getStepType = (step: string): { type: string; color: string } => {
  if (step.toLowerCase().includes("research objective")) {
    return { type: "objective", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" };
  } else if (step.toLowerCase().includes("processing:")) {
    return { type: "processing", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" };
  } else if (step.toLowerCase().includes("exploring:")) {
    return { type: "exploring", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" };
  } else if (step.toLowerCase().includes("searching")) {
    return { type: "searching", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" };
  } else if (step.toLowerCase().includes("reading")) {
    return { type: "reading", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300" };
  } else {
    return { type: "step", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" };
  }
};

const getStepIcon = (step: string) => {
  if (step.toLowerCase().includes("planning")) {
    return <Clock className="h-4 w-4 text-blue-500" />;
  } else if (step.toLowerCase().includes("searching")) {
    return <Search className="h-4 w-4 text-amber-500" />;
  } else if (step.toLowerCase().includes("completed")) {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  } else {
    return <ArrowRight className="h-4 w-4" />;
  }
};

// Enhanced function to find relevant sources and findings for a step
const findRelevantSources = (
  step: string, 
  sources: string[], 
  findings: Finding[] = []
): { sourceIndex: number, source: string, content?: string }[] => {
  if ((!sources || sources.length === 0) && (!findings || findings.length === 0)) return [];
  
  const relevantSources: { sourceIndex: number, source: string, content?: string }[] = [];
  
  // Look for explicit source references like [1], [2], etc.
  const refMatches = step.match(/\[(\d+)\]|\((\d+)\)/g);
  if (refMatches) {
    refMatches.forEach(match => {
      const num = parseInt(match.replace(/[\[\]\(\)]/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        // Check in findings first
        const finding = findings.find((_, index) => index === num - 1);
        if (finding) {
          relevantSources.push({ 
            sourceIndex: num, 
            source: finding.source,
            content: finding.content 
          });
        } 
        // Then check in sources
        else if (num <= sources.length) {
          relevantSources.push({ sourceIndex: num, source: sources[num-1] });
        }
      }
    });
  }
  
  // For "searching" steps, include all findings and sources
  if (step.toLowerCase().includes("searching")) {
    // First add any findings
    findings.forEach((finding, index) => {
      relevantSources.push({ 
        sourceIndex: index + 1, 
        source: finding.source,
        content: finding.content
      });
    });
    
    // Then add any sources that aren't already included
    sources.forEach((source, index) => {
      if (!relevantSources.some(item => item.source === source)) {
        relevantSources.push({ sourceIndex: index + 1, source });
      }
    });
    
    return relevantSources;
  }
  
  // If no explicit references found and it's not a searching step,
  // try to find sources by matching step content with URLs
  if (relevantSources.length === 0) {
    // Extract keywords from the step
    const stepText = step.toLowerCase();
    
    // Check findings first
    findings.forEach((finding, index) => {
      const sourceUrl = finding.source.toLowerCase();
      // Extract domain name for matching
      const urlParts = sourceUrl.replace(/https?:\/\//, '').split('/')[0].split('.');
      const domain = urlParts.length > 1 ? urlParts[urlParts.length - 2] : '';
      
      if (domain && stepText.includes(domain)) {
        relevantSources.push({ 
          sourceIndex: index + 1, 
          source: finding.source,
          content: finding.content
        });
      }
    });
    
    // Then check regular sources
    sources.forEach((source, index) => {
      if (!relevantSources.some(item => item.source === source)) {
        const sourceUrl = source.toLowerCase();
        const urlParts = sourceUrl.replace(/https?:\/\//, '').split('/')[0].split('.');
        const domain = urlParts.length > 1 ? urlParts[urlParts.length - 2] : '';
        
        if (domain && stepText.includes(domain)) {
          relevantSources.push({ sourceIndex: index + 1, source });
        }
      }
    });
  }
  
  return relevantSources;
};

const ReasoningStep = ({ step, index, sources = [], findings = [], defaultExpanded = false }: ReasoningStepProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded || index === 0);
  const { type, color } = getStepType(step);
  const stepIcon = getStepIcon(step);
  
  // Find relevant sources and findings for this step
  const relevantSources = findRelevantSources(step, sources, findings);
  
  // Extract status from step text if present
  let formattedStep = step;
  let statusBadge = null;
  
  const planningMatch = step.match(/planning/i);
  if (planningMatch) {
    statusBadge = (
      <Badge variant="outline" className="font-normal">
        <Clock className="h-4 w-4 mr-1 text-blue-500" />
        <span>planning</span>
      </Badge>
    );
  }

  // Remove redundant type prefixes for cleaner display
  if (type === "processing" || type === "exploring") {
    formattedStep = formattedStep.replace(/^(Processing|Exploring):\s*/i, "");
  }

  return (
    <div className="mb-3 animate-fade-in">
      <div 
        className={cn(
          "flex items-start space-x-2 p-3 rounded-md border transition-all duration-200",
          expanded ? "shadow-sm" : "hover:bg-gray-50 dark:hover:bg-gray-900"
        )}
        role="button"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center mt-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 shrink-0"
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
          
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium">{index + 1}</span>
          </div>
        </div>
        
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={cn("font-normal", color)}>
              {type}
            </Badge>
            
            {statusBadge}
          </div>
          
          <p className="text-sm">{formattedStep}</p>
        </div>
      </div>
      
      {expanded && (
        <div className="ml-11 mt-2 space-y-2 border-l-2 pl-4 border-gray-200 dark:border-gray-800">
          {/* Detailed information for the step */}
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">{formattedStep}</p>
          </div>
          
          {/* Show sources section if any relevant sources exist */}
          {relevantSources.length > 0 && (
            <div className="space-y-2 mt-3">
              <h4 className="text-xs font-medium text-muted-foreground">Related Sources & Findings:</h4>
              <div className="space-y-2">
                {relevantSources.map(({ sourceIndex, source, content }, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 bg-muted rounded-md">
                    <span className="inline-block mt-0.5 w-5 h-5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-[10px] shrink-0">
                      {sourceIndex}
                    </span>
                    <div className="flex-1 overflow-hidden">
                      <a 
                        href={source} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline truncate block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {source}
                      </a>
                      {content && (
                        <div className="mt-1 text-muted-foreground text-xs bg-muted-foreground/5 p-1.5 rounded border border-muted-foreground/10">
                          {content}
                        </div>
                      )}
                    </div>
                    <a
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
              
              {/* Display search queries if this is a searching step */}
              {type === "searching" && (
                <div className="mt-3 space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Search Queries:</h4>
                  <div className="flex flex-wrap gap-2">
                    {step.split("\n").filter(line => line.trim().length > 0 && !line.includes("Searching")).map((line, i) => (
                      <Badge key={i} variant="outline" className="bg-muted flex items-center gap-1.5 py-1.5 px-2.5">
                        <Search className="h-3 w-3" />
                        <span className="text-xs">{line.trim()}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ReasoningPath = ({ reasoningPath, sources = [], findings = [] }: { 
  reasoningPath: string[], 
  sources?: string[],
  findings?: Finding[]
}) => {
  if (!reasoningPath.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No reasoning path available yet.</p>
      </div>
    );
  }

  // Improved logic to deduplicate steps and avoid repetition
  const groupedSteps: string[] = [];
  let lastType = "";
  let lastStepContent = "";
  
  reasoningPath.forEach((step) => {
    const currentType = getStepType(step).type;
    
    // Extract step content without the type prefix
    const currentStepContent = step.replace(/^(Processing|Exploring):\s*/i, "").trim();
    
    // Check for duplicates with a much stricter rule
    if ((currentType === "processing" || currentType === "exploring") &&
        (lastType === "processing" || lastType === "exploring")) {
      // Don't add if it's similar content
      if (currentStepContent === lastStepContent) {
        return; // Skip this step
      }
      
      // Don't add consecutive steps of the same type
      if (currentType === lastType) {
        return; // Skip this step
      }
    }
    
    // Add the step to our filtered list
    groupedSteps.push(step);
    lastType = currentType;
    lastStepContent = currentStepContent;
  });

  return (
    <div className="space-y-1">
      {groupedSteps.map((step, index) => (
        <ReasoningStep 
          key={index} 
          step={step} 
          index={index} 
          sources={sources}
          findings={findings}
          defaultExpanded={index === 0} // First item is expanded by default
        />
      ))}
    </div>
  );
};

export default ReasoningPath;
