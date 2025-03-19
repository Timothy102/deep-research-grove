
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Search, CheckCircle2, ArrowRight, Clock, BrainCircuit, Book, Lightbulb, FileText, Database, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
  raw_data?: string;
  finding?: any;
}

interface FindingsListProps {
  findings: Finding[];
  nodeId?: string;
  step?: string;
}

interface ReasoningStepProps {
  step: string;
  index: number;
  sources?: string[];
  findings?: Finding[];
  defaultExpanded?: boolean;
  isActive?: boolean;
  rawData?: string;
}

interface ReasoningPathProps {
  reasoningPath: string[];
  sources?: string[];
  findings?: Finding[];
  isActive?: boolean;
  isLoading?: boolean;
  rawData?: Record<string, string>;
}

interface FindingsListProps {
  findings: Finding[];
  nodeId?: string;
  step?: string;
}

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
      color: "bg-blue-50 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-200 dark:border-blue-800", 
      icon: <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
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

const findRelevantFindings = (
  step: string,
  findings: Finding[] = [],
  nodeId?: string
): Finding[] => {
  if (!findings || findings.length === 0) return [];
  
  if (nodeId) {
    const nodeFindings = findings.filter(f => f.node_id === nodeId);
    if (nodeFindings.length > 0) return nodeFindings;
  }
  
  const stepLower = step.toLowerCase();
  
  if (stepLower.includes("search")) {
    const searchFindings: Finding[] = [];
    const searchQueries = extractSearchQueries(step);
    
    if (searchQueries.length > 0) {
      searchQueries.forEach(query => {
        findings.forEach(finding => {
          if (finding.query && 
              query.toLowerCase().includes(finding.query.toLowerCase()) && 
              !searchFindings.includes(finding)) {
            searchFindings.push(finding);
          }
        });
      });
    }
    
    if (searchFindings.length > 0) return searchFindings;
  }
  
  return findings.filter(finding => {
    try {
      const url = new URL(finding.source);
      const domain = url.hostname.replace('www.', '');
      return stepLower.includes(domain.split('.')[0]);
    } catch {
      return false;
    }
  });
};

