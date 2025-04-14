import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Copy, CheckCircle2, MessageSquare, Lightbulb, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey, saveSessionData } from "@/lib/constants";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getLatestSessionState } from "@/services/researchStateService";
import ResearchReport from "./ResearchReport";

export type Finding = {
  content?: string;
  source: string;
  finding?: {
    title?: string;
    summary?: string;
    confidence_score?: number;
  };
  node_id?: string;
};

export type ResearchResult = {
  query: string;
  answer: string;
  sources: string[];
  reasoning_path: string[];
  confidence: number;
  session_id?: string;
  research_id?: string;
  findings?: Finding[];
  syntheses?: Record<string, any>;
};

const SourcesList = ({ sources, findings }: { sources: string[]; findings?: Finding[] }) => {
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  
  const findingsBySource = (findings || []).reduce((acc: Record<string, Finding[]>, finding) => {
    if (!finding.source) return acc;
    
    if (!acc[finding.source]) {
      acc[finding.source] = [];
    }
    
    if (!acc[finding.source].some(f => 
      f.finding?.title === finding.finding?.title && 
      f.finding?.summary === finding.finding?.summary
    )) {
      acc[finding.source].push(finding);
    }
    
    return acc;
  }, {});
  
  const toggleSourceExpanded = (source: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [source]: !prev[source]
    }));
  };

  return (
    <div className="mt-4 space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground mb-2">Sources:</h3>
      <div className="space-y-3">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sources yet</p>
        ) : (
          sources.map((source, index) => {
            const sourceFindings = findingsBySource[source] || [];
            const isExpanded = expandedSources[source] !== false;
            
            return (
              <Collapsible 
                key={`${source}-${index}`} 
                open={isExpanded}
                onOpenChange={() => toggleSourceExpanded(source)}
                className="border border-muted-foreground/10 rounded-md overflow-hidden source-item neo-morphism bg-background"
              >
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center flex-1 min-w-0">
                    {sourceFindings.length > 0 && (
                      <CollapsibleTrigger asChild>
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
                      </CollapsibleTrigger>
                    )}
                    <span className="text-sm truncate">{source}</span>
                  </div>
                  
                  <div className="flex items-center ml-2 space-x-2">
                    {sourceFindings.length > 0 && (
                      <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                        {sourceFindings.length} 
                      </Badge>
                    )}
                    <a 
                      href={source} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="ml-2 text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
                
                {sourceFindings.length > 0 && (
                  <CollapsibleContent>
                    <div className="p-3 pt-0 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                      {sourceFindings.map((finding, i) => (
                        <div key={`finding-${i}`} className="mt-3 p-3 rounded-md border border-muted bg-background/90">
                          {finding.finding?.title && (
                            <h4 className="text-sm font-medium mb-1">{finding.finding.title}</h4>
                          )}
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {finding.finding?.summary || finding.content || "No content available"}
                          </p>
                          {finding.finding?.confidence_score && (
                            <Badge variant="outline" className="mt-2 text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300">
                              Confidence: {Math.round(finding.finding.confidence_score * 100)}%
                            </Badge>
                          )}
                          {finding.node_id && (
                            <div className="mt-2 flex items-center">
                              <Lightbulb className="h-3 w-3 text-amber-500 mr-1" />
                              <span className="text-xs text-muted-foreground">Step {finding.node_id}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
};

const ReasoningPath = ({ path, syntheses }: { path: string[]; syntheses?: Record<string, any> }) => {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  
  const stepTypes = [
    { pattern: "search", color: "bg-violet-100 dark:bg-violet-900/80 border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-300" },
    { pattern: "reason", color: "bg-amber-100 dark:bg-amber-900/80 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300" },
    { pattern: "synthe", color: "bg-emerald-100 dark:bg-emerald-900/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300" },
    { pattern: "read", color: "bg-blue-100 dark:bg-blue-900/80 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300" },
    { pattern: "objective", color: "bg-indigo-100 dark:bg-indigo-900/80 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300" },
    { pattern: "plan", color: "bg-sky-100 dark:bg-sky-900/80 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-300" },
    { pattern: "analyzing", color: "bg-orange-100 dark:bg-orange-900/80 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-300" },
    { pattern: "process", color: "bg-rose-100 dark:bg-rose-900/80 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300" }
  ];

  const getStepColor = (step: string): string => {
    const stepLower = step.toLowerCase();
    const matchedType = stepTypes.find(type => stepLower.includes(type.pattern));
    return matchedType ? matchedType.color : "bg-gray-100 dark:bg-gray-800/90 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-300";
  };
  
  const toggleStepExpanded = (stepId: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  return (
    <div className="mt-4">
      <h3 className="font-medium text-sm text-muted-foreground mb-2">Reasoning Path:</h3>
      <div className="space-y-3 mt-2">
        {path.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reasoning path available</p>
        ) : (
          path.map((step, index) => {
            const nodeId = step.match(/node(?:_id|[\s_]id)?:?\s*['"]?([a-zA-Z0-9_-]+)['"]?/i)?.[1] || 
                        step.match(/node\s+(\d+)|#(\d+)/i)?.[1] || 
                        step.match(/step-(\d+)/i)?.[1] ||
                        `${index + 1}`;
                        
            const hasSynthesis = syntheses && syntheses[nodeId];
            const isExpanded = expandedSteps[nodeId] || false;
            
            return (
              <div key={`step-${index}`} className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-medium">{index + 1}</span>
                </div>
                <Collapsible 
                  open={isExpanded} 
                  onOpenChange={() => toggleStepExpanded(nodeId)}
                  className="flex-1"
                >
                  <div className={`p-3 rounded-md border-l-4 ${getStepColor(step)}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm flex-1">{step}</p>
                      {hasSynthesis && (
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-0 h-5 w-5 ml-2 hover:bg-transparent"
                          >
                            <Lightbulb className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                  </div>
                  
                  {hasSynthesis && (
                    <CollapsibleContent>
                      <div className="mt-2 p-3 rounded-md bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
                        <h4 className="font-medium text-xs uppercase text-emerald-800 dark:text-emerald-300 mb-1">Synthesis</h4>
                        <p className="text-sm whitespace-pre-wrap text-emerald-900 dark:text-emerald-100">
                          {syntheses[nodeId].synthesis}
                        </p>
                        {syntheses[nodeId].confidence && (
                          <Badge className="mt-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                            Confidence: {Math.round(syntheses[nodeId].confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const ResearchAnswer = ({ answer }: { answer: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="relative mt-4">
      <div className="absolute top-2 right-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={copyToClipboard} 
          className="h-8 w-8 p-0"
        >
          {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
        </Button>
      </div>
      <div className="p-4 rounded-md bg-background neo-morphism overflow-auto max-h-[500px]">
        <p className="text-sm whitespace-pre-wrap">{answer}</p>
      </div>
    </div>
  );
};

export type ReportSynthesis = {
  synthesis: string;
  confidence: number;
  timestamp: string;
  node_id: string;
  query: string;
};

export type FinalReport = {
  query: string;
  synthesis: string;
  confidence: number;
  reasoning_path: string[];
  findings: Finding[];
  sources: string[];
  timestamp: string;
};

const ResearchResults = ({ result }: { result: ResearchResult | null }) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [currentResult, setCurrentResult] = useState<ResearchResult | null>(result);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [reportSyntheses, setReportSyntheses] = useState<ReportSynthesis[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [isReportComplete, setIsReportComplete] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  
  useEffect(() => {
    if (result) {
      const isNewSession = !currentResult || 
                          result.session_id !== currentResult.session_id || 
                          result.query !== currentResult.query;
                          
      if (isNewSession) {
        console.log(`[${new Date().toISOString()}] 🔄 Result props changed:`, {
          newQuery: result.query,
          newSessionId: result.session_id,
          oldQuery: currentResult?.query,
          oldSessionId: currentResult?.session_id
        });
        
        setCurrentResult(result);
        if (result.session_id) {
          setCurrentSessionId(result.session_id);
        }
        
        setReportSyntheses([]);
        setFinalReport(null);
        setIsReportComplete(false);
        setShowReportDialog(false);
      }
    }
  }, [result, currentResult]);
  
  useEffect(() => {
    const handleSessionSelected = async (event: CustomEvent) => {
      if (!event.detail || !event.detail.sessionId) return;
      
      const { sessionId, query, historyItem } = event.detail;
      setIsLoading(true);
      
      console.log(`[${new Date().toISOString()}] 📢 Session selected:`, { sessionId, query });
      
      if (currentSessionId === sessionId) {
        console.log(`[${new Date().toISOString()}] ⚠️ Session ${sessionId} already selected, reloading data`);
      }
      
      try {
        const latestState = await getLatestSessionState(sessionId);
        
        if (latestState) {
          console.log(`[${new Date().toISOString()}] ✅ Retrieved state for session from database:`, sessionId);
          
          setCurrentSessionId(sessionId);
          
          const processedFindings: Finding[] = Array.isArray(latestState.findings) 
            ? latestState.findings.map(finding => ({
                source: finding.source,
                content: finding.content || "",
                finding: finding.finding,
                node_id: finding.node_id,
                ...(finding as any)
              }))
            : [];

          const processedSyntheses: Record<string, any> = 
            typeof latestState.user_model === 'object' && latestState.user_model !== null 
              ? latestState.user_model as Record<string, any> 
              : {};
          
          const completeAnswer: ResearchResult = {
            query: latestState.query || query,
            answer: latestState.answer || "",
            sources: latestState.sources || [],
            reasoning_path: latestState.reasoning_path || [],
            findings: processedFindings,
            syntheses: processedSyntheses,
            confidence: latestState.completed_nodes ? (latestState.completed_nodes / 10) : 0.8,
            session_id: sessionId,
            research_id: latestState.research_id
          };
          
          setCurrentResult(completeAnswer);
          
          try {
            localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, JSON.stringify(latestState));
            localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(completeAnswer));
            
            if (sessionId) {
              const sessionStateKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId);
              localStorage.setItem(sessionStateKey, JSON.stringify(latestState));
              
              const sessionAnswerKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, sessionId);
              localStorage.setItem(sessionAnswerKey, JSON.stringify(completeAnswer));
              
              const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
              localStorage.setItem(sessionFindingsKey, JSON.stringify(processedFindings));
            }
          } catch (e) {
            console.error("Error caching session data:", e);
          }
        } else {
          console.log(`[${new Date().toISOString()}] ⚠️ No database state found, checking local storage for session:`, sessionId);
          
          setCurrentSessionId(sessionId);
          
          const sessionAnswerKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, sessionId);
          const cachedSessionAnswer = localStorage.getItem(sessionAnswerKey);
          
          if (cachedSessionAnswer) {
            try {
              const parsedAnswer = JSON.parse(cachedSessionAnswer);
              console.log(`[${new Date().toISOString()}] ✅ Found cached answer for session:`, sessionId);
              
              if (parsedAnswer.query === query) {
                setCurrentResult(parsedAnswer);
              } else {
                console.warn(`[${new Date().toISOString()}] ⚠️ Query mismatch in cached answer: expected "${query}", found "${parsedAnswer.query}"`);
                setCurrentResult({
                  ...parsedAnswer,
                  query: query
                });
              }
            } catch (e) {
              console.error("Error parsing cached answer:", e);
              createFallbackResult(sessionId, query);
            }
          } else {
            createFallbackResult(sessionId, query);
          }
        }
      } catch (error) {
        console.error("Error processing session selection:", error);
        toast.error("Failed to load session data. Try refreshing the page.");
        createFallbackResult(sessionId, query);
      } finally {
        setIsLoading(false);
      }
    };
    
    const createFallbackResult = (sessionId: string, query: string) => {
      console.log(`[${new Date().toISOString()}] ℹ️ Creating fallback result for session:`, sessionId);
      
      setCurrentResult({
        query: query,
        answer: "Failed to load complete research data. Some information may be missing.",
        sources: [],
        reasoning_path: [],
        confidence: 0.5,
        session_id: sessionId,
        findings: []
      });
      
      try {
        const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
        const cachedSources = localStorage.getItem(sessionSourcesKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
        
        const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
        const cachedPath = localStorage.getItem(sessionPathKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE);
        
        const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
        const cachedFindings = localStorage.getItem(sessionFindingsKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE);
        
        if (cachedSources || cachedPath || cachedFindings) {
          console.log(`[${new Date().toISOString()}] 🔄 Building state from cached components`);
          
          setCurrentResult(prev => ({
            ...prev,
            sources: cachedSources ? JSON.parse(cachedSources) : [],
            reasoning_path: cachedPath ? JSON.parse(cachedPath) : [],
            findings: cachedFindings ? JSON.parse(cachedFindings) : []
          }));
        }
      } catch (e) {
        console.error("Error building state from components:", e);
      }
    };
    
    window.addEventListener('session-selected', handleSessionSelected as EventListener);
    
    return () => {
      window.removeEventListener('session-selected', handleSessionSelected as EventListener);
    };
  }, [currentSessionId]);
  
  const handleRealtimeUpdate = useCallback((event: CustomEvent) => {
    if (!currentResult?.session_id) return;
    
    const payload = event.detail?.payload;
    if (!payload) return;
    
    if (payload.event_type === "report_update" && payload.data) {
      console.log(`[${new Date().toISOString()}] 📊 Received report update:`, payload.data);
      
      const newSynthesis: ReportSynthesis = {
        synthesis: payload.data.synthesis || "",
        confidence: payload.data.confidence || 0,
        timestamp: payload.data.timestamp || new Date().toISOString(),
        node_id: payload.data.node_id || "",
        query: payload.data.query || currentResult.query
      };
      
      setReportSyntheses(prev => [...prev, newSynthesis]);
      
      if (!showReportDialog && reportSyntheses.length === 0) {
        setShowReportDialog(true);
      }
      
      return;
    }
    
    if (payload.event === "final_report" && payload.data) {
      console.log(`[${new Date().toISOString()}] 📊 Received final report:`, payload.data);
      
      const report: FinalReport = {
        query: payload.data.query || currentResult.query,
        synthesis: payload.data.synthesis || "",
        confidence: payload.data.confidence || 0,
        reasoning_path: payload.data.reasoning_path || [],
        findings: payload.data.findings || [],
        sources: payload.data.sources || [],
        timestamp: payload.data.timestamp || new Date().toISOString()
      };
      
      setFinalReport(report);
      setIsReportComplete(true);
      setShowReportDialog(true);
      
      return;
    }
    
    if (payload.table !== 'research_states') return;
    
    if (payload.new && payload.new.session_id === currentResult.session_id) {
      console.log(`[${new Date().toISOString()}] 🔄 Processing result update for session ${currentResult.session_id}`);
      
      let shouldUpdate = false;
      const updates: Partial<ResearchResult> = {};
      
      if (payload.new.answer && payload.new.answer !== currentResult.answer) {
        updates.answer = payload.new.answer;
        shouldUpdate = true;
      }
      
      if (payload.new.sources && Array.isArray(payload.new.sources) && 
          (payload.new.sources.length > (currentResult.sources?.length || 0))) {
        updates.sources = payload.new.sources;
        shouldUpdate = true;
      }
      
      if (payload.new.reasoning_path && Array.isArray(payload.new.reasoning_path) && 
          (payload.new.reasoning_path.length > (currentResult.reasoning_path?.length || 0))) {
        updates.reasoning_path = payload.new.reasoning_path;
        shouldUpdate = true;
      }
      
      if (payload.new.findings && Array.isArray(payload.new.findings) && 
          (payload.new.findings.length > (currentResult.findings?.length || 0))) {
        updates.findings = payload.new.findings;
        shouldUpdate = true;
      }
      
      if (payload.new.user_model && typeof payload.new.user_model === 'object') {
        updates.syntheses = payload.new.user_model;
        shouldUpdate = true;
      }
      
      if (shouldUpdate) {
        console.log(`[${new Date().toISOString()}] ✏️ Updating result with real-time data:`, updates);
        
        const updatedResult: ResearchResult = {
          ...currentResult,
          ...updates,
        };
        
        setCurrentResult(updatedResult);
        
        try {
          localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(updatedResult));
          if (currentResult.session_id) {
            const sessionCacheKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, currentResult.session_id);
            localStorage.setItem(sessionCacheKey, JSON.stringify(updatedResult));
            
            saveSessionData(currentResult.session_id, {
              answer: updatedResult,
              sources: updatedResult.sources,
              reasoningPath: updatedResult.reasoning_path,
              findings: updatedResult.findings,
              syntheses: updatedResult.syntheses
            });
          }
        } catch (e) {
          console.error("Error caching updated research result:", e);
        }
        
        if (updates.answer) {
          toast.info("Research answer has been updated", {
            className: "realtime-update-toast"
          });
        } else if (updates.sources) {
          toast.info(`${updates.sources.length} sources now available`, {
            className: "realtime-update-toast"
          });
        } else if (updates.reasoning_path) {
          toast.info(`Research progress: ${updates.reasoning_path.length} steps completed`, {
            className: "realtime-update-toast"
          });
        }
      }
    }
  }, [currentResult, showReportDialog, reportSyntheses.length]);
  
  useEffect(() => {
    window.addEventListener('research_state_update', handleRealtimeUpdate as EventListener);
    
    return () => {
      window.removeEventListener('research_state_update', handleRealtimeUpdate as EventListener);
    };
  }, [handleRealtimeUpdate]);
  
  useEffect(() => {
    if (currentResult) {
      try {
        console.log(`[${new Date().toISOString()}] 💾 Caching result for query:`, currentResult.query);
        
        localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(currentResult));
        
        if (currentResult.session_id) {
          saveSessionData(currentResult.session_id, {
            answer: currentResult,
            sources: currentResult.sources,
            reasoningPath: currentResult.reasoning_path,
            researchId: currentResult.research_id,
            findings: currentResult.findings,
            syntheses: currentResult.syntheses,
            state: {
              query: currentResult.query,
              session_id: currentResult.session_id,
              research_id: currentResult.research_id,
              created_at: new Date().toISOString()
            }
          });
          
          const sessionCacheKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, currentResult.session_id);
          localStorage.setItem(sessionCacheKey, JSON.stringify(currentResult));
          
          const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, currentResult.session_id);
          localStorage.setItem(sessionSourcesKey, JSON.stringify(currentResult.sources));
          
          const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, currentResult.session_id);
          localStorage.setItem(sessionPathKey, JSON.stringify(currentResult.reasoning_path));
          
          if (currentResult.findings) {
            const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, currentResult.session_id);
            localStorage.setItem(sessionFindingsKey, JSON.stringify(currentResult.findings));
          }
        }
      } catch (e) {
        console.error("Error caching research result:", e);
      }
    }
  }, [currentResult]);

  useEffect(() => {
    if (currentResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentResult]);

  if (!currentResult) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No research results yet. Start a query to see results here.</p>
      </div>
    );
  }

  const handleSessionClick = () => {
    if (currentResult.session_id) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, currentResult.session_id);
      
      window.dispatchEvent(new CustomEvent('session-selected', { 
        detail: { 
          sessionId: currentResult.session_id,
          query: currentResult.query,
          isNew: false
        }
      }));
      
      navigate(`/research/${currentResult.session_id}`);
    }
  };

  return (
    <div ref={resultRef} className="animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-1">Research Results</h2>
          <div className="flex items-center space-x-2">
            {(reportSyntheses.length > 0 || finalReport) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 text-primary"
                onClick={() => setShowReportDialog(true)}
              >
                <FileText className="h-4 w-4" />
                <span>View Report</span>
              </Button>
            )}
            
            {currentResult.session_id && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1 text-primary"
                onClick={handleSessionClick}
              >
                <MessageSquare className="h-4 w-4" />
                <span>View Session</span>
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Query: {currentResult.query}</p>
      </div>

      <Tabs defaultValue="answer">
        <TabsList className="mb-4">
          <TabsTrigger value="answer">Answer</TabsTrigger>
          <TabsTrigger value="sources">
            Sources ({currentResult.sources.length})
            {currentResult.findings && currentResult.findings.length > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">
                {currentResult.findings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reasoning">Reasoning Path</TabsTrigger>
        </TabsList>
        
        <TabsContent value="answer">
          <ResearchAnswer answer={currentResult.answer} />
        </TabsContent>
        
        <TabsContent value="sources">
          <SourcesList 
            sources={currentResult.sources} 
            findings={currentResult.findings} 
          />
        </TabsContent>
        
        <TabsContent value="reasoning">
          <ReasoningPath 
            path={currentResult.reasoning_path} 
            syntheses={currentResult.syntheses}
          />
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 text-sm text-right text-muted-foreground">
        <span>Confidence score: {(currentResult.confidence * 100).toFixed(1)}%</span>
      </div>
      
      {(reportSyntheses.length > 0 || finalReport) && (
        <ResearchReport 
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          syntheses={reportSyntheses}
          finalReport={finalReport}
          isComplete={isReportComplete}
          sessionId={currentSessionId}
        />
      )}
    </div>
  );
};

export default ResearchResults;
