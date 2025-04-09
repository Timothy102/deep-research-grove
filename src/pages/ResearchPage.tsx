
import { useState, useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResearchForm } from "@/components/research/ResearchForm";
import ReasoningPath from "@/components/research/ReasoningPath";
import { useAuth } from "@/components/auth/AuthContext";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey } from "@/lib/constants";
import { ProgressIndicator } from "@/components/research/ProgressIndicator";
import { toast } from "sonner";
import { getLatestSessionState } from "@/services/researchStateService";
import { getUserModels } from "@/services/userModelService";
import { captureEvent } from "@/integrations/posthog/client";
import ResearchReport from "@/components/research/ResearchReport";

const startResearch = async (query: string, userModelId?: string) => {
  try {
    const response = await fetch('/api/research/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        user_model_id: userModelId
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to start research');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error starting research:', error);
    throw error;
  }
};

const ResearchPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const formRef = useRef<HTMLDivElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [reasoningPath, setReasoningPath] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [output, setOutput] = useState<string>("");
  const [userModels, setUserModels] = useState<any[]>([]);
  const [selectedUserModelId, setSelectedUserModelId] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const loadUserModels = async () => {
      if (!user) return;
      
      try {
        const models = await getUserModels();
        setUserModels(models);
        
        const defaultModel = models.find(model => model.is_default);
        if (defaultModel && !selectedUserModelId) {
          setSelectedUserModelId(defaultModel.id);
        }
      } catch (error) {
        console.error("Failed to load user models:", error);
      }
    };
    
    loadUserModels();
  }, [user, selectedUserModelId]);
  
  useEffect(() => {
    if (sessionId) {
      setCurrentSessionId(sessionId);
      
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, sessionId);
      
      loadSessionData(sessionId);
    } else {
      setCurrentSessionId(null);
      setReasoningPath([]);
      setSources([]);
      setFindings([]);
      setOutput("");
      setCurrentQuery("");
      setIsLoading(false);
    }
  }, [sessionId, location]);
  
  const loadSessionData = async (sessionId: string) => {
    try {
      const sessionDataKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId);
      const cachedData = localStorage.getItem(sessionDataKey);
      
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          
          if (parsedData.query) setCurrentQuery(parsedData.query);
          if (parsedData.reasoningPath) setReasoningPath(parsedData.reasoningPath);
          if (parsedData.sources) setSources(parsedData.sources);
          if (parsedData.findings) setFindings(parsedData.findings);
          if (parsedData.answer) setOutput(parsedData.answer);
          if (parsedData.rawData) setRawData(parsedData.rawData);
          
          console.log(`[${new Date().toISOString()}] ✅ Loaded cached data for session:`, sessionId);
        } catch (e) {
          console.error("Error parsing cached session data:", e);
        }
      }
      
      try {
        const state = await getLatestSessionState(sessionId);
        
        if (state) {
          console.log(`[${new Date().toISOString()}] ✅ Loaded state from server for session:`, sessionId);
          
          if (state.query) setCurrentQuery(state.query);
          if (state.reasoning_path) setReasoningPath(state.reasoning_path);
          if (state.sources) setSources(state.sources);
          if (state.findings) setFindings(state.findings);
          if (state.answer) setOutput(state.answer);
          
          setIsLoading(state.status === 'in_progress' || state.status === 'awaiting_human_input');
        }
      } catch (e) {
        console.error("Error fetching state from server:", e);
        toast.error("Could not fetch the latest research data");
      }
    } catch (error) {
      console.error("Failed to load session data:", error);
      toast.error("Failed to load session data");
    }
  };
  
  const handleResearchSubmit = async (query: string, userModelId?: string) => {
    try {
      if (!query.trim()) {
        toast.error("Please enter a query");
        return;
      }
      
      setIsLoading(true);
      setCurrentQuery(query);
      setReasoningPath([]);
      setSources([]);
      setFindings([]);
      setOutput("");
      
      const modelId = userModelId || selectedUserModelId;
      
      captureEvent('research_started', {
        query_length: query.length,
        user_model_id: modelId
      });
      
      const { sessionId } = await startResearch(query, modelId);
      
      if (sessionId) {
        setCurrentSessionId(sessionId);
        
        localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, sessionId);
        
        navigate(`/research/${sessionId}`, { replace: true });
        
        window.dispatchEvent(new CustomEvent('session-selected', { 
          detail: { 
            sessionId,
            query,
            isNew: true
          }
        }));
        
        toast.success("Research started!");
      } else {
        throw new Error("No session ID returned");
      }
    } catch (error) {
      console.error("Failed to start research:", error);
      toast.error("Failed to start research");
      setIsLoading(false);
      
      captureEvent('research_start_error', {
        error: error instanceof Error ? error.message : String(error),
        query: query
      });
    }
  };
  
  const handleSelectUserModel = (modelId: string) => {
    setSelectedUserModelId(modelId);
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 container flex flex-col max-w-7xl py-4 px-4 sm:px-6 lg:px-8">
        <div ref={formRef} className="w-full max-w-3xl mx-auto mb-6">
          <ResearchForm 
            onSubmit={handleResearchSubmit} 
            initialValue={currentQuery}
            isLoading={isLoading}
            selectedLLM={selectedUserModelId || undefined}
            onLLMChange={handleSelectUserModel}
          />
          
          {isLoading && (
            <div className="mt-4">
              <ProgressIndicator isLoading={true} />
            </div>
          )}
        </div>
        
        {(reasoningPath.length > 0 || sources.length > 0 || output) && (
          <div className="mt-4 flex-1 flex flex-col md:flex-row gap-6">
            <Tabs defaultValue="reasoning" className="md:flex-1">
              <TabsList>
                <TabsTrigger value="reasoning">Reasoning Process</TabsTrigger>
                <TabsTrigger value="sources">Sources</TabsTrigger>
              </TabsList>
              <TabsContent value="reasoning" className="mt-4">
                <ReasoningPath 
                  reasoningPath={reasoningPath}
                  sources={sources}
                  findings={findings}
                  isActive={isLoading}
                  isLoading={isLoading}
                  rawData={rawData}
                  sessionId={currentSessionId || undefined}
                />
              </TabsContent>
              <TabsContent value="sources" className="mt-4">
                <div className="max-w-3xl mx-auto">
                  {sources.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Sources</h3>
                      <ul className="space-y-2">
                        {sources.map((source, index) => (
                          <li key={index} className="text-sm">
                            <a 
                              href={source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              {source}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {sources.length === 0 && !isLoading && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No sources found yet.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <Separator orientation="vertical" className="hidden md:block" />
            <Separator className="md:hidden" />
            
            <div className="md:flex-1">
              <ResearchReport 
                sessionId={currentSessionId || undefined}
                isLoading={isLoading}
                initialQuery={currentQuery}
                initialSources={sources}
                initialFindings={findings}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchPage;