const extractSearchQueries = (step: string): string[] => {
  const lines = step.split('\n');
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

const SourceItem = ({ source, content, sourceIndex, isFinding, finding }: { 
  source: string; 
  content?: string; 
  sourceIndex: number;
  isFinding: boolean;
  finding?: any;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
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
      
      {isExpanded && displayContent && (
        <div className="px-2 pb-2 pt-1 ml-7 animate-accordion-down">
          <div className="text-xs text-muted-foreground bg-background p-2 rounded border text-left whitespace-pre-wrap">
            {displayContent}
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
            <Database className="h-4 w-4" />
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
                    finding={finding.finding}
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

const FindingsList = ({ findings = [], nodeId, step }: FindingsListProps) => {
  if (!findings || findings.length === 0) return null;
  
  return (
    <div className="mt-3">
      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
        <Database className="h-3.5 w-3.5" />
        Findings discovered:
      </h4>
      <div className="rounded-md border p-2 bg-blue-50/30 dark:bg-blue-950/20">
        <div className="space-y-1">
          {findings.map((finding, idx) => (
            <SourceItem
              key={idx}
              source={finding.source}
              content={finding.content}
              sourceIndex={idx + 1}
              isFinding={true}
              finding={finding.finding}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const FindingsContent = ({ findings }: { findings: Finding[] }) => {
  if (!findings || findings.length === 0) return null;
  
  return (
    <div className="space-y-3 mt-2">
      {findings.map((finding, idx) => (
        <Card key={idx} className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-3">
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
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
            {(finding.content || finding.finding) && (
              <div className="text-sm text-muted-foreground bg-white/80 dark:bg-gray-900/50 p-2 rounded border border-blue-100 dark:border-blue-900 mt-1 whitespace-pre-wrap">
                {finding.content || (finding.finding && 
                  `Title: ${finding.finding.title || ''}\nSummary: ${finding.finding.summary || ''}\nConfidence: ${finding.finding.confidence_score?.toFixed(2) || 'N/A'}`
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
          <Code className="h-3.5 w-3.5 mr-1.5" />
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

const SearchQueries = ({ step }: { step: string }) => {
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

const ReasoningStep = ({ step, index, sources = [], findings = [], defaultExpanded = false, isActive = false, rawData }: ReasoningStepProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded || index === 0);
  const { type, color, icon, label } = getStepType(step);
  
  const relevantSources = findRelevantSources(step, sources, findings);
  
  const nodeId = extractNodeId(step);
  
  const relevantFindings = findRelevantFindings(step, findings, nodeId);
  const hasFindingsForStep = relevantFindings.length > 0;
  
  let formattedStep = step;
  
  const typeWords = ["Processing", "Exploring", "Searching", "Reasoning", "Synthesizing", "Reading"];
  const regex = new RegExp(`^(${typeWords.join('|')}):\\s*`, 'i');
  formattedStep = formattedStep.replace(regex, "");

  const isLastStep = isActive && index === sources.length - 1;

  const isSearchStep = type === "searching";

  useEffect(() => {
    if ((isSearchStep && hasFindingsForStep) || (isActive && index === sources.length - 1)) {
      setExpanded(true);
    }
  }, [isSearchStep, hasFindingsForStep, findings.length, isActive, index, sources.length]);

  // Display findings inline with the reasoning step
  const showInlineFindings = isSearchStep && hasFindingsForStep;

  return (
    <div className="mb-3 animate-fade-in">
      <div 
        className={cn(
          "flex items-start space-x-2 p-3 rounded-md border transition-all duration-200",
          expanded 
            ? `shadow-sm border-l-4 ${color.split(' ')[0]}` 
            : `border-l-4 ${color.split(' ')[0]} hover:bg-gray-50 dark:hover:bg-gray-900/30`,
          hasFindingsForStep && "border-blue-300 dark:border-blue-700"
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
                {relevantFindings.length} finding{relevantFindings.length !== 1 ? 's' : ''}
              </Badge>
            )}
            
            {nodeId && (
              <Badge variant="outline" className="font-normal text-xs bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300 border-slate-200 dark:border-slate-800">
                Node ID: {nodeId}
              </Badge>
            )}
          </div>
          
          <p className="text-sm">{formattedStep}</p>

          {/* Inline findings preview - show always regardless of expansion state */}
          {showInlineFindings && (
            <div className="mt-2 space-y-1 border-l-2 border-blue-200 dark:border-blue-800 pl-2">
              {relevantFindings.slice(0, 1).map((finding, idx) => (
                <div key={idx} className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20 p-1.5 rounded">
                  <div className="font-medium">{finding.finding?.title || 'Finding'}</div>
                  <div className="line-clamp-1">{finding.finding?.summary}</div>
                </div>
              ))}
              {relevantFindings.length > 1 && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  + {relevantFindings.length - 1} more finding{relevantFindings.length > 2 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="ml-11 mt-2 space-y-4">
          {isSearchStep && (
            <SearchQueries step={step} />
          )}
          
          {hasFindingsForStep && (
            <FindingsContent findings={relevantFindings} />
          )}
          
          {rawData && (
            <RawDataDisplay data={rawData} />
          )}
          
          {relevantSources.length > 0 && !isSearchStep && (
            <div className="mt-3">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                <Database className="h-3.5 w-3.5" />
                Related Sources:
              </h4>
              <div className="space-y-1">
                {relevantSources.map((item, idx) => (
                  <SourceItem
                    key={idx}
                    source={item.source}
                    content={item.content}
                    sourceIndex={item.sourceIndex}
                    isFinding={item.isFinding}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ReasoningPath = ({ reasoningPath, sources = [], findings = [], isActive = false, isLoading = false, rawData = {} }: ReasoningPathProps) => {
  if (reasoningPath.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Reasoning process will appear here...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Research Planning</h3>
        <Badge variant="outline" className="text-xs">
          {reasoningPath.length} step{reasoningPath.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="space-y-4">
        {reasoningPath.map((step, index) => {
          const nodeId = extractNodeId(step);
          const stepRawData = nodeId ? rawData[nodeId] : undefined;
          
          return (
            <ReasoningStep
              key={index}
              step={step}
              index={index}
              sources={sources}
              findings={findings}
              defaultExpanded={index === reasoningPath.length - 1}
              isActive={isActive && index === reasoningPath.length - 1}
              rawData={stepRawData}
            />
          );
        })}
      </div>
      
      <AllSourcesAndFindings sources={sources} findings={findings} />
    </div>
  );
};

export default ReasoningPath;
