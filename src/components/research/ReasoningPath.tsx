
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import ReasoningStep from "./ReasoningStep";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";

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
  const [displayReasoningPath, setDisplayReasoningPath] = useState<string[]>(reasoningPath);
  const [displayFindings, setDisplayFindings] = useState<Finding[]>(findings);
  
  // Enhanced load from localStorage on mount and when sessionId changes
  useEffect(() => {
    try {
      // First attempt to load session-specific data if sessionId is provided
      if (sessionId) {
        console.log(`[${new Date().toISOString()}] 🔍 Attempting to load reasoning path for session:`, sessionId);
        
        // Try to load session-specific reasoning path
        const sessionPathKey = `${LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE}.${sessionId}`;
        const sessionPathCache = localStorage.getItem(sessionPathKey);
        
        if (sessionPathCache) {
          const parsedPath = JSON.parse(sessionPathCache);
          if (Array.isArray(parsedPath) && parsedPath.length > 0) {
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${parsedPath.length} reasoning steps from session cache`);
            setDisplayReasoningPath(parsedPath);
          }
        }
        
        // Try to load session-specific findings
        const sessionFindingsKey = `${LOCAL_STORAGE_KEYS.FINDINGS_CACHE}.${sessionId}`;
        const sessionFindingsCache = localStorage.getItem(sessionFindingsKey);
        
        if (sessionFindingsCache) {
          const parsedFindings = JSON.parse(sessionFindingsCache);
          if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${parsedFindings.length} findings from session cache`);
            setDisplayFindings(parsedFindings);
          }
        }
      } else {
        // Log the issue if no sessionId is provided
        console.warn(`[${new Date().toISOString()}] ⚠️ No sessionId provided for loading reasoning path`);
      }
      
      // Only use global cache if no data has been loaded or provided
      if (displayReasoningPath.length === 0 && reasoningPath.length === 0) {
        const pathCache = localStorage.getItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE);
        if (pathCache) {
          const parsedPath = JSON.parse(pathCache);
          if (Array.isArray(parsedPath) && parsedPath.length > 0) {
            setDisplayReasoningPath(parsedPath);
          }
        }
      }
      
      if (displayFindings.length === 0 && findings.length === 0) {
        const findingsCache = localStorage.getItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE);
        if (findingsCache) {
          const parsedFindings = JSON.parse(findingsCache);
          if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
            setDisplayFindings(parsedFindings);
          }
        }
      }
    } catch (e) {
      console.error("Error loading reasoning path or findings from cache:", e);
    }
  }, [sessionId]);
  
  // Update state and localStorage when props change
  useEffect(() => {
    // Always prioritize incoming props over cached data
    if (reasoningPath.length > 0) {
      setDisplayReasoningPath(reasoningPath);
      
      // Save to both global and session-specific cache
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(reasoningPath));
        
        if (sessionId) {
          const sessionPathKey = `${LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE}.${sessionId}`;
          localStorage.setItem(sessionPathKey, JSON.stringify(reasoningPath));
          console.log(`[${new Date().toISOString()}] 💾 Saved ${reasoningPath.length} reasoning steps to session cache`);
        }
      } catch (e) {
        console.error("Error saving reasoning path to cache:", e);
      }
    }
    
    if (findings.length > 0) {
      setDisplayFindings(findings);
      
      // Save to both global and session-specific cache
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(findings));
        
        if (sessionId) {
          const sessionFindingsKey = `${LOCAL_STORAGE_KEYS.FINDINGS_CACHE}.${sessionId}`;
          localStorage.setItem(sessionFindingsKey, JSON.stringify(findings));
          console.log(`[${new Date().toISOString()}] 💾 Saved ${findings.length} findings to session cache`);
        }
      } catch (e) {
        console.error("Error saving findings to cache:", e);
      }
    }
  }, [reasoningPath, findings, sessionId]);

  if (displayReasoningPath.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Reasoning process will appear here...</p>
      </div>
    );
  }
  
  // Group findings by node_id for easier matching
  const findingsByNodeId: Record<string, Finding[]> = {};
  displayFindings.forEach(finding => {
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
          {displayReasoningPath.length} step{displayReasoningPath.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pb-8">
        {displayReasoningPath.map((step, index) => {
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
          const urlFindings = displayFindings.filter(finding => {
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
              defaultExpanded={index === displayReasoningPath.length - 1}
              isActive={isActive && index === displayReasoningPath.length - 1}
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
