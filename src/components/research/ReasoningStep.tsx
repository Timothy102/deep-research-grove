
import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, BookOpen, FileText, Search, Lightbulb, PenTool, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface ReasoningStepProps {
  step: string;
  index: number;
  sources?: string[];
  findings?: Array<{ 
    source: string; 
    content?: string; 
    finding?: any;
    node_id?: string;
    query?: string;
    raw_data?: string; 
  }>;
  defaultExpanded?: boolean;
  isActive?: boolean;
  rawData?: string;
  sessionId?: string;
  answer?: any;
  synthesis?: any;
  className?: string;
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
  synthesis,
  className
}: ReasoningStepProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [areFindingsExpanded, setAreFindingsExpanded] = useState(true);
  
  // Extract type of step for styling
  const getStepType = () => {
    const stepLower = step.toLowerCase();
    if (stepLower.includes("search")) return "search";
    if (stepLower.includes("read")) return "read";
    if (stepLower.includes("synthe")) return "synthesis";
    if (stepLower.includes("reason")) return "reasoning";
    if (stepLower.includes("plan")) return "planning";
    if (stepLower.includes("explor")) return "exploring";
    if (stepLower.includes("process")) return "processing";
    if (stepLower.includes("list")) return "listing";
    if (stepLower.includes("analyzing")) return "analyzing";
    return "default";
  };
  
  const stepType = getStepType();
  
  // Styling based on step type - enhanced with more vibrant colors
  const getStepColor = () => {
    switch (stepType) {
      case "search":
        return "border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40";
      case "read":
        return "border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950/40";
      case "synthesis":
        return "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40";
      case "reasoning":
        return "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40";
      case "planning":
        return "border-sky-400 dark:border-sky-600 bg-sky-50 dark:bg-sky-950/40";
      case "exploring":
        return "border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/40";
      case "processing":
        return "border-rose-400 dark:border-rose-600 bg-rose-50 dark:bg-rose-950/40";
      case "listing":
        return "border-teal-400 dark:border-teal-600 bg-teal-50 dark:bg-teal-950/40";
      case "analyzing":
        return "border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/40";
      default:
        return "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40";
    }
  };

  const getStepIcon = () => {
    switch (stepType) {
      case "search":
        return <Search className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case "read":
        return <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "synthesis":
        return <BookMarked className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "reasoning":
        return <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "planning":
        return <PenTool className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
      case "exploring":
        return <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "processing":
        return <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case "listing":
        return <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
      case "analyzing":
        return <Lightbulb className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStepBadgeColor = () => {
    switch (stepType) {
      case "search":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300";
      case "read":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300";
      case "synthesis":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300";
      case "reasoning":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300";
      case "planning":
        return "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300";
      case "exploring":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300";
      case "processing":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300";
      case "listing":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300";
      case "analyzing":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };
  
  // Display all findings immediately with the step
  const relevantFindings = findings.filter(finding => {
    return sources.includes(finding.source) || finding.node_id;
  });
  
  return (
    <div 
      className={cn(
        "rounded-lg border-l-4 shadow-sm transition-all duration-200 step-item-transition",
        getStepColor(),
        isActive && "ring-2 ring-primary/20 shadow-md",
        isExpanded ? "mb-4" : "mb-2",
        className
      )}
    >
      <div 
        className="flex items-start cursor-pointer p-4" 
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary mr-2">
              Step {index + 1}
            </span>
            <span className={cn("inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-medium capitalize", getStepBadgeColor())}>
              {getStepIcon()}
              <span className="ml-1">{stepType}</span>
            </span>
            {relevantFindings.length > 0 && (
              <Badge variant="outline" className="ml-auto text-xs bg-background">
                {relevantFindings.length} finding{relevantFindings.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm font-medium">{step}</p>
        </div>
      </div>
      
      {/* Findings section with collapsible content */}
      {relevantFindings.length > 0 && (
        <Collapsible 
          open={areFindingsExpanded} 
          onOpenChange={setAreFindingsExpanded}
          className={cn(
            "px-4 pb-2 pl-7 space-y-2", 
            !isExpanded && "border-t border-muted/30 pt-3"
          )}
        >
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-xs uppercase text-muted-foreground">Findings</h4>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-6 w-6 hover:bg-transparent">
                {areFindingsExpanded ? 
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : 
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-3">
            {relevantFindings.map((finding, i) => {
              const hasDetails = finding.finding?.title || finding.finding?.summary;
              return (
                <div key={`${finding.source}-${i}`} className="rounded-md overflow-hidden bg-background/80 border border-muted shadow-sm">
                  {hasDetails && (
                    <div className="p-3 border-b border-muted/50">
                      <div className="flex justify-between items-start">
                        <h5 className="font-medium text-sm truncate flex-1">
                          {finding.finding?.title || "Finding"}
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
                      {finding.finding?.confidence_score && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                            Confidence: {Math.round(finding.finding.confidence_score * 100)}%
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {finding.finding?.summary || finding.content || "No content available"}
                    </p>
                    {finding.source && (
                      <p className="mt-2 text-xs text-muted-foreground truncate">
                        Source: {finding.source}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {isExpanded && (
        <div className="px-4 pb-4 pl-7 space-y-4 text-sm animate-in fade-in duration-100">
          {synthesis && (
            <div className="p-3 rounded-md bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 mt-2">
              <h4 className="font-medium text-xs uppercase text-emerald-800 dark:text-emerald-300 mb-1">Synthesis</h4>
              <p className="whitespace-pre-wrap text-emerald-900 dark:text-emerald-100">{synthesis}</p>
              {typeof synthesis === 'object' && synthesis.confidence && (
                <Badge className="mt-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  Confidence: {Math.round(synthesis.confidence * 100)}%
                </Badge>
              )}
            </div>
          )}
          
          {answer && (
            <div className="p-3 rounded-md bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 mt-2">
              <h4 className="font-medium text-xs uppercase text-amber-800 dark:text-amber-300 mb-1">Answer</h4>
              <p className="whitespace-pre-wrap text-amber-900 dark:text-amber-100">{answer}</p>
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
