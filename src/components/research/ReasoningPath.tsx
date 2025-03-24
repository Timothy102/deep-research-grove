
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import ReasoningStep from "./ReasoningStep";

interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
  raw_data?: string;
  finding?: {
    title?: string;
    summary?: string;
    confidence_score?: number;
    url?: string;
  };
}

interface ReasoningPathProps {
  reasoningPath: string[];
  sources?: string[];
  findings?: Finding[];
  isActive?: boolean;
  isLoading?: boolean;
  rawData?: Record<string, string>;
  sessionId?: string;
}

const ReasoningPath = ({ 
  reasoningPath, 
  sources = [], 
  findings = [], 
  isActive = false, 
  isLoading = false, 
  rawData = {},
  sessionId = "" 
}: ReasoningPathProps) => {
  if (reasoningPath.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Reasoning process will appear here...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Research Planning</h3>
        <Badge variant="outline" className="text-xs">
          {reasoningPath.length} step{reasoningPath.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pb-8">
        {reasoningPath.map((step, index) => {
          const nodeId = step.match(/node(?:_id|[\s_]id)?:?\s*['"]?([a-zA-Z0-9_-]+)['"]?/i)?.[1] || 
                      step.match(/node\s+(\d+)|#(\d+)/i)?.[1] || 
                      `step-${index}`;
                      
          const stepRawData = nodeId ? rawData[nodeId] : undefined;
          
          // Find answer data from raw data if available
          let answerData = null;
          if (stepRawData) {
            try {
              const parsedData = JSON.parse(stepRawData);
              if (parsedData.event === "answer" && parsedData.data && parsedData.data.answer) {
                answerData = parsedData.data.answer;
              }
            } catch (e) {
              // If multiple JSON objects, try to extract answer data
              const answerMatch = stepRawData.match(/"event"\s*:\s*"answer"[\s\S]*?"answer"\s*:\s*"([^"]+)"/);
              if (answerMatch && answerMatch[1]) {
                answerData = answerMatch[1];
              }
            }
          }
          
          // Find relevant findings for this step
          const relevantFindings = findings.filter(finding => 
            finding.node_id === nodeId || 
            (step.toLowerCase().includes(finding.source?.split('//')[1]?.split('.')[0] || ''))
          );
          
          return (
            <ReasoningStep
              key={index}
              step={step}
              index={index}
              sources={sources}
              findings={relevantFindings}
              defaultExpanded={index === reasoningPath.length - 1}
              isActive={isActive && index === reasoningPath.length - 1}
              rawData={stepRawData}
              sessionId={sessionId}
              answer={answerData}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ReasoningPath;
