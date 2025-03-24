
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
  
  // Group findings by node_id for easier matching
  const findingsByNodeId: Record<string, Finding[]> = {};
  findings.forEach(finding => {
    if (finding.node_id) {
      if (!findingsByNodeId[finding.node_id]) {
        findingsByNodeId[finding.node_id] = [];
      }
      findingsByNodeId[finding.node_id].push(finding);
    }
  });
  
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
          // Extract node ID from the step text using multiple patterns
          const nodeId = step.match(/node(?:_id|[\s_]id)?:?\s*['"]?([a-zA-Z0-9_-]+)['"]?/i)?.[1] || 
                      step.match(/node\s+(\d+)|#(\d+)/i)?.[1] || 
                      step.match(/step-(\d+)/i)?.[1] ||
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
          
          // Get findings for this specific node_id
          const nodeFindings = findingsByNodeId[nodeId] || [];
          
          // Also try to match findings by source/URL in the step text
          const urlFindings = findings.filter(finding => {
            if (nodeFindings.includes(finding)) return false; // Skip if already added
            try {
              const url = new URL(finding.source);
              const domain = url.hostname.replace('www.', '');
              return step.toLowerCase().includes(domain.split('.')[0]);
            } catch {
              return false;
            }
          });
          
          // Combine both sets of findings
          const relevantFindings = [...nodeFindings, ...urlFindings];
          
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
