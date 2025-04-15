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
  // ... keep existing code (SourcesList component)
};

const ReasoningPath = ({ path, syntheses }: { path: string[]; syntheses?: Record<string, any> }) => {
  // ... keep existing code (ReasoningPath component)
};

const ResearchAnswer = ({ answer }: { answer: string }) => {
  // ... keep existing code (ResearchAnswer component)
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
