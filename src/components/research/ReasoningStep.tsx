
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronDown, 
  ChevronRight, 
  Database, 
  Book, 
  Search, 
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  X,
  BookOpen,
  Link
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { submitHumanFeedback } from "@/services/humanInteractionService";

interface SourceItemProps { 
  source: string; 
  content?: string; 
  sourceIndex: number;
  isFinding: boolean;
  finding?: any;
}

interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
  finding?: {
    title?: string;
    summary?: string;
    confidence_score?: number;
    url?: string;
  };
}

interface ReasoningStepProps {
  step: string;
  index: number;
  sources?: string[];
  findings?: Finding[];
  defaultExpanded?: boolean;
  isActive?: boolean;
  rawData?: string;
  sessionId: string;
  answer?: string | null;
}

const extractNodeId = (step: string): string | undefined => {
  const nodeIdMatch = step.match(/node(?:_id|[\s_]id)?:?\s*['"]?([a-zA-Z0-9_-]+)['"]?/i);
  if (nodeIdMatch) return nodeIdMatch[1];
  
  const numericNodeMatch = step.match(/node\s+(\d+)|#(\d+)/i);
  if (numericNodeMatch) return (numericNodeMatch[1] || numericNodeMatch[2]);
  
  return undefined;
};

const extractDomain = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (e) {
    return url;
  }
};

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
      icon: <Book className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      label: "reasoning"
    };
  } else if (stepLower.includes("synthe") || stepLower.includes("combin") || stepLower.includes("integrat") || stepLower.includes("summar")) {
    return { 
      type: "synthesizing", 
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700", 
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
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
      icon: <Database className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
      label: "planning"
    };
  } else {
    return { 
      type: "step", 
      color: "bg-blue-50 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-200 dark:border-blue-800", 
      icon: <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      label: "processing"
    };
  }
};

const SearchQueries = ({ step }: { step: string }) => {
  const extractSearchQueries = (stepText: string): string[] => {
    const lines = stepText.split('\n');
    const queries = new Set<string>();
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && 
          !trimmedLine.toLowerCase().includes("searching") && 
          !trimmedLine.toLowerCase().includes("looking up") &&
          !trimmedLine.toLowerCase().includes("search query") &&
          !trimmedLine.toLowerCase().includes("node id")) {
        queries.add(trimmedLine);
      }
    });
    
    return Array.from(queries);
  };

  const queries = extractSearchQueries(step);
  
  if (queries.length === 0) return null;
  
  return (
    <div className="mt-3">
      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
        <Search className="h-3.5 w-3.5" />
        Search Queries:
      </h4>
      <div className="flex flex-wrap gap-2">
        {queries.map((query, i) => (
          <Badge 
            key={i} 
            variant="outline" 
            className="bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800 flex items-center gap-1.5 py-1.5 px-2.5"
          >
            <Search className="h-3 w-3 text-violet-600 dark:text-violet-400" />
            <span className="text-xs text-violet-800 dark:text-violet-300">{query}</span>
          </Badge>
        ))}
      </div>
    </div>
  );
};

