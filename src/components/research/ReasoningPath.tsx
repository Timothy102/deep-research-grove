
import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Search, CheckCircle2, ArrowRight, Clock, BrainCircuit, Book, Lightbulb, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
}

interface ReasoningStepProps {
  step: string;
  index: number;
  sources?: string[];
  findings?: Finding[];
  defaultExpanded?: boolean;
  isActive?: boolean;
}

interface ReasoningPathProps {
  reasoningPath: string[];
  sources?: string[];
  findings?: Finding[];
  isActive?: boolean;
  isLoading?: boolean;
}

// This function now returns consistent colors for each step type, ensuring persistence
const getStepType = (step: string): { type: string; color: string; icon: React.ReactNode; label: string } => {
  const stepLower = step.toLowerCase();
  
  if (stepLower.includes("search") || stepLower.includes("looking up")) {
    return { 
      type: "searching", 
      color: "bg-violet-100 text-violet-800 dark:bg-violet-900/80 dark:text-violet-300 border-violet-300 dark:border-violet-700", 
      icon: <Search className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
      label: "searching"
    };
  } else if (stepLower.includes("reason") || stepLower.includes("analyz") || stepLower.includes("evaluat") || stepLower.includes("compar")) {
    return { 
      type: "reasoning", 
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-300 border-amber-300 dark:border-amber-700", 
      icon: <BrainCircuit className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      label: "reasoning"
    };
  } else if (stepLower.includes("synthe") || stepLower.includes("combin") || stepLower.includes("integrat") || stepLower.includes("summar")) {
    return { 
      type: "synthesizing", 
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700", 
      icon: <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      label: "synthesizing"
    };
  } else if (stepLower.includes("read") || stepLower.includes("review")) {
    return { 
      type: "reading", 
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-300 border-blue-300 dark:border-blue-700", 
      icon: <Book className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      label: "reading"
    };
  } else if (stepLower.includes("objective")) {
    return { 
      type: "objective", 
      color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700", 
      icon: <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
      label: "setting objective"
    };
  } else if (stepLower.includes("planning") || stepLower.includes("starting")) {
    return { 
      type: "planning", 
      color: "bg-sky-100 text-sky-800 dark:bg-sky-900/80 dark:text-sky-300 border-sky-300 dark:border-sky-700", 
      icon: <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
      label: "planning"
    };
  } else {
    return { 
      type: "step", 
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800/90 dark:text-gray-300 border-gray-300 dark:border-gray-700", 
      icon: <ArrowRight className="h-4 w-4" />,
      label: "processing"
    };
  }
};

