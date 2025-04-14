import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Search, User, LogOut, MessageSquarePlus } from "lucide-react";
import { 
  saveResearchHistory, 
  getResearchHistory, 
  groupResearchHistoryByDate,
  ResearchHistoryEntry 
} from "@/services/researchService";
import { 
  saveResearchState, 
  updateResearchState, 
  getResearchState, 
  getLatestSessionState,
  subscribeToResearchState 
} from "@/services/researchStateService";
import { getUserOnboardingStatus, UserModel, getUserModelById, markOnboardingCompleted, getUserModels } from "@/services/userModelService";
import { submitFeedback } from '@/services/feedbackService';
import { useToast } from "@/hooks/use-toast";
import { ResearchForm } from "@/components/research/ResearchForm";
import ReasoningPath from "@/components/research/ReasoningPath";
import SourcesList from "@/components/research/SourcesList";
import ResearchOutput from "@/components/research/ResearchOutput";
import ResearchHistorySidebar from "@/components/research/ResearchHistorySidebar";
import UserModelOnboarding from "@/components/onboarding/UserModelOnboarding";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getClientId } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { ProgressIndicator } from "@/components/research/ProgressIndicator";
import { useAnalytics } from "@/hooks/use-analytics";
import { captureEvent } from "@/integrations/posthog/client";
import { ReportData, ReportSection } from "@/components/research/ResearchOutput";
import { useResearchState } from "@/hooks/use-research-state";
import { useResearchStream } from "@/hooks/use-research-stream";
import { ResearchTabs } from "@/components/research/ResearchTabs";

interface ResearchHistory {
  id: string;
  query: string;
  user_model: string;
  use_case: string;
}

const ResearchPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const currentSessionIdRef = useRef<string | null>(sessionId || null);
  const researchIdRef = useRef<string | null>(null);
  const clientIdRef = useRef<string>(getClientId());
  
  const { 
    isLoading, setIsLoading,
    researchOutput, setResearchOutput,
    sources, setSources,
    findings, setFindings,
    reasoningPath, setReasoningPath,
    activeTab, setActiveTab,
    researchObjective, setResearchObjective,
    researchDepth, setResearchDepth,
    userContext, setUserContext,
    selectedCognitiveStyle, setSelectedCognitiveStyle,
    selectedLLM, setSelectedLLM,
    rawData, setRawData,
    userModels, setUserModels,
    progressEvents, setProgressEvents,
    currentStage, setCurrentStage,
    reportData, setReportData,
    resetResearchState,
    pollResearchState
  } = useResearchState();

  const { startResearchStream } = useResearchStream({
    setIsLoading,
    setSources,
    setFindings,
    setReasoningPath,
    setResearchOutput,
    setActiveTab,
    setProgressEvents,
    setCurrentStage,
    setRawData,
    setReportData,
    sources,
    findings,
    reasoningPath,
    researchObjective,
    reportData
  });
  
  const [history, setHistory] = useState<ResearchHistoryEntry[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE);
    return savedState !== null ? savedState === 'true' : false;
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const initialEventReceivedRef = useRef<boolean>(false);
  const { toast: uiToast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    
    if (!sessionId) {
      const newSessionId = uuidv4();
      navigate(`/research/${newSessionId}`, { replace: true });
      return;
    }
    
    console.log(`[${new Date().toISOString()}] 🔑 Active client ID:`, clientIdRef.current);
    
    currentSessionIdRef.current = sessionId;
    
    if (user) {
      const metadata = user.user_metadata || {};
      const name = metadata.full_name || metadata.name || null;
      
      if (name) {
        setDisplayName(name);
      } else {
        const email = user.email || "";
        const username = email.split('@')[0];
        setDisplayName(username);
      }
    }
    
    checkOnboardingStatus();
    loadUserModels();
    
    const isNewChat = localStorage.getItem('newChatRequested') === 'true';
    if (isNewChat) {
      localStorage.removeItem('newChatRequested');
      resetResearchState();
    } else {
      loadSessionData(sessionId);
    }
    
    const handleSidebarToggle = (event: CustomEvent) => {
      setSidebarOpen(event.detail.open);
    };
    
    const handleNewChatRequest = (event: CustomEvent) => {
      console.log(`[${new Date().toISOString()}] 🔄 New chat requested for session:`, event.detail.sessionId);
      
      if (event.detail.sessionId === sessionId) {
        resetResearchState();
        setResearchObjective("");
      } else {
        localStorage.setItem('newChatRequested', 'true');
      }
    };
    
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    window.addEventListener('new-chat-requested', handleNewChatRequest as EventListener);
    
    loadHistory();
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
      window.removeEventListener('new-chat-requested', handleNewChatRequest as EventListener);
    };
  }, [user, navigate, sessionId, resetResearchState]);

  const loadUserModels = async () => {
    try {
      const models = await getUserModels();
      setUserModels(models);
    } catch (error) {
      console.error("Error loading user models:", error);
    }
  };

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE, String(newState));
  };

  const selectUserModel = async (modelId: string) => {
    try {
      const model = await getUserModelById(modelId);
      if (model) {
        setResearchDepth(model.research_depth);
        setSelectedCognitiveStyle(model.cognitive_style);
        
        trackEvent('user_model_selected', {
          model_id: modelId,
          model_name: model.name,
          research_depth: model.research_depth,
          cognitive_style: model.cognitive_style
        });
        
        toast.success(`Selected user model: ${model.name}`);
      }
    } catch (error) {
      console.error("Error selecting user model:", error);
      toast.error("Failed to select user model");
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const completed = await getUserOnboardingStatus();
      if (!completed) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    }
  };

  const loadHistory = async () => {
    try {
      const historyData = await getResearchHistory(20);
      setHistory(historyData as ResearchHistoryEntry[]);
      const grouped = groupResearchHistoryByDate(historyData);
      setGroupedHistory(grouped);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const loadSessionData = async (sessionId: string) => {
    try {
      console.log(`[${new Date().toISOString()}] 🔄 Loading session data:`, { 
        sessionId, 
        clientId: clientIdRef.current.substring(0, 15)  
      });
      
      const sessionState = await getLatestSessionState(sessionId);
      
      if (!sessionState) {
        console.log(`[${new Date().toISOString()}] ℹ️ No existing session data found`);
        return;
      }
      
      console.log(`[${new Date().toISOString()}] ✅ Retrieved session data:`, { 
        id: sessionState.id,
        research_id: sessionState.research_id,
        status: sessionState.status,
        clientId: sessionState.client_id
      });
      
      if (sessionState.client_id && sessionState.client_id !== clientIdRef.current) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Session belongs to a different client, resetting state`, {
          sessionClientId: sessionState.client_id.substring(0, 15),
          currentClientId: clientIdRef.current.substring(0, 15)
        });
        return;
      }
      
      if (sessionState.research_id) {
        researchIdRef.current = sessionState.research_id;
        
        if (sessionState.query) {
          setResearchObjective(sessionState.query);
        }
        
        if (sessionState.answer) {
          setResearchOutput(sessionState.answer);
        }
        
        if (sessionState.sources) {
          setSources(sessionState.sources);
        }
        
        if (sessionState.findings) {
          setFindings(Array.isArray(sessionState.findings) ? sessionState.findings : []);
        }
        
        if (sessionState.reasoning_path) {
          setReasoningPath(sessionState.reasoning_path);
        }
        
        if (sessionState.report_data) {
          setReportData(sessionState.report_data);
        }
        
        if (sessionState.active_tab) {
          setActiveTab(sessionState.active_tab);
        } else {
          if (sessionState.status === 'in_progress') {
            setActiveTab('reasoning');
          } else {
            setActiveTab('output');
          }
        }
        
        if (sessionState.status === 'in_progress') {
          setIsLoading(true);
          pollResearchState(sessionState.research_id, 5000, 20, 0);
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error loading session data:`, error);
    }
  };

  const handleResearch = async (query: string, userModelText: string, useCase: string, selectedModelId?: string, currentUnderstanding?: string) => {
    if (!query.trim()) {
      uiToast({
        title: "objective required",
        description: "please enter a research objective",
        variant: "destructive",
      });
      return;
    }
  
    resetResearchState();
    setIsLoading(true);
    
    const initialReasoningPath = ["Analyzing research objective..."];
    setReasoningPath(initialReasoningPath);
    setActiveTab("reasoning");
    
    try {
      let userModelPayload: any = {};
      
      if (selectedModelId) {
        try {
          const model = await getUserModelById(selectedModelId);
          if (model) {
            userModelPayload = {
              user_id: user?.id || "anonymous",
              name: user?.email || "anonymous",
              research_depth: model.research_depth,
              cognitiveStyle: model.cognitive_style,
              included_sources: model.included_sources || [],
              source_priorities: model.source_priorities || [],
              session_id: currentSessionIdRef.current,
              model_id: selectedModelId,
              currentUnderstanding: currentUnderstanding,
              client_id: clientIdRef.current
            };
          }
        } catch (err) {
          console.error(`[${new Date().toISOString()}] ❌ Error fetching user model:`, err);
          userModelPayload = {
            user_id: user?.id || "anonymous",
            name: user?.email || "anonymous",
            userModel: userModelText,
            useCase: useCase,
            research_depth: researchDepth,
            cognitiveStyle: selectedCognitiveStyle,
            session_id: currentSessionIdRef.current,
            model_id: "claude-3.5-sonnet",
            currentUnderstanding: currentUnderstanding,
            client_id: clientIdRef.current
          };
        }
      } else {
        userModelPayload = {
          user_id: user?.id || "anonymous",
          name: user?.email || "anonymous",
          userModel: userModelText,
          useCase: useCase,
          research_depth: researchDepth,
          cognitiveStyle: selectedCognitiveStyle,
          session_id: currentSessionIdRef.current,
          model_id: "claude-3.5-sonnet",
          currentUnderstanding: currentUnderstanding,
          client_id: clientIdRef.current
        };
      }
      
      const newResearchId = uuidv4();
      researchIdRef.current = newResearchId;
      
      await saveResearchHistory({
        query: query,
        user_model: JSON.stringify(userModelPayload),
        use_case: useCase,
        user_model_id: selectedModelId
      });
      
      if (currentSessionIdRef.current) {
        await saveResearchState({
          research_id: newResearchId,
          session_id: currentSessionIdRef.current,
          status: 'in_progress',
          query: query,
          user_model: JSON.stringify(userModelPayload),
          active_tab: "reasoning",
          reasoning_path: initialReasoningPath,
          client_id: clientIdRef.current
        });
      }
      
      const modelToUse = selectedLLM === 'auto' ? 'claude-3.5-sonnet' : selectedLLM;
      startResearchStream(userModelPayload, newResearchId, query, modelToUse);
      
      if (researchIdRef.current && currentSessionIdRef.current) {
        pollResearchState(researchIdRef.current, 5000, 20, 0);
      }
      
      loadHistory().catch(err => console.error("Error loading history after research start:", err));
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Research error:`, error);
      uiToast({
        title: "research failed",
        description: "there was an error processing your request",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleSessionClick = (sessionId: string, query: string) => {
    navigate(`/research/${sessionId}`);
  };

  const handleOnboardingComplete = async () => {
    try {
      await markOnboardingCompleted();
      setShowOnboarding(false);
      
      trackEvent('onboarding_completed', {});
      
      toast.success("Onboarding completed!");
    } catch (error) {
      console.error("Error marking onboarding as completed:", error);
      uiToast({
        title: "Error completing onboarding",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    if (!currentSessionIdRef.current || !researchIdRef.current) return;
    
    try {
      await submitFeedback({
        rating,
        comment,
        session_id: currentSessionIdRef.current,
        research_id: researchIdRef.current,
        query: researchObjective
      });
      
      toast.success("Thank you for your feedback!");
      
      trackEvent('feedback_submitted', {
        rating,
        has_comment: !!comment
      });
      
    } catch (error) {
      console.error("Error submitting feedback:", error);
      uiToast({
        title: "Error submitting feedback",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 flex">
        <ResearchHistorySidebar 
          history={history}
          onSessionClick={handleSessionClick}
          currentSessionId={sessionId || ''}
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
        />
        
        <div className={cn(
          "flex-1 overflow-y-auto transition-all container py-4 md:px-8 max-w-[1200px] mx-auto",
          { "xl:ml-64": sidebarOpen }
        )}>
          <div className="space-y-6">
            <div className="space-y-4">
              <ResearchForm 
                initialObjective={researchObjective}
                onSubmit={handleResearch}
                isLoading={isLoading}
                userModels={userModels}
                onModelSelect={selectUserModel}
              />
              
              {isLoading && (
                <ProgressIndicator
                  currentStage={currentStage}
                  steps={reasoningPath.length}
                  sources={sources.length}
                  findings={findings.length}
                  isLoading={isLoading}
                  events={progressEvents}
                />
              )}
              
              <ResearchTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isLoading={isLoading}
                reportData={reportData}
                researchOutput={researchOutput}
                sources={sources}
                findings={findings}
                reasoningPath={reasoningPath}
                sessionId={sessionId || ''}
              />
            </div>
          </div>
        </div>
      </main>
      
      {showOnboarding && (
        <UserModelOnboarding 
          isOpen={showOnboarding} 
          onComplete={handleOnboardingComplete}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
};

export default ResearchPage;
