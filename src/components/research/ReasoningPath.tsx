
import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import ReasoningStep from "./ReasoningStep";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey, getSessionData, saveSessionData } from "@/lib/constants";
import { toast } from "sonner";

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
  const [sessionLoaded, setSessionLoaded] = useState(false);
  
  // Handler for real-time updates
  const handleRealtimeUpdate = useCallback((event: CustomEvent) => {
    if (!sessionId) return;
    
    const payload = event.detail?.payload;
    if (!payload || payload.table !== 'research_states') return;
    
    // Only process updates relevant to this session
    if (payload.new && payload.new.session_id === sessionId) {
      console.log(`[${new Date().toISOString()}] 🔄 Processing realtime update for session ${sessionId}`, payload);
      
      // Update reasoning path if it changed
      if (payload.new.reasoning_path && Array.isArray(payload.new.reasoning_path)) {
        const newPath = payload.new.reasoning_path;
        if (newPath.length > displayReasoningPath.length) {
          console.log(`[${new Date().toISOString()}] 📝 Updating reasoning path with ${newPath.length} steps`);
          setDisplayReasoningPath(newPath);
          
          // Save to local storage for persistence
          try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(newPath));
            if (sessionId) {
              const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
              localStorage.setItem(sessionPathKey, JSON.stringify(newPath));
              
              saveSessionData(sessionId, {
                reasoningPath: newPath
              });
            }
          } catch (e) {
            console.error("Error saving reasoning path to cache:", e);
          }
        }
      }
      
      // Update findings if they changed
      if (payload.new.findings && Array.isArray(payload.new.findings)) {
        const newFindings = payload.new.findings;
        if (newFindings.length > displayFindings.length) {
          console.log(`[${new Date().toISOString()}] 📊 Updating findings with ${newFindings.length} items`);
          setDisplayFindings(newFindings);
          
          // Save to local storage for persistence
          try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(newFindings));
            if (sessionId) {
              const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
              localStorage.setItem(sessionFindingsKey, JSON.stringify(newFindings));
              
              saveSessionData(sessionId, {
                findings: newFindings
              });
            }
          } catch (e) {
            console.error("Error saving findings to cache:", e);
          }
        }
      }
    }
  }, [sessionId, displayReasoningPath.length, displayFindings.length]);
  
  // Register and unregister the realtime update listener
  useEffect(() => {
    window.addEventListener('research_state_update', handleRealtimeUpdate as EventListener);
    
    return () => {
      window.removeEventListener('research_state_update', handleRealtimeUpdate as EventListener);
    };
  }, [handleRealtimeUpdate]);
  
  useEffect(() => {
    if (!sessionId) return;
    
    try {
      const sessionData = getSessionData(sessionId);
      
      if (sessionData) {
        console.log(`[${new Date().toISOString()}] 📂 Loading session data for ${sessionId}`);
        
        if (sessionData.reasoningPathKey && Array.isArray(sessionData.reasoningPathKey)) {
          if (reasoningPath.length === 0 || sessionData.reasoningPathKey.length > reasoningPath.length) {
            setDisplayReasoningPath(sessionData.reasoningPathKey);
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${sessionData.reasoningPathKey.length} reasoning steps from session data`);
          }
        }
        
        if (sessionData.findingsKey && Array.isArray(sessionData.findingsKey)) {
          if (findings.length === 0 || sessionData.findingsKey.length > findings.length) {
            setDisplayFindings(sessionData.findingsKey);
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${sessionData.findingsKey.length} findings from session data`);
          }
        }
        
        setSessionLoaded(true);
        return;
      }
      
      const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
      const sessionPathCache = localStorage.getItem(sessionPathKey);
      
      if (sessionPathCache) {
        const parsedPath = JSON.parse(sessionPathCache);
        if (Array.isArray(parsedPath) && parsedPath.length > 0) {
          if (reasoningPath.length === 0 || parsedPath.length > reasoningPath.length) {
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${parsedPath.length} reasoning steps from session cache`);
            setDisplayReasoningPath(parsedPath);
          }
        }
      }
      
      const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
      const sessionFindingsCache = localStorage.getItem(sessionFindingsKey);
      
      if (sessionFindingsCache) {
        const parsedFindings = JSON.parse(sessionFindingsCache);
        if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
          if (findings.length === 0 || parsedFindings.length > findings.length) {
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${parsedFindings.length} findings from session cache`);
            setDisplayFindings(parsedFindings);
          }
        }
      }
      
      setSessionLoaded(true);
    } catch (e) {
      console.error(`[${new Date().toISOString()}] Error loading reasoning path or findings from cache:`, e);
      toast.error("Failed to load previous session data. Some information may be missing.");
    }
  }, [sessionId]);
  
  useEffect(() => {
    if (sessionLoaded) return;
    
    try {
      if (displayReasoningPath.length === 0 && reasoningPath.length === 0) {
        const pathCache = localStorage.getItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE);
        if (pathCache) {
          const parsedPath = JSON.parse(pathCache);
          if (Array.isArray(parsedPath) && parsedPath.length > 0) {
            setDisplayReasoningPath(parsedPath);
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${parsedPath.length} reasoning steps from global cache`);
          }
        }
      }
      
      if (displayFindings.length === 0 && findings.length === 0) {
        const findingsCache = localStorage.getItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE);
        if (findingsCache) {
          const parsedFindings = JSON.parse(findingsCache);
          if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
            setDisplayFindings(parsedFindings);
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${parsedFindings.length} findings from global cache`);
          }
        }
      }
    } catch (e) {
      console.error("Error loading from global cache:", e);
    }
  }, [sessionLoaded, displayReasoningPath.length, displayFindings.length, reasoningPath.length, findings.length]);
  
  useEffect(() => {
    if (reasoningPath.length > 0) {
      setDisplayReasoningPath(reasoningPath);
      
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(reasoningPath));
        
        if (sessionId) {
          const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
          localStorage.setItem(sessionPathKey, JSON.stringify(reasoningPath));
          
          saveSessionData(sessionId, {
            reasoningPath: reasoningPath
          });
        }
      } catch (e) {
        console.error("Error saving reasoning path to cache:", e);
      }
    }
    
    if (findings.length > 0) {
      setDisplayFindings(findings);
      
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(findings));
        
        if (sessionId) {
          const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
          localStorage.setItem(sessionFindingsKey, JSON.stringify(findings));
          
          saveSessionData(sessionId, {
            findings: findings
          });
        }
      } catch (e) {
        console.error("Error saving findings to cache:", e);
      }
    }
    
    if (sessionId && Object.keys(rawData).length > 0) {
      try {
        const rawDataKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.RAW_DATA_CACHE, sessionId);
        localStorage.setItem(rawDataKey, JSON.stringify(rawData));
        localStorage.setItem(LOCAL_STORAGE_KEYS.RAW_DATA_CACHE, JSON.stringify(rawData));
        
        saveSessionData(sessionId, {
          rawData: rawData
        });
      } catch (e) {
        console.error("Error saving raw data to cache:", e);
      }
    }
  }, [reasoningPath, findings, sessionId, rawData]);

  if (displayReasoningPath.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Reasoning process will appear here...</p>
      </div>
    );
  }
  
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
    <div className="space-y-4 px-2 md:px-4 mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Research Planning</h3>
        <Badge variant="outline" className="text-xs">
          {displayReasoningPath.length} step{displayReasoningPath.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pb-8 md:pb-20 reasoning-steps-container">
        {displayReasoningPath.map((step, index) => {
          const nodeId = step.match(/node(?:_id|[\s_]id)?:?\s*['"]?([a-zA-Z0-9_-]+)['"]?/i)?.[1] || 
                      step.match(/node\s+(\d+)|#(\d+)/i)?.[1] || 
                      step.match(/step-(\d+)/i)?.[1] ||
                      `step-${index}`;
                      
          const stepRawData = nodeId ? rawData[nodeId] : undefined;
          
          let answerData = null;
          if (stepRawData) {
            try {
              const parsedData = JSON.parse(stepRawData);
              if (parsedData.event === "answer" && parsedData.data && parsedData.data.answer) {
                answerData = parsedData.data.answer;
              }
            } catch (e) {
              const answerMatch = stepRawData.match(/"event"\s*:\s*"answer"[\s\S]*?"answer"\s*:\s*"([^"]+)"/);
              if (answerMatch && answerMatch[1]) {
                answerData = answerMatch[1];
              }
            }
          }
          
          const nodeFindings = findingsByNodeId[nodeId] || [];
          
          const urlFindings = displayFindings.filter(finding => {
            if (nodeFindings.includes(finding)) return false;
            try {
              const url = new URL(finding.source);
              const domain = url.hostname.replace('www.', '');
              return step.toLowerCase().includes(domain.split('.')[0]);
            } catch {
              return false;
            }
          });
          
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