const findRelevantSources = (
  step: string, 
  sources: string[], 
  findings: Finding[] = []
): { sourceIndex: number, source: string, content?: string, isFinding: boolean }[] => {
  if ((!sources || sources.length === 0) && (!findings || findings.length === 0)) return [];
  
  const relevantSources: { sourceIndex: number, source: string, content?: string, isFinding: boolean }[] = [];
  
  const refMatches = step.match(/\[(\d+)\]|\((\d+)\)/g);
  if (refMatches) {
    refMatches.forEach(match => {
      const num = parseInt(match.replace(/[\[\]\(\)]/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        const finding = findings.find((_, index) => index === num - 1);
        if (finding) {
          relevantSources.push({ 
            sourceIndex: num, 
            source: finding.source,
            content: finding.content,
            isFinding: true
          });
        } 
        else if (num <= sources.length) {
          relevantSources.push({ 
            sourceIndex: num, 
            source: sources[num-1],
            isFinding: false
          });
        }
      }
    });
  }
  
  if (step.toLowerCase().includes("search")) {
    findings.forEach((finding, index) => {
      if (!relevantSources.some(item => item.source === finding.source)) {
        relevantSources.push({ 
          sourceIndex: index + 1, 
          source: finding.source,
          content: finding.content,
          isFinding: true
        });
      }
    });
    
    sources.forEach((source, index) => {
      if (!relevantSources.some(item => item.source === source)) {
        relevantSources.push({ 
          sourceIndex: index + 1, 
          source,
          isFinding: false
        });
      }
    });
    
    return relevantSources;
  }
  
  if (relevantSources.length === 0) {
    const stepText = step.toLowerCase();
    
    findings.forEach((finding, index) => {
      const sourceUrl = finding.source.toLowerCase();
      const urlParts = sourceUrl.replace(/https?:\/\//, '').split('/')[0].split('.');
      const domain = urlParts.length > 1 ? urlParts[urlParts.length - 2] : '';
      
      if (domain && stepText.includes(domain)) {
        relevantSources.push({ 
          sourceIndex: index + 1, 
          source: finding.source,
          content: finding.content,
          isFinding: true
        });
      }
    });
    
    sources.forEach((source, index) => {
      if (!relevantSources.some(item => item.source === source)) {
        const sourceUrl = source.toLowerCase();
        const urlParts = sourceUrl.replace(/https?:\/\//, '').split('/')[0].split('.');
        const domain = urlParts.length > 1 ? urlParts[urlParts.length - 2] : '';
        
        if (domain && stepText.includes(domain)) {
          relevantSources.push({ 
            sourceIndex: index + 1, 
            source,
            isFinding: false
          });
        }
      }
    });
  }
  
  return relevantSources;
};

const extractDomain = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (e) {
    return url;
  }
};

const SourceItem = ({ source, content, sourceIndex, isFinding }: { 
  source: string; 
  content?: string; 
  sourceIndex: number;
  isFinding: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div 
      className={cn(
        "flex flex-col rounded-md transition-all mb-2",
        isFinding 
          ? "bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900"
          : "bg-muted/50 border border-muted-foreground/10"
      )}
    >
      <div 
        className="flex items-center gap-2 p-2 cursor-pointer"
        onClick={() => content && setIsExpanded(!isExpanded)}
      >
        <span className={cn(
          "inline-block w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0",
          isFinding
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        )}>
          {sourceIndex}
        </span>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5">
            {isFinding && (
              <Badge variant="outline" className="h-4 py-0 px-1 text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                finding
              </Badge>
            )}
            <a 
              href={source} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline truncate block text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {extractDomain(source)}
            </a>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {content && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-muted"
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          )}
          
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
      </div>
      
      {isExpanded && content && (
        <div className="px-2 pb-2 pt-1 ml-7 animate-accordion-down">
          <div className="text-xs text-muted-foreground bg-background p-2 rounded border text-left">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

const AllSourcesAndFindings = ({ sources = [], findings = [] }: { sources: string[], findings: Finding[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (sources.length === 0 && findings.length === 0) {
    return null;
  }
  
  return (
    <Collapsible 
      open={isExpanded} 
      onOpenChange={setIsExpanded}
      className="mt-4 border rounded-md p-2 bg-muted/20"
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>All Sources & Findings ({sources.length + findings.length})</span>
          </span>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-1 animate-accordion-down">
        <div className="space-y-1">
          {findings.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1.5">
                <Book className="h-3.5 w-3.5" />
                Findings ({findings.length}):
              </h4>
              <div className="space-y-1">
                {findings.map((finding, index) => (
                  <SourceItem
                    key={`finding-${index}`}
                    source={finding.source}
                    content={finding.content}
                    sourceIndex={index + 1}
                    isFinding={true}
                  />
                ))}
              </div>
            </div>
          )}
          
          {sources.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Sources ({sources.length}):
              </h4>
              <div className="space-y-1">
                {sources.map((source, index) => (
                  <SourceItem
                    key={`source-${index}`}
                    source={source}
                    sourceIndex={index + 1}
                    isFinding={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// New component to display findings for a reasoning step
const FindingsList = ({ findings = [], nodeId }: { findings: Finding[], nodeId?: string }) => {
  if (!findings || findings.length === 0) return null;
  
  // Filter findings that match the nodeId if provided
  const relevantFindings = nodeId 
    ? findings.filter(finding => finding.node_id === nodeId)
    : findings;
  
  if (relevantFindings.length === 0) return null;
  
  return (
    <div className="mt-3 space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Book className="h-3.5 w-3.5" />
        Findings discovered ({relevantFindings.length}):
      </h4>
      <div className="rounded-md border p-2 bg-blue-50/30 dark:bg-blue-950/20">
        {relevantFindings.map((finding, idx) => (
          <div key={idx} className="mb-2 last:mb-0">
            <SourceItem
              source={finding.source}
              content={finding.content}
              sourceIndex={idx + 1}
              isFinding={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const ReasoningStep = ({ step, index, sources = [], findings = [], defaultExpanded = false, isActive = false }: ReasoningStepProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded || index === 0);
  const { type, color, icon, label } = getStepType(step);
  
  const relevantSources = findRelevantSources(step, sources, findings);
  
  // Extract node ID from the step if available (assuming format like "Node ID: xyz")
  const nodeIdMatch = step.match(/Node ID:?\s*([a-zA-Z0-9_-]+)/i);
  const nodeId = nodeIdMatch ? nodeIdMatch[1] : undefined;
  
  // Find findings that match this step's node ID
  const stepFindings = findings.filter(f => f.node_id === nodeId);
  const hasFindingsForStep = stepFindings.length > 0;
  
  let formattedStep = step;
  
  const typeWords = ["Processing", "Exploring", "Searching", "Reasoning", "Synthesizing", "Reading"];
  const regex = new RegExp(`^(${typeWords.join('|')}):\\s*`, 'i');
  formattedStep = formattedStep.replace(regex, "");

  const isLastStep = isActive && index === sources.length - 1;

  return (
    <div className="mb-3 animate-fade-in">
      <div 
        className={cn(
          "flex items-start space-x-2 p-3 rounded-md border transition-all duration-200",
          expanded 
            ? `shadow-sm border-l-4 ${color.split(' ')[0]}` 
            : `border-l-4 ${color.split(' ')[0]} hover:bg-gray-50 dark:hover:bg-gray-900/30`
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
            <Badge className={cn("font-normal flex items-center gap-1", color)}>
              {icon}
              <span>{label}</span>
              {isLastStep && (
                <span className="ml-1 animate-pulse">●</span>
              )}
            </Badge>
            
            {relevantSources.length > 0 && (
              <Badge variant="outline" className="font-normal text-xs">
                {relevantSources.length} source{relevantSources.length !== 1 ? 's' : ''}
              </Badge>
            )}
            
            {hasFindingsForStep && (
              <Badge variant="outline" className="font-normal text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                {stepFindings.length} finding{stepFindings.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          <p className="text-sm">{formattedStep}</p>
        </div>
      </div>
      
      {expanded && (
        <div className="ml-11 mt-2 space-y-2 border-l-2 pl-4 border-gray-200 dark:border-gray-800">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">{formattedStep}</p>
          </div>
          
          {/* Display findings specific to this step */}
          {hasFindingsForStep && (
            <FindingsList findings={stepFindings} nodeId={nodeId} />
          )}
          
          {relevantSources.length > 0 && (
            <div className="space-y-2 mt-3">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Related Sources & Findings ({relevantSources.length}):
              </h4>
              
              <div className="space-y-2 rounded-md border p-2 bg-muted/30">
                {relevantSources.map(({ sourceIndex, source, content, isFinding }, i) => (
                  <SourceItem 
                    key={`relevant-${i}`}
                    source={source}
                    content={content}
                    sourceIndex={sourceIndex}
                    isFinding={isFinding}
                  />
                ))}
              </div>
            </div>
          )}
          
          {type === "searching" && (
            <div className="mt-3 space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Search Queries:
              </h4>
              <div className="flex flex-wrap gap-2">
                {step.split("\n").filter(line => line.trim().length > 0 && !line.toLowerCase().includes("searching")).map((line, i) => (
                  <Badge key={i} variant="outline" className="bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800 flex items-center gap-1.5 py-1.5 px-2.5">
                    <Search className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs text-violet-800 dark:text-violet-300">{line.trim()}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ReasoningPath = ({ reasoningPath, sources = [], findings = [], isActive = false, isLoading = false }: ReasoningPathProps) => {
  if (!reasoningPath.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No reasoning path available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-left">
      {reasoningPath.map((step, index) => (
        <ReasoningStep 
          key={index} 
          step={step} 
          index={index} 
          sources={sources}
          findings={findings}
          defaultExpanded={index === 0 || index === reasoningPath.length - 1}
          isActive={isActive && index === reasoningPath.length - 1}
        />
      ))}
      
      <AllSourcesAndFindings sources={sources} findings={findings} />
    </div>
  );
};

export default ReasoningPath;