const SourceItem = ({ source, content, sourceIndex, isFinding, finding }: SourceItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  React.useEffect(() => {
    if (finding && (finding.title || finding.summary)) {
      setIsExpanded(true);
    }
  }, [finding]);
  
  const displayContent = content || (finding && `Title: ${finding.title || ''}\nSummary: ${finding.summary || ''}\nConfidence: ${finding.confidence_score?.toFixed(2) || 'N/A'}`);
  
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
        onClick={() => displayContent && setIsExpanded(!isExpanded)}
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
          {displayContent && (
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
        </div>
      </div>
      
      {isExpanded && displayContent && (
        <div className="px-2 pb-2 pt-1 ml-7 animate-accordion-down">
          <div className="text-xs text-muted-foreground bg-background p-2 rounded border text-left whitespace-pre-wrap max-h-[400px] overflow-auto">
            {displayContent}
          </div>
        </div>
      )}
    </div>
  );
};

const AnswerDisplay = ({ answer }: { answer: string }) => {
  if (!answer) return null;
  
  return (
    <div className="mt-3 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-md border border-emerald-100 dark:border-emerald-900">
      <div className="font-medium text-sm mb-2 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        <span>Answer</span>
      </div>
      <div className="whitespace-pre-wrap">{answer}</div>
    </div>
  );
};

const FindingsDisplay = ({ findings }: { findings: Finding[] }) => {
  if (!findings || findings.length === 0) return null;
  
  return (
    <div className="mt-4 space-y-3">
      <div className="font-medium text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
        <BookOpen className="h-4 w-4" />
        <span>Findings ({findings.length})</span>
      </div>
      
      <div className="space-y-3">
        {findings.map((finding, idx) => (
          <div key={idx} className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <Book className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">
                    {finding.finding?.title || extractDomain(finding.source)}
                  </span>
                </Badge>
                
                <span className="text-xs text-muted-foreground">
                  {finding.finding?.confidence_score 
                    ? `${(finding.finding.confidence_score * 100).toFixed(1)}% confidence` 
                    : ''}
                </span>
              </div>
              
              <a 
                href={finding.source} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Link className="h-3 w-3" />
                <span>Source</span>
              </a>
            </div>
            
            {finding.finding?.summary && (
              <div className="text-sm text-muted-foreground bg-white/80 dark:bg-gray-900/50 p-2 rounded border border-blue-100 dark:border-blue-900 whitespace-pre-wrap">
                {finding.finding.summary}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const FindingsContent = ({ findings }: { findings: Finding[] }) => {
  if (!findings || findings.length === 0) return null;
  
  return (
    <div className="space-y-3 mt-2">
      {findings.map((finding, idx) => (
        <div key={idx} className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-md">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              <Book className="h-3 w-3 mr-1" />
              Finding {idx + 1}
            </Badge>
            <a 
              href={finding.source} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate flex items-center"
            >
              {extractDomain(finding.source)}
            </a>
          </div>
          {(finding.content || finding.finding) && (
            <div className="text-sm text-muted-foreground bg-white/80 dark:bg-gray-900/50 p-2 rounded border border-blue-100 dark:border-blue-900 mt-1 whitespace-pre-wrap max-h-[250px] overflow-auto">
              {finding.content || (finding.finding && 
                `Title: ${finding.finding.title || ''}\nSummary: ${finding.finding.summary || ''}\nConfidence: ${finding.finding.confidence_score?.toFixed(2) || 'N/A'}`
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const RawDataDisplay = ({ data }: { data?: string }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!data) return null;
  
  return (
    <div className="mt-3">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-2 text-xs bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800"
      >
        <div className="flex items-center">
          <Database className="h-3.5 w-3.5 mr-1.5" />
          <span>Raw Backend Data</span>
        </div>
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </Button>
      
      {expanded && (
        <pre className="p-3 overflow-auto text-xs bg-zinc-950 text-zinc-200 dark:bg-zinc-900 rounded-md border border-zinc-800 max-h-[300px]">
          {data}
        </pre>
      )}
    </div>
  );
};

const HumanFeedbackInput = ({ nodeId, interactionType, sessionId, onCancel }: { 
  nodeId: string; 
  interactionType: string; 
  sessionId: string;
  onCancel: () => void;
}) => {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error("Please enter feedback before submitting");
      return;
    }
    
    try {
      setIsSubmitting(true);
      await submitHumanFeedback(nodeId, feedback, interactionType, sessionId);
      toast.success("Feedback submitted successfully");
      onCancel();
    } catch (error) {
      toast.error("Failed to submit feedback");
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="mt-4 p-3 border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 rounded-md animate-in fade-in slide-in-from-top-5 duration-300">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Human Feedback for Node {nodeId}</span>
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0" 
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Enter your feedback or guidance for this step..."
        className="min-h-[100px] mb-3"
      />
      
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          size="sm" 
          onClick={handleSubmit}
          disabled={isSubmitting || !feedback.trim()}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </div>
  );
};

const ReasoningStep: React.FC<ReasoningStepProps> = ({ 
  step, 
  index, 
  sources = [], 
  findings = [], 
  defaultExpanded = false, 
  isActive = false, 
  rawData,
  sessionId,
  answer
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded || index === 0);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const { type, color, icon, label } = getStepType(step);
  
  const nodeId = extractNodeId(step) || `step-${index}`;
  
  const findRelevantFindings = (
    stepText: string,
    allFindings: Finding[] = [],
    stepNodeId?: string
  ): Finding[] => {
    if (!allFindings || allFindings.length === 0) return [];
    
    if (stepNodeId) {
      const nodeFindings = allFindings.filter(f => f.node_id === stepNodeId);
      if (nodeFindings.length > 0) return nodeFindings;
    }
    
    return allFindings.filter(finding => {
      try {
        const url = new URL(finding.source);
        const domain = url.hostname.replace('www.', '');
        return stepText.toLowerCase().includes(domain.split('.')[0]);
      } catch {
        return false;
      }
    });
  };
  
  const relevantFindings = findRelevantFindings(step, findings, nodeId);
  const hasFindingsForStep = relevantFindings.length > 0;
  
  let formattedStep = step;
  
  const typeWords = ["Processing", "Exploring", "Searching", "Reasoning", "Synthesizing", "Reading"];
  const regex = new RegExp(`^(${typeWords.join('|')}):\\s*`, 'i');
  formattedStep = formattedStep.replace(regex, "");

  const isLastStep = isActive && index === sources.length - 1;
  const isSearchStep = type === "searching";
  const hasAnswer = !!answer;

  useEffect(() => {
    if ((isSearchStep && hasFindingsForStep) || hasAnswer || (isActive && index === sources.length - 1)) {
      setExpanded(true);
    }
  }, [isSearchStep, hasFindingsForStep, findings.length, isActive, index, sources.length, hasAnswer]);

  // Extract answer if not provided directly but exists in rawData
  let displayAnswer = answer;
  if (!displayAnswer && rawData) {
    try {
      const rawDataObj = JSON.parse(rawData);
      if (rawDataObj.data && rawDataObj.event === "answer") {
        displayAnswer = rawDataObj.data.answer || "";
      }
    } catch (e) {
      // If multiple JSON objects, try to find the answer event
      if (typeof rawData === "string") {
        const answerMatch = rawData.match(/"event"\s*:\s*"answer"[\s\S]*?"answer"\s*:\s*"([^"]+)"/);
        if (answerMatch && answerMatch[1]) {
          displayAnswer = answerMatch[1];
        }
      }
    }
  }

  const handleFeedbackToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFeedbackInput(!showFeedbackInput);
  };

  return (
    <div className="mb-4 animate-fade-in">
      <div 
        className={cn(
          "flex items-start space-x-2 p-4 rounded-md border transition-all duration-200",
          expanded 
            ? `shadow-sm border-l-4 ${color.split(' ')[0]}` 
            : `border-l-4 ${color.split(' ')[0]} hover:bg-gray-50 dark:hover:bg-gray-900/30`,
          hasFindingsForStep && "border-blue-300 dark:border-blue-700",
          hasAnswer && "border-emerald-300 dark:border-emerald-700"
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
            
            {hasFindingsForStep && (
              <Badge variant="outline" className="font-normal text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                {relevantFindings.length} finding{relevantFindings.length !== 1 ? 's' : ''}
              </Badge>
            )}
            
            {hasAnswer && (
              <Badge variant="outline" className="font-normal text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Answer
              </Badge>
            )}
            
            <Badge variant="outline" className="font-normal text-xs bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300 border-slate-200 dark:border-slate-800">
              Node ID: {nodeId}
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 ml-auto text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/30"
              onClick={handleFeedbackToggle}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Feedback
            </Button>
          </div>
          
          <p className="text-sm">{formattedStep}</p>
          
          {/* Display answer immediately if available, even when not expanded */}
          {displayAnswer && !expanded && (
            <div className="mt-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded border border-emerald-100 dark:border-emerald-900">
              <div className="font-medium text-xs mb-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Answer</span>
              </div>
              <div className="line-clamp-3">{displayAnswer}</div>
            </div>
          )}
          
          {/* Always show findings summary to make them more visible */}
          {hasFindingsForStep && !expanded && (
            <div className="mt-2 flex flex-wrap gap-2">
              {relevantFindings.slice(0, 3).map((finding, idx) => (
                <Badge key={idx} variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 py-1">
                  <Book className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[200px]">
                    {finding.finding?.title || extractDomain(finding.source)}
                  </span>
                </Badge>
              ))}
              {relevantFindings.length > 3 && (
                <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 py-1">
                  +{relevantFindings.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
      
      {showFeedbackInput && (
        <HumanFeedbackInput
          nodeId={nodeId}
          interactionType={type}
          sessionId={sessionId}
          onCancel={() => setShowFeedbackInput(false)}
        />
      )}
      
      {expanded && (
        <div className="ml-11 mt-3 space-y-4 px-2 pb-2">
          {isSearchStep && (
            <SearchQueries step={step} />
          )}
          
          {displayAnswer && (
            <AnswerDisplay answer={displayAnswer} />
          )}
          
          {hasFindingsForStep && (
            <FindingsDisplay findings={relevantFindings} />
          )}
          
          {rawData && (
            <RawDataDisplay data={rawData} />
          )}
        </div>
      )}
    </div>
  );
};

export default ReasoningStep;
