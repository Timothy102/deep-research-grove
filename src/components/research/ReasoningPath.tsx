import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import ReasoningStep from "./ReasoningStep";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey, getSessionData, saveSessionData } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

interface SynthesisData {
  node_id: string;
  query: string;
  synthesis: string;
  confidence: number;
  timestamp?: string;
  depth?: number;
  parent_id?: string;
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

interface StepData {
  id: string;
  step: string;
  sources: string[];
  findings: Finding[];
  synthesis?: any;
  answer?: any;
  rawData?: string;
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
  const [displaySources, setDisplaySources] = useState<string[]>(sources);
  const [synthesesData, setSynthesesData] = useState<Record<string, any>>({});
  const [answersData, setAnswersData] = useState<Record<string, any>>({});
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [forcedUpdate, setForcedUpdate] = useState(0);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  
  useEffect(() => {
    if (sessionId && sessionId !== lastSessionId) {
      console.log(`[${new Date().toISOString()}] 🔄 Session changed from ${lastSessionId} to ${sessionId}, resetting state`);
      setDisplayReasoningPath(reasoningPath);
      setDisplayFindings(findings);
      setDisplaySources(sources);
      setSynthesesData({});
      setAnswersData({});
      setSessionLoaded(false);
      setLastSessionId(sessionId);
      
      const allKeys = Object.keys(localStorage);
      const currentSessionKeys = [
        getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId),
        getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId),
        getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId),
        getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId)
      ];
      
