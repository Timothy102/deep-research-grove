import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Copy, CheckCircle2, MessageSquare, Lightbulb, FileText, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey, saveSessionData } from "@/lib/constants";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getLatestSessionState } from "@/services/researchStateService";
import LiveReportView from "./LiveReportView";
import type { Finding, ReportSynthesis, FinalReport } from "@/types/research";

type ResearchResult = {
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

  useEffect(() => {
    const newExpandedState = { ...expandedSources };
    let hasChanges = false;
    
    sources.forEach(source => {
      if (expandedSources[source] === undefined) {
        newExpandedState[source] = true;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setExpandedSources(newExpandedState);
    }
  }, [sources, expandedSources]);

  const toggleSourceExpanded = (source: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [source]: !prev[source]
    }));
  };

  const isSourceUrl = (source: string) => {
    return source.startsWith('http') || source.startsWith('www.');
  };

  const getSourceDomain = (source: string) => {
    try {
      if (isSourceUrl(source)) {
        const url = new URL(source.startsWith('www.') ? `https://${source}` : source);
        return url.hostname.replace('www.', '');
      }
    } catch (e) {}
    
    return source;
  };

  const findingsBySource = findings ? findings.reduce((acc: Record<string, Finding[]>, finding) => {
    if (!finding || !finding.source) return acc;
    
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
  }, {}) : {};

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Sources</h2>
      
      {sources.length === 0 ? (
        <div className="text-muted-foreground text-center py-6">
          <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>No sources available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source, index) => (
            <Collapsible 
              key={index} 
              open={expandedSources[source]} 
              onOpenChange={() => toggleSourceExpanded(source)}
              className="border rounded-lg p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-6 w-6 rounded-full">
                      {expandedSources[source] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {isSourceUrl(source) ? (
                        <a 
                          href={source.startsWith('http') ? source : `https://${source}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:underline truncate"
                        >
                          <span className="truncate">{getSourceDomain(source)}</span>
                          <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-sm font-medium truncate">
                          {source}
                        </span>
                      )}
                      
                      <Badge variant="outline" className="text-xs">
                        {findingsBySource[source]?.length || 0} findings
                      </Badge>
                    </div>
                    
                    {isSourceUrl(source) && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {source}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <CollapsibleContent className="mt-3 space-y-2">
                {findingsBySource[source] && findingsBySource[source].length > 0 ? (
                  findingsBySource[source].map((finding, findingIndex) => (
                    <div key={findingIndex} className="pl-6 border-l-2 border-gray-200">
                      <div className="p-2 bg-gray-50 rounded">
                        {finding.finding?.title && (
                          <div className="text-sm font-medium mb-1 flex items-center">
                            <Lightbulb className="h-4 w-4 mr-1 text-amber-500" />
                            {finding.finding.title}
                          </div>
                        )}
                        
                        {finding.finding?.summary && (
                          <p className="text-sm text-gray-700">
                            {finding.finding.summary}
                          </p>
                        )}
                        
                        {!finding.finding?.summary && finding.content && (
                          <p className="text-sm text-gray-700">
                            {finding.content}
                          </p>
                        )}
                        
                        {finding.finding?.confidence_score !== undefined && (
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500">Confidence:</span>
                            <div className="w-16 h-2 bg-gray-200 rounded ml-2">
                              <div 
                                className="h-full bg-green-500 rounded" 
                                style={{ width: `${Math.min(100, Math.max(0, finding.finding.confidence_score * 100))}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pl-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Source referenced, but no specific findings extracted.
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
};

const ReasoningPath = ({ path, syntheses }: { path: string[]; syntheses?: Record<string, any> }) => {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const newExpandedState = { ...expandedSteps };
    let hasChanges = false;
    
    path.forEach((step, index) => {
      if (expandedSteps[index.toString()] === undefined) {
        newExpandedState[index.toString()] = index === path.length - 1;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setExpandedSteps(newExpandedState);
    }
  }, [path, expandedSteps]);

  const toggleStepExpanded = (stepIndex: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepIndex]: !prev[stepIndex]
    }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Reasoning Path</h2>
      
      {path.length === 0 ? (
        <div className="text-muted-foreground text-center py-6">
          <Lightbulb className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>No reasoning path available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {path.map((step, index) => {
            const stepKey = index.toString();
            const synthesis = syntheses && syntheses[step] ? syntheses[step] : null;
            
            return (
              <Collapsible 
                key={index} 
                open={expandedSteps[stepKey]} 
                onOpenChange={() => toggleStepExpanded(stepKey)}
                className="border rounded-lg"
              >
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-6 w-6 rounded-full">
                          {expandedSteps[stepKey] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      
                      <div className="flex-1">
                        <div className="flex items-center">
                          <Badge variant="outline" className="mr-2">
                            Step {index + 1}
                          </Badge>
                          <span className="text-sm font-medium">{step}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <CollapsibleContent className="mt-3 pl-8">
                    {synthesis ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {synthesis.synthesis || synthesis.content || synthesis}
                        </p>
                        
                        {synthesis.confidence && (
                          <div className="mt-2">
                            <Badge variant="outline">
                              Confidence: {Math.round(synthesis.confidence * 100)}%
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No detailed information available for this step.
                      </p>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ResearchAnswer = ({ answer }: { answer: string }) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(answer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  return (
    <div className="relative">
      <div className="absolute top-0 right-0">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={copyToClipboard}
          className="text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

export type LocalReportSynthesis = {
  synthesis: string;
  confidence: number;
  timestamp: string;
  node_id: string;
  query: string;
};

export type LocalFinalReport = {
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
    
    if (payload.event === "report_update" || payload.event_type === "report_update") {
      const data = payload.data || payload.new?.data;
      if (!data) return;
      
      console.log(`[${new Date().toISOString()}] 📊 Received report update:`, data);
      
      const newSynthesis: ReportSynthesis = {
        synthesis: data.synthesis || "",
        confidence: data.confidence || 0,
        timestamp: data.timestamp || new Date().toISOString(),
        node_id: data.node_id || "",
        query: data.query || currentResult.query
      };
      
      setReportSyntheses(prev => [...prev, newSynthesis]);
      return;
    }
    
    if ((payload.event === "final_report" || payload.event_type === "final_report") && payload.data) {
      const data = payload.data;
      console.log(`[${new Date().toISOString()}] 📊 Received final report:`, data);
      
      const typedFindings: Finding[] = (data.findings || []).map((finding: any) => ({
        title: finding.title || "",
        summary: finding.summary || "",
        confidence_score: finding.confidence_score || 0,
        url: finding.url || "",
        timestamp: finding.timestamp || new Date().toISOString(),
        node_type: finding.node_type || "",
        depth: finding.depth || 0
      }));
      
      const report: FinalReport = {
        query: data.query || currentResult.query,
        synthesis: data.synthesis || "",
        confidence: data.confidence || 0,
        reasoning_path: data.reasoning_path || [],
        findings: typedFindings,
        sources: data.sources || [],
        timestamp: data.timestamp || new Date().toISOString()
      };
      
      setFinalReport(report);
      setIsReportComplete(true);
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
  }, [currentResult]);

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2" ref={resultRef}>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold mb-1">Research Results</h2>
            <div className="flex items-center space-x-2">
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
      </div>
      
      <div className="md:col-span-1 border-l pl-6 h-[calc(100vh-200px)]">
        <LiveReportView 
          syntheses={reportSyntheses}
          finalReport={finalReport}
          isComplete={isReportComplete}
          sessionId={currentSessionId}
        />
      </div>
    </div>
  );
};

export default ResearchResults;
