
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Copy, CheckCircle2, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey, saveSessionData } from "@/lib/constants";
import { toast } from "sonner";

export type Finding = {
  content: string;
  source: string;
};

export type ResearchResult = {
  query: string;
  answer: string;
  sources: string[];
  reasoning_path: string[];
  confidence: number;
  session_id?: string;
  research_id?: string;
};

const SourcesList = ({ sources }: { sources: string[] }) => {
  return (
    <div className="mt-4 space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground mb-2">Sources:</h3>
      <div className="space-y-2">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sources yet</p>
        ) : (
          sources.map((source, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 rounded-md source-item neo-morphism bg-background border border-muted-foreground/10"
            >
              <span className="text-sm truncate flex-1">{source}</span>
              <a 
                href={source} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-2 text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ReasoningPath = ({ path }: { path: string[] }) => {
  // Pre-defined colors for reasoning path steps to ensure persistence
  const stepTypes = [
    { pattern: "search", color: "bg-violet-100 dark:bg-violet-900/80 border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-300" },
    { pattern: "reason", color: "bg-amber-100 dark:bg-amber-900/80 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300" },
    { pattern: "synthe", color: "bg-emerald-100 dark:bg-emerald-900/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300" },
    { pattern: "read", color: "bg-blue-100 dark:bg-blue-900/80 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300" },
    { pattern: "objective", color: "bg-indigo-100 dark:bg-indigo-900/80 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300" },
    { pattern: "plan", color: "bg-sky-100 dark:bg-sky-900/80 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-300" }
  ];

  const getStepColor = (step: string): string => {
    const stepLower = step.toLowerCase();
    const matchedType = stepTypes.find(type => stepLower.includes(type.pattern));
    return matchedType ? matchedType.color : "bg-gray-100 dark:bg-gray-800/90 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-300";
  };

  return (
    <div className="mt-4">
      <h3 className="font-medium text-sm text-muted-foreground mb-2">Reasoning Path:</h3>
      <div className="space-y-2 mt-2">
        {path.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reasoning path available</p>
        ) : (
          path.map((step, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium">{index + 1}</span>
              </div>
              <div className={`flex-1 p-3 rounded-md border-l-4 ${getStepColor(step)}`}>
                <p className="text-sm">{step}</p>
              </div>
            </div>
          ))
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

const ResearchResults = ({ result }: { result: ResearchResult | null }) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [currentResult, setCurrentResult] = useState<ResearchResult | null>(result);
  
  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((event: CustomEvent) => {
    if (!currentResult?.session_id) return;
    
    const payload = event.detail?.payload;
    if (!payload || payload.table !== 'research_states') return;
    
    if (payload.new && payload.new.session_id === currentResult.session_id) {
      console.log(`[${new Date().toISOString()}] 🔄 Processing result update for session ${currentResult.session_id}`);
      
      // Check if there are meaningful updates to apply
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
      
      if (shouldUpdate) {
        console.log(`[${new Date().toISOString()}] ✏️ Updating result with real-time data:`, updates);
        
        // Create a new result with the updates
        const updatedResult: ResearchResult = {
          ...currentResult,
          ...updates,
        };
        
        setCurrentResult(updatedResult);
        
        // Store updates in cache
        try {
          localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(updatedResult));
          if (currentResult.session_id) {
            const sessionCacheKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, currentResult.session_id);
            localStorage.setItem(sessionCacheKey, JSON.stringify(updatedResult));
            
            saveSessionData(currentResult.session_id, {
              answer: updatedResult,
              sources: updatedResult.sources,
              reasoningPath: updatedResult.reasoning_path
            });
          }
        } catch (e) {
          console.error("Error caching updated research result:", e);
        }
        
        // Show a toast notification for the update
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
  
  // Register and unregister the realtime update listener
  useEffect(() => {
    window.addEventListener('research_state_update', handleRealtimeUpdate as EventListener);
    
    return () => {
      window.removeEventListener('research_state_update', handleRealtimeUpdate as EventListener);
    };
  }, [handleRealtimeUpdate]);
  
  // Initialize with the provided result
  useEffect(() => {
    if (result) {
      setCurrentResult(result);
    }
  }, [result]);
  
  // Cache result in localStorage when it changes
  useEffect(() => {
    if (currentResult) {
      try {
        // Store in both session-specific and general caches
        localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(currentResult));
        
        if (currentResult.session_id) {
          // Use comprehensive session data storage
          saveSessionData(currentResult.session_id, {
            answer: currentResult,
            sources: currentResult.sources,
            reasoningPath: currentResult.reasoning_path,
            researchId: currentResult.research_id,
            state: {
              query: currentResult.query,
              session_id: currentResult.session_id,
              research_id: currentResult.research_id,
              created_at: new Date().toISOString()
            }
          });
          
          // Also save individual cache components for backward compatibility
          const sessionCacheKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, currentResult.session_id);
          localStorage.setItem(sessionCacheKey, JSON.stringify(currentResult));
          
          const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, currentResult.session_id);
          localStorage.setItem(sessionSourcesKey, JSON.stringify(currentResult.sources));
          
          const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, currentResult.session_id);
          localStorage.setItem(sessionPathKey, JSON.stringify(currentResult.reasoning_path));
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
      // Save current session ID for proper restoration
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, currentResult.session_id);
      
      // Trigger session-selected event for better coordination
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
        <p className="text-sm text-muted-foreground">Query: {currentResult.query}</p>
      </div>

      <Tabs defaultValue="answer">
        <TabsList className="mb-4">
          <TabsTrigger value="answer">Answer</TabsTrigger>
          <TabsTrigger value="sources">Sources ({currentResult.sources.length})</TabsTrigger>
          <TabsTrigger value="reasoning">Reasoning Path</TabsTrigger>
        </TabsList>
        
        <TabsContent value="answer">
          <ResearchAnswer answer={currentResult.answer} />
        </TabsContent>
        
        <TabsContent value="sources">
          <SourcesList sources={currentResult.sources} />
        </TabsContent>
        
        <TabsContent value="reasoning">
          <ReasoningPath path={currentResult.reasoning_path} />
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 text-sm text-right text-muted-foreground">
        <span>Confidence score: {(currentResult.confidence * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default ResearchResults;
