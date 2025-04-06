import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { LOCAL_STORAGE_KEYS, getSessionStorageKey, saveSessionData, getSessionData } from '@/lib/constants';
import { cn } from "@/lib/utils";
import {
  saveResearchState,
  updateResearchState,
  getResearchState,
  Finding
} from "@/services/researchStateService";
import { supabase, getClientId } from "@/integrations/supabase/client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"

import { Sparkles, Lightbulb, Search, BookOpenCheck, BrainCircuit, MessageCircleQuestion, User2, Loader2, AlertTriangle, CheckCircle2, BookText, FileSearch2, HelpCircle, LucideIcon } from "lucide-react";

import ResearchHistorySidebar from '@/components/research/ResearchHistorySidebar';
import ReasoningPath from '@/components/research/ReasoningPath';
import SourcesList from '@/components/research/SourcesList';
// Temporarily create stub components for the missing ones
const HumanInputRequest = ({ humanInteractionRequest, onClose, onSubmit }: any) => <div>Human Input Request</div>;
const HumanFeedbackForm = ({ isOpen, onOpenChange, onSubmit, onFeedbackChange }: any) => <div>Human Feedback Form</div>;
const ResearchTabs = ({ children, activeTab, onTabChange }: any) => <div>{children}</div>;
const ResearchTab = ({ children, label, value, icon: Icon }: any) => <div>{label}: {children}</div>;
const ResearchObjective = ({ objective, onObjectiveChange, onValidityChange, onSubmit, isLoading, isActive, isObjectiveValid, researchObjectiveRef }: any) => <div>Research Objective</div>;
const ResearchAnswer = ({ result, isLoading, errorMessage, sources, activeSessionId, currentSessionStatus, isHumanFeedbackRequired, onFeedbackFormToggle }: any) => <div>Research Answer</div>;

// Get user context
const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Get the current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();
    
    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  return { user };
};

