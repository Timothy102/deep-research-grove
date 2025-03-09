
import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, Search } from "lucide-react";

interface Finding {
  source: string;
  content?: string;
}

interface ReasoningPathProps {
  reasoningPath: string[];
  sources: string[];
  findings: Finding[];
}

const STEP_TYPES = {
  OBJECTIVE: "objective",
  PLANNING: "planning",
  EXPLORING: "exploring",
  SEARCHING: "searching",
  ANALYZING: "analyzing",
  CONCLUDING: "concluding",
};

const ReasoningPath = ({ reasoningPath, sources, findings }: ReasoningPathProps) => {
  const [expandedSteps, setExpandedSteps] = useState<{ [key: number]: boolean }>({});

  const toggleStep = (stepIndex: number) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepIndex]: !prev[stepIndex]
    }));
  };

  // Map step text to step type
  const getStepType = (stepText: string, index: number) => {
    const lowerText = stepText.toLowerCase();
    
    // First step is always objective
    if (index === 0) return STEP_TYPES.OBJECTIVE;
    
    // Check for specific keywords in the step text to determine the type
    if (lowerText.includes("plan") || lowerText.includes("approach") || lowerText.includes("strategy")) {
      return STEP_TYPES.PLANNING;
    } else if (lowerText.includes("search") || lowerText.includes("look up") || lowerText.includes("find")) {
      return STEP_TYPES.SEARCHING;
    } else if (lowerText.includes("analy") || lowerText.includes("examin") || lowerText.includes("review")) {
      return STEP_TYPES.ANALYZING;
    } else if (lowerText.includes("conclude") || lowerText.includes("summary") || lowerText.includes("final")) {
      return STEP_TYPES.CONCLUDING;
    } else {
      // Default to exploring for any other step to avoid duplicate types
      return STEP_TYPES.EXPLORING;
    }
  };

  // Function to find relevant sources for a step
  const findRelevantSources = (stepText: string) => {
    // Extract potential keywords from the step
    const keywordsMatch = stepText.match(/\b\w{4,}\b/g) || [];
    const keywords = keywordsMatch
      .filter(word => !['this', 'that', 'with', 'from', 'about', 'will', 'would', 'should', 'could', 'have'].includes(word.toLowerCase()))
      .map(word => word.toLowerCase());
    
    // Find any references to sources in the step (e.g., "[1]", "source 2")
    const referencesMatch = stepText.match(/\[(\d+)\]|source\s+(\d+)/gi) || [];
    
    // Extract relevant findings based on keywords
    const relevantFindings = findings.filter(finding => {
      // Check if any keyword is in the source URL or content
      return keywords.some(keyword => 
        finding.source.toLowerCase().includes(keyword) || 
        (finding.content && finding.content.toLowerCase().includes(keyword))
      );
    });
    
    // Extract relevant sources based on keywords
    const relevantSources = sources.filter(source => {
      // Check if any keyword is in the source URL
      return keywords.some(keyword => source.toLowerCase().includes(keyword));
    });
    
    return {
      findings: relevantFindings,
      sources: relevantSources,
    };
  };

  return (
    <div className="space-y-4">
      {reasoningPath.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No reasoning path available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reasoningPath.map((step, index) => {
            const stepType = getStepType(step, index);
            const { findings: stepFindings, sources: stepSources } = findRelevantSources(step);
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-start gap-2">
                  <div 
                    onClick={() => toggleStep(index)}
                    className="shrink-0 cursor-pointer rounded p-0.5 hover:bg-background/80"
                  >
                    <Checkbox
                      checked={expandedSteps[index] || false}
                      onCheckedChange={() => toggleStep(index)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-6 w-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-xs font-medium"
                      >
                        {index + 1}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {stepType === STEP_TYPES.PLANNING && (
                          <Badge variant="outline" className="flex gap-1 items-center px-2 py-0 h-5 text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900">
                            <Clock className="h-3 w-3" />
                            planning
                          </Badge>
                        )}
                        
                        {stepType === STEP_TYPES.EXPLORING && (
                          <Badge variant="outline" className="flex gap-1 items-center px-2 py-0 h-5 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900">
                            exploring
                          </Badge>
                        )}
                        
                        {stepType === STEP_TYPES.SEARCHING && (
                          <Badge variant="outline" className="flex gap-1 items-center px-2 py-0 h-5 text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900">
                            <Search className="h-3 w-3" />
                            searching
                          </Badge>
                        )}
                        
                        {stepType === STEP_TYPES.ANALYZING && (
                          <Badge variant="outline" className="flex gap-1 items-center px-2 py-0 h-5 text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900">
                            analyzing
                          </Badge>
                        )}
                        
                        {stepType === STEP_TYPES.CONCLUDING && (
                          <Badge variant="outline" className="flex gap-1 items-center px-2 py-0 h-5 text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900">
                            concluding
                          </Badge>
                        )}
                        
                        {stepType === STEP_TYPES.OBJECTIVE && (
                          <Badge variant="outline" className="flex gap-1 items-center px-2 py-0 h-5 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-900">
                            objective
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm">{step}</p>
                    
                    {expandedSteps[index] && (stepFindings.length > 0 || stepSources.length > 0) && (
                      <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted">
                        <p className="text-xs font-medium text-muted-foreground">Relevant Sources:</p>
                        <div className="space-y-2">
                          {stepFindings.map((finding, idx) => (
                            <div key={`finding-${idx}`} className="text-xs p-2 rounded bg-muted/40 border border-border/40">
                              <a 
                                href={finding.source} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {finding.source}
                              </a>
                              {finding.content && (
                                <p className="mt-1 text-muted-foreground">{finding.content}</p>
                              )}
                            </div>
                          ))}
                          
                          {stepSources.map((source, idx) => (
                            <div key={`source-${idx}`} className="text-xs p-2 rounded bg-muted/40 border border-border/40">
                              <a 
                                href={source} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {source}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReasoningPath;
