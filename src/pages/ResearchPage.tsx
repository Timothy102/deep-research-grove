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
import { submitHumanFeedback } from "@/services/humanInteractionService";
import { submitFeedback } from '@/services/feedbackService';
import { useToast } from "@/hooks/use-toast";
import { ResearchForm } from "@/components/research/ResearchForm";
import ReasoningPath from "@/components/research/ReasoningPath";
import SourcesList from "@/components/research/SourcesList";
import ResearchOutput from "@/components/research/ResearchOutput";
import ResearchHistorySidebar from "@/components/research/ResearchHistorySidebar";
import HumanApprovalDialog from "@/components/research/HumanApprovalDialog";
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

interface ResearchHistory {
  id: string;
  query: string;
  user_model: string;
  use_case: string;
  created_at: string;
}

interface HumanApprovalRequest {
  call_id: string;
  node_id: string;
  query: string;
  content: string;
  approval_type: string;
  interaction_type?: "planning" | "searching" | "synthesizing";
}

interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
  finding?: any;
}

interface HumanInteraction {
  call_id: string;
  node_id: string;
  query: string;
  content: string;
  interaction_type: string;
  status: "completed" | "pending";
  response?: {
    approved: boolean;
    comment?: string;
    timestamp: string;
  };
  type?: string;
  timestamp?: string;
}

interface HumanInteractionRequest {
  call_id: string;
  node_id: string;
  query: string;
  content: string;
  interaction_type: "planning" | "searching" | "synthesizing";
  approval_type?: string;
}

const ResearchPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [researchOutput, setResearchOutput] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [reasoningPath, setReasoningPath] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("reasoning");
  const [history, setHistory] = useState<ResearchHistoryEntry[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE);
    return savedState !== null ? savedState === 'true' : false;
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [humanApprovalRequest, setHumanApprovalRequest] = useState<HumanApprovalRequest | null>(null);
  const [researchObjective, setResearchObjective] = useState("");
  const [researchDepth, setResearchDepth] = useState("");
  const [userContext, setUserContext] = useState("");
  const [selectedCognitiveStyle, setSelectedCognitiveStyle] = useState("");
  const [selectedLLM, setSelectedLLM] = useState("auto");
  const [rawData, setRawData] = useState<Record<string, string>>({});
  const [userModels, setUserModels] = useState<UserModel[]>([]);
  const [displayName, setDisplayName] = useState<string>("");
  const [progressEvents, setProgressEvents] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState("Initializing research");
  const eventSourceRef = useRef<EventSource | null>(null);
  const researchIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(sessionId || null);
  const clientIdRef = useRef<string>(getClientId());
  const initialEventReceivedRef = useRef<boolean>(false);
  const { toast: uiToast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { trackEvent } = useAnalytics();
  const [reportData, setReportData] = useState<ReportData | undefined>(undefined);

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
  }, [user, navigate, sessionId]);

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

  const resetResearchState = () => {
    console.log(`[${new Date().toISOString()}] 🔄 Resetting research state completely`);
    
    setResearchOutput("");
    setSources([]);
    setFindings([]);
    setReasoningPath([]);
    setActiveTab("reasoning");
    setResearchObjective("");
    setResearchDepth("");
    setUserContext("");
    setSelectedCognitiveStyle("");
    researchIdRef.current = null;
    initialEventReceivedRef.current = false;
    setProgressEvents([]);
    setCurrentStage("Initializing research");
    setReportData(undefined);
    
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_STATE);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID);
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
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
        
        if (sessionState.status === 'awaiting_human_input' && sessionState.human_interactions) {
          let interactions: HumanInteraction[] = [];
          
          if (typeof sessionState.human_interactions === 'string') {
            try {
              interactions = JSON.parse(sessionState.human_interactions);
            } catch (e) {
              console.error("Error parsing human interactions:", e);
              interactions = [];
            }
          } else if (Array.isArray(sessionState.human_interactions)) {
            interactions = sessionState.human_interactions as HumanInteraction[];
          }
                
          const lastInteraction = interactions
            .filter(interaction => interaction.type === 'interaction_request')
            .pop();
            
          if (lastInteraction) {
            const approvalRequest: HumanApprovalRequest = {
              call_id: lastInteraction.call_id,
              node_id: lastInteraction.node_id,
              query: lastInteraction.query || sessionState.query,
              content: lastInteraction.content,
              approval_type: lastInteraction.interaction_type
            };
            
            setHumanApprovalRequest(approvalRequest);
            setShowApprovalDialog(true);
            
            console.log(`[${new Date().toISOString()}] 🔄 Restored pending human interaction:`, approvalRequest);
          }
        }
        
        if (sessionState.active_tab) {
          setActiveTab(sessionState.active_tab);
        } else {
          if (sessionState.status === 'awaiting_human_input') {
            setActiveTab('reasoning');
          } else if (sessionState.status === 'in_progress') {
            setActiveTab('reasoning');
          } else {
            setActiveTab('output');
          }
        }
        
        if (sessionState.status === 'in_progress' || sessionState.status === 'awaiting_human_input') {
          setIsLoading(true);
          pollResearchState(sessionState.research_id, 5000, 20, 0);
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error loading session data:`, error);
    }
  };

  const pollResearchState = useCallback((researchId: string, interval = 5000, maxAttempts = 20, currentAttempt = 0) => {
    console.log(`[${new Date().toISOString()}] 🔄 Starting polling for research state:`, researchId);
    
    const checkInterval = setInterval(async () => {
      if (!currentSessionIdRef.current || currentAttempt >= maxAttempts) {
        clearInterval(checkInterval);
        return;
      }
      
      try {
        const state = await getResearchState(researchId, currentSessionIdRef.current);
        
        if (state) {
          console.log(`[${new Date().toISOString()}] 📊 Polled state update:`, {
            status: state.status,
            hasAnswer: !!state.answer,
            sourceCount: state.sources?.length || 0,
            findingsCount: state.findings?.length || 0
          });
          
          if (state.status === 'completed') {
            console.log(`[${new Date().toISOString()}] ✅ Research completed according to polled state`);
            setIsLoading(false);
            clearInterval(checkInterval);
            
            // Update UI with final state
            if (state.answer) setResearchOutput(state.answer);
            if (state.sources) setSources(state.sources);
            if (state.findings) setFindings(state.findings);
            if (state.reasoning_path) setReasoningPath(state.reasoning_path);
            if (state.report_data) setReportData(state.report_data);
            
            setActiveTab("output");
          } else if (state.status === 'error') {
            console.error(`[${new Date().toISOString()}] ❌ Research error according to polled state:`, state.error);
            setIsLoading(false);
            clearInterval(checkInterval);
            
            if (state.error) {
              toast.error(state.error);
            } else {
              toast.error("An error occurred during research");
            }
            
            if (researchId && currentSessionIdRef.current) {
              // Provide all 4 arguments: researchId, interval, maxAttempts, currentAttempt
              pollResearchState(researchId, 5000, 20, 0);
            }
          }
        }
      } catch (err) {
        console.error("Error polling research state:", err);
      }
      
      // Increment the attempt counter
      currentAttempt++;
    }, interval);
    
    return checkInterval;
  }, []);

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
        saveResearchState({
          research_id: newResearchId,
          session_id: currentSessionIdRef.current,
          status: 'in_progress',
          query: query,
          user_model: JSON.stringify(userModelPayload),
          active_tab: "reasoning",
          reasoning_path: initialReasoningPath
        }).catch(err => console.error("Error saving initial research state:", err));
      }
      
      const modelToUse = selectedLLM === 'auto' ? 'claude-3.5-sonnet' : selectedLLM;
      startResearchStream(userModelPayload, newResearchId, query, modelToUse);
      
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

  const startResearchStream = (userModelData: any, researchId: string, query: string, modelToUse: string = 'claude-3.5-sonnet') => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const streamUrl = `https://timothy102--vertical-deep-research-stream-research.modal.run`;
    
    console.log(`[${new Date().toISOString()}] 🔄 Setting up POST connection to research stream`);
    
    const requestBody = {
      research_objective: query,
      user_model: userModelData,
      model: modelToUse,
      session_id: currentSessionIdRef.current,
      research_id: researchId,
      user_id: user?.id || 'anonymous',
      client_id: clientIdRef.current
    };
    
    fetch(streamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body reader could not be created');
      }
      
      console.log(`[${new Date().toISOString()}] 🔄 Connection established to research stream (POST)`);
      
      const processStreamChunks = async () => {
        let partialData = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log(`[${new Date().toISOString()}] 🔄 Stream completed`);
            setIsLoading(false);
            break;
          }
          
          const chunk = new TextDecoder().decode(value);
          const lines = (partialData + chunk).split('\n');
          partialData = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                processEventData(data, userModelData, researchId);
              } catch (e) {
                console.error(`[${new Date().toISOString()}] ❌ Error parsing event data:`, e);
              }
            }
          }
        }
      };
      
      processStreamChunks().catch(error => {
        console.error(`[${new Date().toISOString()}] ❌ Error processing stream:`, error);
        uiToast({
          title: "connection error",
          description: "lost connection to research service",
          variant: "destructive",
        });
        setIsLoading(false);
        
        if (researchId && currentSessionIdRef.current) {
          pollResearchState(researchId, 5000, 20, 0);
        }
      });
    })
    .catch(error => {
      console.error(`[${new Date().toISOString()}] ❌ Fetch error:`, error);
      uiToast({
        title: "connection error",
        description: "failed to connect to research service. Please try again later.",
        variant: "destructive",
      });
      setIsLoading(false);
      
      if (researchId && currentSessionIdRef.current) {
        pollResearchState(researchId, 5000, 20, 0);
      }
    });
  };

  const processEventData = (data: any, userModelData: any, researchId: string) => {
    if (!initialEventReceivedRef.current) {
      initialEventReceivedRef.current = true;
      console.log(`[${new Date().toISOString()}] 🎬 First event received, research is active`);
    }
    
    const eventClientId = data.client_id || userModelData.client_id;
    const eventSessionId = data.session_id || currentSessionIdRef.current;
    const eventResearchId = data.research_id || researchId;
    
    if (eventClientId !== clientIdRef.current) {
      console.warn(`[${new Date().toISOString()}] 🚫 Rejected event for different client:`, { 
        eventClientId: eventClientId?.substring(0, 15), 
        currentClientId: clientIdRef.current.substring(0, 15),
        eventType: data.event || data.type
      });
      return;
    }
    
    if (eventSessionId !== currentSessionIdRef.current || 
        eventResearchId !== researchId) {
      console.warn(`[${new Date().toISOString()}] 🚫 Rejected event for different session/research:`, { 
        eventSessionId,
        currentSessionId: currentSessionIdRef.current,
        eventResearchId,
        currentResearchId: researchId,
        eventType: data.event || data.type
      });
      return;
    }
    
    const eventType = data.event || data.type;
    console.log(`[${new Date().toISOString()}] 📊 Processing event:`, { 
      type: eventType, 
      clientId: clientIdRef.current.substring(0, 15)
    });
    
    const timestamp = new Date().toLocaleTimeString();
    if (data.data && data.data.message) {
      const progressEvent = `${timestamp}: ${data.data.message}`;
      setProgressEvents(prev => [...prev.slice(-4), progressEvent]);
    }
    
    if (data.data && data.data.node_id) {
      const nodeId = data.data.node_id;
      const rawEventData = JSON.stringify(data, null, 2);
      
      setRawData(prev => {
        const existing = prev[nodeId] || '';
        return {
          ...prev,
          [nodeId]: existing ? `${existing}\n${rawEventData}` : rawEventData
        };
      });
    }
    
    switch (eventType) {
      case "start":
        console.log("Research started");
        setActiveTab("reasoning");
        setCurrentStage("Starting research");
        
        window.dispatchEvent(new CustomEvent('research_state_update', { 
          detail: { 
            payload: {
              new: {
                session_id: currentSessionIdRef.current,
                reasoning_path: reasoningPath,
                status: 'in_progress'
              }
            },
            timestamp: new Date().toISOString()
          }
        }));
        break;
      case "update":
        const message = data.data.message || "";
        setResearchOutput(prev => prev + message + "\n");
        setCurrentStage("Generating answer");
        
        if (currentSessionIdRef.current) {
          updateResearchState(researchId, currentSessionIdRef.current, {
            answer: data.data.answer || ""
          }).catch(err => console.error("Error updating research state:", err));
        }
        break;
      case "source":
        const source = data.data.source || "";
        setSources(prev => [...prev, source]);
        setCurrentStage("Finding sources");
        
        if (currentSessionIdRef.current) {
          updateResearchState(researchId, currentSessionIdRef.current, {
            sources: [...sources, source]
          }).catch(err => console.error("Error updating sources:", err));
        }
        break;
      case "finding":
        const finding: Finding = { 
          source: data.data.source || "",
          content: data.data.content || undefined,
          node_id: data.data.node_id || undefined,
          query: data.data.query || undefined,
          finding: data.data.finding || undefined
        };
        
        console.log(`[${new Date().toISOString()}] 📑 Received finding:`, finding);
        
        setFindings(prev => [...prev, finding]);
        
        if (currentSessionIdRef.current) {
          const updatedFindings = [...findings, finding];
          updateResearchState(researchId, currentSessionIdRef.current, {
            findings: updatedFindings
          }).catch(err => console.error("Error updating findings:", err));
        }
        break;
      case "reasoning":
        const step = data.data.step || "";
        setCurrentStage("Analyzing information");
        
        if (step.toLowerCase().includes("planning")) {
          setCurrentStage("Planning research approach");
        } else if (step.toLowerCase().includes("search")) {
          setCurrentStage("Searching for information");
        } else if (step.toLowerCase().includes("read")) {
          setCurrentStage("Reading sources");
        } else if (step.toLowerCase().includes("synthe")) {
          setCurrentStage("Synthesizing information");
        }
        
        const nodeIdMatch = step.match(/Node ID:?\s*([a-zA-Z0-9_-]+)/i) || 
                          step.match(/node\s+(\d+)|#(\d+)/i);
        if (nodeIdMatch) {
          const nodeId = nodeIdMatch[1] || nodeIdMatch[2];
          const rawDataString = JSON.stringify(data, null, 2);
          
          setRawData(prev => {
            const existing = prev[nodeId] || '';
            return {
              ...prev,
              [nodeId]: existing ? `${existing}\n${rawDataString}` : rawDataString
            };
          });
        }
        
        if (step.toLowerCase().includes("synthesizing") && reasoningPath.length > 0 && reasoningPath.length % 5 === 0) {
          const syntheticRequest = {
            call_id: `synthetic-${researchId}-${reasoningPath.length}`,
            node_id: `${reasoningPath.length}`,
            query: researchObjective,
            content: `This is a synthetic approval request at step ${reasoningPath.length}. This would normally contain synthesized content based on the research so far.`,
            approval_type: "synthesis"
          };
          setHumanApprovalRequest(syntheticRequest);
        }
        
        setReasoningPath(prev => [...prev, step]);
        
        if (isLoading) {
          setActiveTab("reasoning");
        }
        
        if (currentSessionIdRef.current) {
          const updatedPath = [...reasoningPath, step];
          updateResearchState(researchId, currentSessionIdRef.current, {
            reasoning_path: updatedPath
          }).catch(err => console.error("Error updating reasoning path:", err));
        }
        break;
      case "report_update":
        console.log(`[${new Date().toISOString()}] 📄 Received report update:`, data.data);
        
        const reportUpdate: ReportSection = {
          node_id: data.data.node_id || '',
          synthesis: data.data.synthesis || '',
          confidence: data.data.confidence,
          timestamp: data.data.timestamp,
          query: data.data.query
        };
        
        setReportData(prev => {
          const existingData = prev || { sections: [] };
          
          const sectionIndex = existingData.sections.findIndex(
            s => s.node_id === reportUpdate.node_id
          );
          
          let updatedSections;
          if (sectionIndex >= 0) {
            updatedSections = [...existingData.sections];
            updatedSections[sectionIndex] = {
              ...updatedSections[sectionIndex],
              ...reportUpdate
            };
          } else {
            updatedSections = [...existingData.sections, reportUpdate];
          }
          
          return {
            ...existingData,
            sections: updatedSections
          };
        });
        
        if (currentSessionIdRef.current) {
          updateResearchState(researchId, currentSessionIdRef.current, {
            report_data: reportData
          }).catch(err => console.error("Error updating report data:", err));
        }
        
        setCurrentStage("Updating research report");
        break;
      case "final_report":
        console.log(`[${new Date().toISOString()}] 📝 Received final report:`, data.data);
        
        setReportData(prev => {
          const existingData = prev || { sections: [] };
          
          const rootSection = {
            node_id: 'root',
            synthesis: data.data.synthesis || '',
            confidence: data.data.confidence,
            query: data.data.query,
            is_root: true
          };
          
          const rootIndex = existingData.sections.findIndex(s => s.is_root);
          
          let updatedSections;
          if (rootIndex >= 0) {
            updatedSections = [...existingData.sections];
            updatedSections[rootIndex] = {
              ...updatedSections[rootIndex],
              ...rootSection
            };
          } else {
            updatedSections = [rootSection, ...existingData.sections];
          }
          
          return {
            sections: updatedSections,
            finalSynthesis: data.data.synthesis,
            confidence: data.data.confidence,
            sources: data.data.sources || [],
            findings: data.data.findings || []
          };
        });
        
        if (currentSessionIdRef.current) {
          updateResearchState(researchId, currentSessionIdRef.current, {
            report_data: reportData,
            answer: data.data.synthesis || ''
          }).catch(err => console.error("Error updating final report:", err));
        }
        
        setResearchOutput(data.data.synthesis || '');
        setCurrentStage("Finalizing research report");
        break;
      case "complete":
        const finalAnswer = data.data.answer || "";
        const finalSources = data.data.sources || [];
        const finalFindings = data.data.findings || [];
        const finalReasoningPath = data.data.reasoning_path || [];
        
        setResearchOutput(finalAnswer);
        setSources(finalSources);
        setFindings(finalFindings);
        setReasoningPath(finalReasoningPath);
        setIsLoading(false);
        
        if (currentSessionIdRef.current) {
          updateResearchState(researchId, currentSessionIdRef.current, {
            status: 'completed',
            answer: finalAnswer,
            sources: finalSources,
            findings: finalFindings,
            reasoning_path: finalReasoningPath,
            report_data: reportData
          }).catch(err => console.error("Error updating final state:", err));
        }
        
        setActiveTab("output");
        
        trackEvent('research_completed', {
          research_id: researchId,
          session_id: currentSessionIdRef.current,
          sources_count: finalSources.length,
          findings_count: finalFindings.length,
          answer_length: finalAnswer.length,
          has_report: !!reportData
        });
        break;
      case "error":
        uiToast({
          title: "research error",
          description: data.data.error || "Unknown error",
          variant: "destructive",
        });
        setIsLoading(false);
        
        if (researchId && currentSessionIdRef.current) {
          // Provide all 4 arguments: researchId, interval, maxAttempts, currentAttempt
          pollResearchState(researchId, 5000, 20, 0);
        }
        break;
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

  const handleApprovalAction = async (approved: boolean, comment?: string) => {
    if (!humanApprovalRequest || !currentSessionIdRef.current || !researchIdRef.current) return;
    
    try {
      await submitHumanFeedback({
        call_id: humanApprovalRequest.call_id,
        node_id: humanApprovalRequest.node_id,
        approved,
        comment,
        query: humanApprovalRequest.query,
        session_id: currentSessionIdRef.current,
        research_id: researchIdRef.current,
        approval_type: humanApprovalRequest.approval_type
      });
      
      setShowApprovalDialog(false);
      setHumanApprovalRequest(null);
      
      if (approved) {
        toast.success("Approved! Research will continue.");
      } else {
        toast.info("Research step rejected.");
      }
      
      trackEvent('human_approval_action', {
        approved,
        has_comment: !!comment,
        approval_type: humanApprovalRequest.approval_type
      });
      
    } catch (error) {
      console.error("Error submitting approval action:", error);
      uiToast({
        title: "Error submitting approval",
        description: "Please try again",
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
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="output" disabled={isLoading && !reportData?.sections?.length}>Output</TabsTrigger>
                  <TabsTrigger value="sources">
                    Sources 
                    {sources.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-muted rounded-full">{sources.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="reasoning">
                    Reasoning
                    {reasoningPath.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-muted rounded-full">{reasoningPath.length}</span>}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="output" className="space-y-4">
                  <ResearchOutput 
                    output={researchOutput} 
                    isLoading={isLoading && !reportData?.sections?.length}
                    reportData={reportData}
                    sessionId={sessionId}
                    showReport={true}
                  />
                </TabsContent>
                
                <TabsContent value="sources" className="space-y-4">
                  <SourcesList 
                    sources={sources}
                    findings={findings}
                    isLoading={isLoading} 
                  />
                </TabsContent>
                
                <TabsContent value="reasoning" className="space-y-4">
                  <ReasoningPath 
                    path={reasoningPath}
                    isLoading={isLoading}
                    reportData={reportData}
                    sessionId={sessionId}
                  />
                </TabsContent>
              </Tabs>
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
      
      {showApprovalDialog && humanApprovalRequest && (
        <HumanApprovalDialog
          isOpen={showApprovalDialog}
          request={humanApprovalRequest}
          onAction={handleApprovalAction}
          onClose={() => setShowApprovalDialog(false)}
        />
      )}
    </div>
  );
};

export default ResearchPage;