const ResearchPage = () => {
  const navigate = useNavigate();
  const { sessionId: sessionIdFromParams } = useParams<{ sessionId?: string }>();
  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromParams || null);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [reasoningPath, setReasoningPath] = useState<string[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isWaitingForUserInput, setIsWaitingForUserInput] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentSessionStatus, setCurrentSessionStatus] = useState<string>('in_progress');
  const [rawEventData, setRawEventData] = useState<Record<string, string>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('research');
  const [isObjectiveValid, setIsObjectiveValid] = useState<boolean>(false);
  const [objective, setObjective] = useState<string>('');
  const [userModel, setUserModel] = useState<any>(null);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState<boolean>(false);
  const [isFeedbackFormOpen, setIsFeedbackFormOpen] = useState<boolean>(false);
  const [humanInteractionRequest, setHumanInteractionRequest] = useState<string | null>(null);
  const [humanInteractionResult, setHumanInteractionResult] = useState<string | null>(null);
  const [isHumanFeedbackRequired, setIsHumanFeedbackRequired] = useState<boolean>(false);
  const [isHumanFeedbackApproved, setIsHumanFeedbackApproved] = useState<boolean>(false);
  const [humanFeedbackComment, setHumanFeedbackComment] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [forcedUpdate, setForcedUpdate] = useState(0);
  const { toast } = useToast();
  const { user } = useUser();
  const researchObjectiveRef = useRef<HTMLTextAreaElement>(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleHistoryItemClick = (item: any) => {
    setSelectedHistoryItem(item);
  };

  const handleObjectiveChange = (newObjective: string) => {
    setObjective(newObjective);
  };

  const handleObjectiveValidityChange = (isValid: boolean) => {
    setIsObjectiveValid(isValid);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    if (activeSessionId) {
      updateResearchState(activeSessionId, activeSessionId, { active_tab: tab })
        .then(() => {
          console.log(`[${new Date().toISOString()}] ✅ Updated active tab to ${tab}`);
        })
        .catch(error => {
          console.error(`[${new Date().toISOString()}] ❌ Error updating active tab:`, error);
        });
    }
  };

  const handleModelSelect = (model: any) => {
    setUserModel(model);
    setIsModelSelectorOpen(false);
  };

  const handleFeedbackFormToggle = () => {
    setIsFeedbackFormOpen(!isFeedbackFormOpen);
  };

  const handleHumanFeedbackChange = (approved: boolean, comment: string) => {
    setIsHumanFeedbackApproved(approved);
    setHumanFeedbackComment(comment);
  };

  const handleHumanFeedbackSubmit = async () => {
    if (!activeSessionId) {
      console.error("No active session to submit feedback for.");
      return;
    }
    
    const feedbackData = {
      approved: isHumanFeedbackApproved,
      comment: humanFeedbackComment,
      timestamp: new Date().toISOString()
    };
    
    try {
      await updateResearchState(activeSessionId, activeSessionId, {
        human_interactions: JSON.stringify(feedbackData)
      });
      
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
        duration: 3000
      });
      
      setIsHumanFeedbackRequired(false);
      setIsFeedbackFormOpen(false);
    } catch (error) {
      console.error("Error submitting human feedback:", error);
      toast({
        title: "Error Submitting Feedback",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleNewResearch = async () => {
    if (!objective || objective.length === 0) {
      toast({
        title: "Research Objective Required",
        description: "Please enter a research objective before starting a new search.",
        variant: "destructive"
      });
      return;
    }
    
    if (!isObjectiveValid) {
      toast({
        title: "Invalid Research Objective",
        description: "Please enter a valid research objective before starting a new search.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setIsActive(true);
      setResult(null);
      setSources([]);
      setReasoningPath([]);
      setFindings([]);
      setErrorMessage('');
      
      const researchId = crypto.randomUUID();
      const newSessionId = crypto.randomUUID();
      
      setSessionId(newSessionId);
      setActiveSessionId(newSessionId);
      setCurrentSessionStatus('in_progress');
      
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, newSessionId);
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID, researchId);
      localStorage.setItem(LOCAL_STORAGE_KEYS.RESEARCH_OBJECTIVE, objective);
      
      const initialState = {
        research_id: researchId,
        session_id: newSessionId,
        status: 'in_progress',
        query: objective,
        created_at: new Date().toISOString()
      };
      
      saveSessionData(newSessionId, {
        state: initialState,
        objective: objective,
        researchId: researchId
      });
      
      const savedState = await saveResearchState({
        research_id: researchId,
        session_id: newSessionId,
        status: 'in_progress',
        query: objective,
        reasoning_path: ["Analyzing research objective..."],
        user_model: userModel
      });
      
      if (savedState) {
        console.log(`[${new Date().toISOString()}] ✅ Created new research session:`, savedState.session_id);
        
        window.dispatchEvent(new CustomEvent('new-research-started', { 
          detail: { 
            researchId: savedState.research_id,
            sessionId: savedState.session_id,
            query: savedState.query,
            isNew: true
          }
        }));
        
        navigate(`/research/${newSessionId}`);
      } else {
        console.error(`[${new Date().toISOString()}] ❌ Failed to create new research session`);
        
        toast({
          title: "Error Starting Research",
          description: "Failed to start new research. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] 🔥 Error starting new research:`, error);
      setErrorMessage(error.message || 'Failed to start new research.');
      
      toast({
        title: "Error Starting Research",
        description: error.message || "Failed to start new research.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResearchUpdate = useCallback((
    newResult: string | null,
    newSources: string[],
    newReasoningPath: string[],
    newFindings: Finding[],
    newRawEventData: Record<string, string>
  ) => {
    setResult(newResult);
    setSources(newSources);
    setReasoningPath(newReasoningPath);
    setFindings(newFindings);
    setRawEventData(newRawEventData);
  }, []);

  const handleSessionSelect = useCallback((event: CustomEvent) => {
    const { sessionId, query, state, isNew, forceRestore, fullReset } = event.detail;
    
    // If fullReset is true, we need to completely refresh the page state
    if (fullReset) {
      console.log(`[${new Date().toISOString()}] 🔄 Full reset requested for session ${sessionId}`);
      
      // Clear any existing state that might be conflicting
      setResult(null);
      setErrorMessage('');
      setSources([]);
      setReasoningPath([]);
      setFindings([]);
      setRawEventData({});
      
      // Small delay to ensure the state is fully reset before restoring
      setTimeout(() => {
        if (state) {
          if (state.query) setCurrentQuery(state.query);
          if (state.sources) setSources(state.sources);
          if (state.reasoning_path) setReasoningPath(state.reasoning_path);
          if (state.findings) setFindings(state.findings);
          if (state.answer) setResult(state.answer);
          
          setActiveSessionId(sessionId);
          setCurrentSessionStatus(state.status || 'completed');
        }
      }, 50);
    } else {
      // Original restore logic
      if (sessionId) {
        setActiveSessionId(sessionId);
        if (query) setCurrentQuery(query);
      }
      
      if (state) {
        if (state.query && !query) setCurrentQuery(state.query);
        if (state.sources) setSources(state.sources);
        if (state.reasoning_path) setReasoningPath(state.reasoning_path);
        if (state.findings) setFindings(state.findings);
        if (state.answer) setResult(state.answer);
        if (state.status) setCurrentSessionStatus(state.status);
      }
    }
    
    // Set isActive to false since we're just viewing a past session
    setIsActive(false);
    setIsWaitingForUserInput(false);
    
    if (forceRestore) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, sessionId);
      console.log(`[${new Date().toISOString()}] 🔄 Force restoring session ${sessionId}`);
    }
  }, []);

  const handleUserInputRequest = useCallback((event: CustomEvent) => {
    const { interactionType, content, callId, nodeId } = event.detail;
    
    console.log(`[${new Date().toISOString()}] 🙋‍♀️ Received human input request:`, { interactionType, content, callId, nodeId });
    
    setIsWaitingForUserInput(true);
    setIsActive(false);
    setHumanInteractionRequest(JSON.stringify({
      interaction_type: interactionType,
      content: content,
      call_id: callId,
      node_id: nodeId
    }));
  }, []);

  const handleHistoryRefresh = useCallback(async () => {
    await fetchHistory();
  }, []);

  const handleNewChatRequested = useCallback((event: CustomEvent) => {
    const { sessionId, isNew, reset } = event.detail;
    
    console.log(`[${new Date().toISOString()}] 💬 New chat requested:`, { sessionId, isNew, reset });
    
    if (reset) {
      setResult(null);
      setSources([]);
      setReasoningPath([]);
      setFindings([]);
      setErrorMessage('');
      setRawEventData({});
    }
    
    setActiveSessionId(sessionId);
    setSessionId(sessionId);
    
    if (isNew) {
      setIsActive(true);
      setIsLoading(false);
      setIsWaitingForUserInput(false);
    }
  }, []);

  const handleResearchEvents = useCallback(() => {
    setForcedUpdate(prev => prev + 1);
  }, []);

  useEffect(() => {
    window.addEventListener('research-update', (event: any) => {
      const { result, sources, reasoningPath, findings, rawEventData } = event.detail;
      handleResearchUpdate(result, sources, reasoningPath, findings, rawEventData);
    });
    
    window.addEventListener('session-selected', handleSessionSelect as EventListener);
    window.addEventListener('human-input-required', handleUserInputRequest as EventListener);
    window.addEventListener('refresh-history-requested', handleHistoryRefresh as EventListener);
    window.addEventListener('new-chat-requested', handleNewChatRequested as EventListener);
    window.addEventListener('research-new-event', handleResearchEvents as EventListener);
    
    return () => {
      window.removeEventListener('research-update', (event: any) => {
        const { result, sources, reasoningPath, rawEventData } = event.detail;
        handleResearchUpdate(result, sources, reasoningPath, result, rawEventData);
      });
      
      window.removeEventListener('session-selected', handleSessionSelect as EventListener);
      window.removeEventListener('human-input-required', handleUserInputRequest as EventListener);
      window.removeEventListener('refresh-history-requested', handleHistoryRefresh as EventListener);
      window.removeEventListener('new-chat-requested', handleNewChatRequested as EventListener);
      window.removeEventListener('research-new-event', handleResearchEvents as EventListener);
    };
  }, [handleResearchUpdate, handleSessionSelect, handleUserInputRequest, handleHistoryRefresh, handleNewChatRequested, handleResearchEvents]);

  const fetchHistory = useCallback(async () => {
    try {
      const historyData = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION_HISTORY);
      
      if (historyData) {
        const parsedHistory = JSON.parse(historyData);
        
        // Group items by date
        const groupedHistory = parsedHistory.reduce((acc: any, item: any) => {
          const date = new Date(item.created_at).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(item);
          return acc;
        }, {});
        
        // Convert grouped object to array of groups
        const historyGroups = Object.entries(groupedHistory).map(([date, items]: [string, any]) => ({
          date: date === new Date().toLocaleDateString() ? 'Today' : date,
          items: items.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        }));
        
        // Sort groups by date
        historyGroups.sort((a: any, b: any) => {
          const dateA = a.date === 'Today' ? new Date() : new Date(a.date);
          const dateB = b.date === 'Today' ? new Date() : new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
        
        setHistory(historyGroups);
      }
    } catch (error) {
      console.error("Error fetching research history:", error);
    }
  }, []);

  const restoreSession = useCallback(async (sessionIdToRestore: string) => {
    if (!sessionIdToRestore) {
      console.warn(`[${new Date().toISOString()}] ⚠️ No session ID provided, skipping session restore`);
      return;
    }
    
    try {
      setIsLoading(true);
      
      const storedObjective = localStorage.getItem(LOCAL_STORAGE_KEYS.RESEARCH_OBJECTIVE);
      if (storedObjective) {
        setObjective(storedObjective);
      }
      
      const restoredState = await getResearchState(sessionIdToRestore, sessionIdToRestore);
      
      if (restoredState) {
        console.log(`[${new Date().toISOString()}] 🔄 Restoring session:`, restoredState.session_id);
        
        setActiveSessionId(restoredState.session_id);
        setCurrentSessionStatus(restoredState.status);
        setCurrentQuery(restoredState.query);
        setResult(restoredState.answer || null);
        setSources(restoredState.sources || []);
        setReasoningPath(restoredState.reasoning_path || []);
        setFindings(restoredState.findings || []);
        setActiveTab(restoredState.active_tab || 'research');
        
        if (restoredState.human_interaction_request) {
          setHumanInteractionRequest(restoredState.human_interaction_request);
          setIsWaitingForUserInput(true);
          setIsActive(false);
        } else {
          setIsWaitingForUserInput(false);
          setIsActive(true);
        }
        
        if (restoredState.status === 'awaiting_human_input') {
          setIsHumanFeedbackRequired(true);
        } else {
          setIsHumanFeedbackRequired(false);
        }
        
        if (restoredState.error) {
          setErrorMessage(restoredState.error);
        }
        
        if (restoredState.client_id !== getClientId()) {
          console.warn(`[${new Date().toISOString()}] ⚠️ Session was created by a different client`);
        }
        
        saveSessionData(sessionIdToRestore, {
          state: restoredState,
          objective: storedObjective,
          researchId: restoredState.research_id
        });
      } else {
        console.warn(`[${new Date().toISOString()}] ⚠️ No state found in localStorage for session:`, sessionIdToRestore);
        
        toast({
          title: "Session Not Found",
          description: "No saved state found for this session. Starting a new session.",
        });
        
        setIsActive(true);
        setIsLoading(false);
        setIsWaitingForUserInput(false);
      }
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] 🔥 Error restoring session:`, error);
      setErrorMessage(error.message || 'Failed to restore session.');
      
      toast({
        title: "Error Restoring Session",
        description: error.message || "Failed to restore session.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [toast]);

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        setIsSupabaseConnected(!error);
        setIsOfflineMode(!!error);
      } catch (e) {
        setIsSupabaseConnected(false);
        setIsOfflineMode(true);
      }
    };
    
    checkSupabase();
  }, []);

  useEffect(() => {
    if (sessionIdFromParams) {
      setSessionId(sessionIdFromParams);
      setActiveSessionId(sessionIdFromParams);
      restoreSession(sessionIdFromParams);
    } else {
      const storedSessionId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID);
      if (storedSessionId) {
        setSessionId(storedSessionId);
        setActiveSessionId(storedSessionId);
        restoreSession(storedSessionId);
      } else {
        setIsActive(true);
        setIsLoading(false);
        setIsWaitingForUserInput(false);
        setIsInitialLoad(false);
      }
    }
    
    fetchHistory();
  }, [sessionIdFromParams, restoreSession, fetchHistory]);

  useEffect(() => {
    if (activeSessionId) {
      updateResearchState(activeSessionId, activeSessionId, { active_tab: activeTab })
        .then(() => {
          console.log(`[${new Date().toISOString()}] ✅ Updated active tab to ${activeTab}`);
        })
        .catch(error => {
          console.error(`[${new Date().toISOString()}] ❌ Error updating active tab:`, error);
        });
    }
  }, [activeTab, activeSessionId]);

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading session...
      </div>
    );
  }

  return (
    <div className="flex h-screen antialiased text-foreground bg-background">
      <ResearchHistorySidebar
        isOpen={sidebarOpen}
        history={history}
        onHistoryItemClick={handleHistoryItemClick}
        onSelectItem={(item: any) => {
          setSessionId(item.session_id);
          setActiveSessionId(item.session_id);
          navigate(`/research/${item.session_id}`);
        }}
        onToggle={toggleSidebar}
      />
      
      <div className="flex flex-col flex-grow">
        <header className="px-6 py-4 border-b">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Deep Research</h1>
              <div className="flex items-center space-x-4">
                {isOfflineMode && (
                  <Badge variant="destructive">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Offline Mode
                  </Badge>
                )}
                <Button variant="outline" onClick={toggleSidebar}>
                  Research History
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-grow overflow-auto">
          <div className="container mx-auto h-full flex flex-col">
            {isWaitingForUserInput && humanInteractionRequest ? (
              <HumanInputRequest
                humanInteractionRequest={humanInteractionRequest}
                onClose={() => {
                  setIsWaitingForUserInput(false);
                  setHumanInteractionRequest(null);
                }}
                onSubmit={async (result: string) => {
                  setHumanInteractionResult(result);
                  setIsWaitingForUserInput(false);
                  setIsHumanFeedbackRequired(true);
                  
                  try {
                    await updateResearchState(activeSessionId!, activeSessionId!, {
                      human_interactions: result,
                      status: 'awaiting_human_input'
                    });
                    
                    toast({
                      title: "Human Input Received",
                      description: "Your input has been saved. Please provide feedback.",
                      duration: 3000
                    });
                  } catch (error) {
                    console.error("Error saving human input:", error);
                    toast({
                      title: "Error Saving Input",
                      description: "Failed to save input. Please try again.",
                      variant: "destructive"
                    });
                  }
                }}
              />
            ) : (
              <>
                {isHumanFeedbackRequired && (
                  <HumanFeedbackForm
                    isOpen={isFeedbackFormOpen}
                    onOpenChange={setIsFeedbackFormOpen}
                    onSubmit={handleHumanFeedbackSubmit}
                    onFeedbackChange={handleHumanFeedbackChange}
                  />
                )}
                
                <ResearchObjective
                  objective={objective}
                  onObjectiveChange={handleObjectiveChange}
                  onValidityChange={handleObjectiveValidityChange}
                  onSubmit={handleNewResearch}
                  isLoading={isLoading}
                  isActive={isActive}
                  isObjectiveValid={isObjectiveValid}
                  researchObjectiveRef={researchObjectiveRef}
                />
                
                <ResearchTabs activeTab={activeTab} onTabChange={handleTabChange}>
                  <ResearchTab label="Research" value="research" icon={FileSearch2}>
                    <ResearchAnswer
                      result={result}
                      isLoading={isLoading}
                      errorMessage={errorMessage}
                      sources={sources}
                      activeSessionId={activeSessionId}
                      currentSessionStatus={currentSessionStatus}
                      isHumanFeedbackRequired={isHumanFeedbackRequired}
                      onFeedbackFormToggle={handleFeedbackFormToggle}
                    />
                  </ResearchTab>
                  
                  <ResearchTab label="Reasoning" value="reasoning" icon={BrainCircuit}>
                    <ReasoningPath
                      reasoningPath={reasoningPath}
                      sources={sources}
                      findings={findings}
                      isActive={isActive}
                      isLoading={isLoading}
                      rawData={rawEventData}
                      sessionId={activeSessionId}
                    />
                  </ResearchTab>
                  
                  <ResearchTab label="Sources" value="sources" icon={BookText}>
                    <SourcesList sources={sources} findings={findings} sessionId={activeSessionId} />
                  </ResearchTab>
                </ResearchTabs>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResearchPage;