      allKeys.forEach(key => {
        if (key.includes('SESSION_DATA_CACHE') || 
            key.includes('SOURCES_CACHE') || 
            key.includes('REASONING_PATH_CACHE') || 
            key.includes('FINDINGS_CACHE')) {
          if (!currentSessionKeys.includes(key) && !key.includes(sessionId)) {
            console.log(`[${new Date().toISOString()}] 🧹 Clearing unrelated cache for session switch:`, key);
            try {
              // Don't remove but keep the warning to track what's happening
              // localStorage.removeItem(key);
            } catch (e) {
              console.error("Error removing key:", e);
            }
          }
        }
      });
    }
  }, [sessionId, lastSessionId, reasoningPath, findings, sources]);
  
  useEffect(() => {
    if (reasoningPath.length > 0) {
      setDisplayReasoningPath(reasoningPath);
    }
    
    if (findings.length > 0) {
      setDisplayFindings(findings);
    }
    
    if (sources.length > 0) {
      setDisplaySources(sources);
    }
  }, [reasoningPath, findings, sources]);
  
  const handleRealtimeUpdate = useCallback((event: CustomEvent) => {
    if (!sessionId) return;
    
    const payload = event.detail?.payload;
    if (!payload) return;
    
    if (payload.table === 'research_states' && payload.new && payload.new.session_id === sessionId) {
      console.log(`[${new Date().toISOString()}] 🔄 Processing realtime update for session ${sessionId}`, payload);
      
      if (payload.new.reasoning_path && Array.isArray(payload.new.reasoning_path)) {
        const newPath = payload.new.reasoning_path;
        if (newPath.length > displayReasoningPath.length) {
          console.log(`[${new Date().toISOString()}] 📝 Updating reasoning path with ${newPath.length} steps`);
          setDisplayReasoningPath(newPath);
          
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
      
      if (payload.new.findings && Array.isArray(payload.new.findings)) {
        const newFindings = payload.new.findings;
        if (newFindings.length > displayFindings.length) {
          console.log(`[${new Date().toISOString()}] 📊 Updating findings with ${newFindings.length} items`);
          setDisplayFindings(newFindings);
          
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
      
      if (payload.new.sources && Array.isArray(payload.new.sources)) {
        const newSources = payload.new.sources;
        if (newSources.length > displaySources.length) {
          console.log(`[${new Date().toISOString()}] 🔗 Updating sources with ${newSources.length} items`);
          setDisplaySources(newSources);
          
          try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(newSources));
            if (sessionId) {
              const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
              localStorage.setItem(sessionSourcesKey, JSON.stringify(newSources));
              
              saveSessionData(sessionId, {
                sources: newSources
              });
            }
          } catch (e) {
            console.error("Error saving sources to cache:", e);
          }
        }
      }
    }
    
    if (payload.event === 'finding' && payload.data) {
      const findingData = payload.data;
      if (findingData.node_id && findingData.finding && !displayFindings.some(f => 
        f.node_id === findingData.node_id && 
        f.source === findingData.source &&
        f.finding?.title === findingData.finding.title)) {
        
        console.log(`[${new Date().toISOString()}] 🔍 Adding new finding for node ${findingData.node_id}`);
        
        const newFindings = [...displayFindings, findingData];
        setDisplayFindings(newFindings);
        
        if (findingData.source && !displaySources.includes(findingData.source)) {
          const newSources = [...displaySources, findingData.source];
          setDisplaySources(newSources);
          
          try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(newSources));
            if (sessionId) {
              const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
              localStorage.setItem(sessionSourcesKey, JSON.stringify(newSources));
              
              saveSessionData(sessionId, {
                sources: newSources
              });
            }
          } catch (e) {
            console.error("Error saving sources to cache:", e);
          }
        }
        
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
    
    if (payload.event === 'synthesis' || payload.event_type === 'synthesis') {
      const synthesisData = payload.data as SynthesisData;
      if (synthesisData && synthesisData.node_id) {
        console.log(`[${new Date().toISOString()}] 🧠 Adding synthesis for node ${synthesisData.node_id}`);
        
        setSynthesesData(prev => ({
          ...prev,
          [synthesisData.node_id]: synthesisData
        }));
        
        try {
          if (sessionId) {
            const sessionSynthesisKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SYNTHESIS_CACHE, sessionId);
            const updatedSyntheses = { 
              ...JSON.parse(localStorage.getItem(sessionSynthesisKey) || '{}'), 
              [synthesisData.node_id]: synthesisData 
            };
            localStorage.setItem(sessionSynthesisKey, JSON.stringify(updatedSyntheses));
            
            saveSessionData(sessionId, {
              syntheses: updatedSyntheses
            });
          }
        } catch (e) {
          console.error("Error saving synthesis to cache:", e);
        }
      }
    }
    
    if (payload.event === 'answer') {
      const answerData = payload.data;
      if (answerData && answerData.node_id) {
        console.log(`[${new Date().toISOString()}] 📝 Adding answer for node ${answerData.node_id}`);
        
        setAnswersData(prev => ({
          ...prev,
          [answerData.node_id]: answerData.answer
        }));
        
        try {
          if (sessionId) {
            const sessionAnswersKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWERS_CACHE, sessionId);
            const updatedAnswers = { 
              ...JSON.parse(localStorage.getItem(sessionAnswersKey) || '{}'), 
              [answerData.node_id]: answerData.answer 
            };
            localStorage.setItem(sessionAnswersKey, JSON.stringify(updatedAnswers));
            
            saveSessionData(sessionId, {
              answers: updatedAnswers
            });
          }
        } catch (e) {
          console.error("Error saving answer to cache:", e);
        }
      }
    }
    
    if (payload.event === 'source') {
      const sourceData = payload.data;
      if (sourceData && sourceData.source && !displaySources.includes(sourceData.source)) {
        console.log(`[${new Date().toISOString()}] 🔗 Adding new source: ${sourceData.source}`);
        
        const newSources = [...displaySources, sourceData.source];
        setDisplaySources(newSources);
        
        try {
          localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(newSources));
          if (sessionId) {
            const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
            localStorage.setItem(sessionSourcesKey, JSON.stringify(newSources));
            
            saveSessionData(sessionId, {
              sources: newSources
            });
          }
        } catch (e) {
          console.error("Error saving sources to cache:", e);
        }
      }
    }
  }, [sessionId, displayReasoningPath.length, displayFindings.length, displaySources]);
  
  const handleResearchEvents = useCallback(() => {
    setForcedUpdate(prev => prev + 1);
  }, []);
  
  const handleHeartbeat = useCallback(() => {
    if (isLoading) {
      setForcedUpdate(prev => prev + 1);
    }
  }, [isLoading]);
  
  useEffect(() => {
    window.addEventListener('research_state_update', handleRealtimeUpdate as EventListener);
    window.addEventListener('research-new-event', handleResearchEvents as EventListener);
    window.addEventListener('research-heartbeat', handleHeartbeat as EventListener);
    
    return () => {
      window.removeEventListener('research_state_update', handleRealtimeUpdate as EventListener);
      window.removeEventListener('research-new-event', handleResearchEvents as EventListener);
      window.removeEventListener('research-heartbeat', handleHeartbeat as EventListener);
    };
  }, [handleRealtimeUpdate, handleResearchEvents, handleHeartbeat]);
  
  useEffect(() => {
    if (!sessionId) return;
    
    try {
      const sessionData = getSessionData(sessionId);
      
      if (sessionData) {
        console.log(`[${new Date().toISOString()}] 📂 Loading session data for ${sessionId}`);
        
        if (sessionData.reasoningPath && Array.isArray(sessionData.reasoningPath)) {
          if (reasoningPath.length === 0 || sessionData.reasoningPath.length > reasoningPath.length) {
            setDisplayReasoningPath(sessionData.reasoningPath);
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${sessionData.reasoningPath.length} reasoning steps from session data`);
          }
        }
        
        if (sessionData.findings && Array.isArray(sessionData.findings)) {
          if (findings.length === 0 || sessionData.findings.length > findings.length) {
            setDisplayFindings(sessionData.findings);
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${sessionData.findings.length} findings from session data`);
          }
        }
        
        if (sessionData.sources && Array.isArray(sessionData.sources)) {
          if (sources.length === 0 || sessionData.sources.length > sources.length) {
            setDisplaySources(sessionData.sources);
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${sessionData.sources.length} sources from session data`);
          }
        }
        
        if (sessionData.syntheses && typeof sessionData.syntheses === 'object') {
          setSynthesesData(sessionData.syntheses);
          console.log(`[${new Date().toISOString()}] 📂 Loaded syntheses data for ${Object.keys(sessionData.syntheses).length} nodes`);
        }
        
        if (sessionData.answers && typeof sessionData.answers === 'object') {
          setAnswersData(sessionData.answers);
          console.log(`[${new Date().toISOString()}] 📂 Loaded answers data for ${Object.keys(sessionData.answers).length} nodes`);
        }
        
        setSessionLoaded(true);
        return;
      }
      
      const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
      const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
      const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
      const sessionSynthesisKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SYNTHESIS_CACHE, sessionId);
      const sessionAnswersKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWERS_CACHE, sessionId);
      
      const sessionPathCache = localStorage.getItem(sessionPathKey);
      const sessionFindingsCache = localStorage.getItem(sessionFindingsKey);
      const sessionSourcesCache = localStorage.getItem(sessionSourcesKey);
      const sessionSynthesisCache = localStorage.getItem(sessionSynthesisKey);
      const sessionAnswersCache = localStorage.getItem(sessionAnswersKey);
      
      if (sessionPathCache) {
        const parsedPath = JSON.parse(sessionPathCache);
        if (Array.isArray(parsedPath) && parsedPath.length > 0) {
          if (reasoningPath.length === 0 || parsedPath.length > reasoningPath.length) {
            setDisplayReasoningPath(parsedPath);
          }
        }
      }
      
      if (sessionFindingsCache) {
        const parsedFindings = JSON.parse(sessionFindingsCache);
        if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
          if (findings.length === 0 || parsedFindings.length > findings.length) {
            setDisplayFindings(parsedFindings);
          }
        }
      }
      
      if (sessionSourcesCache) {
        const parsedSources = JSON.parse(sessionSourcesCache);
        if (Array.isArray(parsedSources) && parsedSources.length > 0) {
          if (sources.length === 0 || parsedSources.length > sources.length) {
            setDisplaySources(parsedSources);
          }
        }
      }
      
      if (sessionSynthesisCache) {
        const parsedSynthesis = JSON.parse(sessionSynthesisCache);
        if (typeof parsedSynthesis === 'object') {
          setSynthesesData(parsedSynthesis);
        }
      }
      
      if (sessionAnswersCache) {
        const parsedAnswers = JSON.parse(sessionAnswersCache);
        if (typeof parsedAnswers === 'object') {
          setAnswersData(parsedAnswers);
        }
      }
      
      setSessionLoaded(true);
    } catch (e) {
      console.error(`[${new Date().toISOString()}] Error loading data from session cache:`, e);
      toast.error("Failed to load previous session data. Some information may be missing.");
    }
  }, [sessionId, reasoningPath, findings, sources]);
  
  useEffect(() => {
    if (sessionLoaded) return;
    
    try {
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
      
      if (displaySources.length === 0 && sources.length === 0) {
        const sourcesCache = localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
        if (sourcesCache) {
          const parsedSources = JSON.parse(sourcesCache);
          if (Array.isArray(parsedSources) && parsedSources.length > 0) {
            setDisplaySources(parsedSources);
          }
        }
      }
    } catch (e) {
      console.error("Error loading from global cache:", e);
    }
  }, [sessionLoaded, displayReasoningPath.length, displayFindings.length, reasoningPath.length, findings.length, sources.length]);
  
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
    
    if (sources.length > 0) {
      setDisplaySources(sources);
      
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(sources));
        
        if (sessionId) {
          const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
          localStorage.setItem(sessionSourcesKey, JSON.stringify(sources));
          
          saveSessionData(sessionId, {
            sources: sources
          });
        }
      } catch (e) {
        console.error("Error saving sources to cache:", e);
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
    
    if (sessionId && Object.keys(synthesesData).length > 0) {
      try {
        const synthesesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SYNTHESIS_CACHE, sessionId);
        localStorage.setItem(synthesesKey, JSON.stringify(synthesesData));
        
        saveSessionData(sessionId, {
          syntheses: synthesesData
        });
      } catch (e) {
        console.error("Error saving syntheses data to cache:", e);
      }
    }
    
    if (sessionId && Object.keys(answersData).length > 0) {
      try {
        const answersKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWERS_CACHE, sessionId);
        localStorage.setItem(answersKey, JSON.stringify(answersData));
        
        saveSessionData(sessionId, {
          answers: answersData
        });
      } catch (e) {
        console.error("Error saving answers data to cache:", e);
      }
    }
  }, [reasoningPath, findings, sources, sessionId, rawData, synthesesData, answersData]);

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
  
  const findingsByDomainKeyword: Record<string, Finding[]> = {};
  displayFindings.forEach(finding => {
    try {
      if (finding.source && finding.source.startsWith('http')) {
        const url = new URL(finding.source);
        const domain = url.hostname.replace('www.', '');
        const domainKey = domain.split('.')[0].toLowerCase();
        
        if (!findingsByDomainKeyword[domainKey]) {
          findingsByDomainKeyword[domainKey] = [];
        }
        
        if (!finding.node_id || !findingsByNodeId[finding.node_id]?.includes(finding)) {
          findingsByDomainKeyword[domainKey].push(finding);
        }
      }
    } catch {
      // Ignore invalid URLs
    }
  });
  
  return (
    <div className="space-y-4 px-2 md:px-4 mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          Research Planning
          {isLoading && <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>}
        </h3>
        <Badge variant="outline" className="text-xs">
          {displayReasoningPath.length} step{displayReasoningPath.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pb-8 md:pb-20 reasoning-steps-container">
        {displayReasoningPath.map((step, index) => {
          const nodeId = step.match(/node(?:_id|[\s_]id)?:?\s*['"]?([a-zA-Z0-9_-]+)['"]?/i)?.[1] || 
                      step.match(/node\s+(\d+)|#(\d+)/i)?.[1] || 
                      step.match(/step-(\d+)/i)?.[1] ||
                      `${index + 1}`;
                      
          const stepRawData = nodeId ? rawData[nodeId] : undefined;
          
          let answerData = answersData[nodeId] || null;
          if (!answerData && stepRawData) {
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
          
          const synthesisData = synthesesData[nodeId] || null;
          
          const nodeFindings = findingsByNodeId[nodeId] || [];
          
          const keywordFindings: Finding[] = [];
          
          Object.entries(findingsByDomainKeyword).forEach(([keyword, domainFindings]) => {
            if (step.toLowerCase().includes(keyword)) {
              domainFindings.forEach(finding => {
                if (!nodeFindings.includes(finding) && !keywordFindings.includes(finding)) {
                  keywordFindings.push(finding);
                }
              });
            }
          });
          
          const urlFindings = displayFindings.filter(finding => {
            if (nodeFindings.includes(finding) || keywordFindings.includes(finding)) return false;
            try {
              const url = new URL(finding.source);
              const domain = url.hostname.replace('www.', '');
              return step.toLowerCase().includes(domain.split('.')[0]);
            } catch {
              return false;
            }
          });
          
          const relevantFindings = [...nodeFindings, ...keywordFindings, ...urlFindings];
          
          const isNewStep = index === displayReasoningPath.length - 1 && isLoading;
          
          const stableKey = `step-${nodeId}-${index}-${forcedUpdate > 0 ? '1' : '0'}`;
          
          return (
            <ReasoningStep
              key={stableKey}
              step={step}
              index={index}
              sources={displaySources}
              findings={relevantFindings}
              defaultExpanded={index === displayReasoningPath.length - 1 || relevantFindings.length > 0}
              isActive={isActive && index === displayReasoningPath.length - 1}
              rawData={stepRawData}
              sessionId={sessionId}
              answer={answerData}
              synthesis={synthesisData ? synthesisData.synthesis : null}
              className={cn(
                relevantFindings.length > 0 && "ring-1 ring-primary/10",
                isNewStep && "reasoning-step-new"
              )}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ReasoningPath;
