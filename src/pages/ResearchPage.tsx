
import { useState, useEffect, useRef, useCallback } from "react";
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
  getLatestSessionState 
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
  const [domain, setDomain] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState("");
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
        setDomain(model.domain);
        setExpertiseLevel(model.expertise_level);
        setSelectedCognitiveStyle(model.cognitive_style);
        
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
    setResearchObjective("");  // Clear the research objective
    setDomain("");
    setExpertiseLevel("");
    setUserContext("");
    setSelectedCognitiveStyle("");
    researchIdRef.current = null;
    initialEventReceivedRef.current = false;
    setProgressEvents([]);
    setCurrentStage("Initializing research");
    
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
          pollResearchState(sessionState.research_id);
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
              domain: model.domain,
              expertise_level: model.expertise_level,
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
            domain: domain,
            expertise_level: expertiseLevel,
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
          domain: domain,
          expertise_level: expertiseLevel,
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
          pollResearchState(researchId);
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
        pollResearchState(researchId);
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
        const existingData = prev[nodeId] || '';
        const updatedData = existingData 
          ? `${existingData}\n${rawEventData}`
          : rawEventData;
        
        return { ...prev, [nodeId]: updatedData };
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
            reasoning_path: finalReasoningPath
          }).catch(err => console.error("Error updating final state:", err));
        }
        
        setActiveTab("output");
        break;
      case "error":
        uiToast({
          title: "research error",
          description: data.data.error || "Unknown error",
          variant: "destructive",
        });
        setIsLoading(false);
        
        if (currentSessionIdRef.current) {
          updateResearchState(researchId, currentSessionIdRef.current, {
            status: 'error',
          }).catch(err => console.error("Error updating error state:", err));
        }
        break;
      case "human_interaction_request":
        console.log(`[${new Date().toISOString()}] 🧠 Human interaction requested:`, data.data);
        
        const interactionRequest: HumanInteractionRequest = {
          call_id: data.data.call_id,
          node_id: data.data.node_id,
          query: data.data.query || researchObjective,
          content: data.data.content,
          interaction_type: data.data.interaction_type
        };
        
        const approvalRequest: HumanApprovalRequest = {
          ...interactionRequest,
          approval_type: interactionRequest.interaction_type
        };
        
        setHumanApprovalRequest(approvalRequest);
        setShowApprovalDialog(true);
        
        window.postMessage(
          { 
            type: "human_interaction_request", 
            data: interactionRequest
          }, 
          window.location.origin
        );
        
        if (currentSessionIdRef.current) {
          const humanInteractions: HumanInteraction[] = [
            ...findings.map(f => ({ 
              type: 'finding', 
              call_id: f.node_id || '', 
              node_id: f.node_id || '',
              content: f.content || '',
              query: f.query || '',
              interaction_type: 'finding',
              status: 'completed' as const
            })),
            { 
              type: 'interaction_request', 
              call_id: interactionRequest.call_id,
              node_id: interactionRequest.node_id,
              query: interactionRequest.query,
              content: interactionRequest.content,
              interaction_type: interactionRequest.interaction_type,
              status: 'pending' as const,
              timestamp: new Date().toISOString()
            }
          ];
          
          updateResearchState(researchId, currentSessionIdRef.current, {
            status: 'awaiting_human_input',
            human_interactions: humanInteractions
          }).catch(err => console.error("Error updating human interaction state:", err));
        }
        break;
      case "human_interaction_result":
        console.log(`[${new Date().toISOString()}] 🧠 Human interaction result received:`, data.data);
        
        if (humanApprovalRequest?.call_id === data.data.call_id) {
          setHumanApprovalRequest(null);
          setShowApprovalDialog(false);
        }
        
        toast.dismiss(`interaction-${data.data.call_id}`);
        
        if (currentSessionIdRef.current) {
          updateResearchState(researchId, currentSessionIdRef.current, {
            status: 'in_progress',
            custom_data: JSON.stringify({
              ...data.data,
              timestamp: new Date().toISOString(),
              type: 'interaction_result'
            })
          }).catch(err => console.error("Error updating human interaction result:", err));
        }
        
        const humanFeedbackStep = `Human feedback received for ${data.data.interaction_type}: ${data.data.approved ? 'Approved' : 'Rejected'}${data.data.comment ? ` - Comment: ${data.data.comment}` : ''}`;
        setReasoningPath(prev => [...prev, humanFeedbackStep]);
        break;
    }
  };

  const pollResearchState = async (researchId: string) => {
    try {
      if (!currentSessionIdRef.current) {
        console.error(`[${new Date().toISOString()}] ❌ No session ID available for polling`);
        return;
      }
      
      console.log(`[${new Date().toISOString()}] 🔄 Polling research state:`, { 
        researchId,
        sessionId: currentSessionIdRef.current,
        clientId: clientIdRef.current.substring(0, 15)
      });
      
      const data = await getResearchState(researchId, currentSessionIdRef.current);
      
      if (!data) {
        console.log(`[${new Date().toISOString()}] ℹ️ No research state found, will retry...`);
        setTimeout(() => pollResearchState(researchId), 3000);
        return;
      }
      
      console.log(`[${new Date().toISOString()}] ✅ Polled research state:`, { 
        id: data.id,
        status: data.status,
        clientId: data.client_id?.substring(0, 15) || 'none'
      });
      
      if (data.client_id && data.client_id !== clientIdRef.current) {
        console.warn(`[${new Date().toISOString()}] 🚫 Rejected polling response for different client:`, {
          stateClientId: data.client_id.substring(0, 15), 
          currentClientId: clientIdRef.current.substring(0, 15)
        });
        return;
      }
      
      if ((data?.session_id && data.session_id !== currentSessionIdRef.current) ||
          (data?.research_id && data.research_id !== researchId)) {
        console.warn(`[${new Date().toISOString()}] 🚫 Rejected polling response for different session/research`, {
          stateSessionId: data.session_id,
          currentSessionId: currentSessionIdRef.current,
          stateResearchId: data.research_id,
          currentResearchId: researchId
        });
        return;
      }
      
      if (data.status === "completed") {
        setResearchOutput(data.answer || "");
        setSources(data.sources || []);
        
        if (data.findings) {
          const parsedFindings = Array.isArray(data.findings) 
            ? data.findings 
            : (typeof data.findings === 'string' ? JSON.parse(data.findings) : []);
          setFindings(parsedFindings);
        }
        
        setReasoningPath(data.reasoning_path || []);
        setIsLoading(false);
        
        if (data.active_tab) {
          setActiveTab(data.active_tab);
        } else if (activeTab === "reasoning") {
          setActiveTab("output");
        }
      } else if (data.status === "in_progress") {
        if (data.answer) setResearchOutput(data.answer);
        if (data.sources) setSources(data.sources);
        
        if (data.findings) {
          const parsedFindings = Array.isArray(data.findings) 
            ? data.findings 
            : (typeof data.findings === 'string' ? JSON.parse(data.findings) : []);
          setFindings(parsedFindings);
        }
        
        if (data.reasoning_path) setReasoningPath(data.reasoning_path);
        
        setTimeout(() => pollResearchState(researchId), 3000);
      } else if (data.status === "error") {
        uiToast({
          title: "research error",
          description: data.error || "An error occurred during research",
          variant: "destructive",
        });
        setIsLoading(false);
      } else if (data.status === 'awaiting_human_input') {
        console.log(`[${new Date().toISOString()}] ⏳ Awaiting human input, will retry...`);
        setTimeout(() => pollResearchState(researchId), 3000);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Polling error:`, error);
      uiToast({
        title: "Error",
        description: "Failed to retrieve research results",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleNewChat = () => {
    const newSessionId = uuidv4();
    
    localStorage.setItem('newChatRequested', 'true');
    
    navigate(`/research/${newSessionId}`);
  };

  const loadHistoryItem = (item: ResearchHistoryEntry) => {
    setResearchObjective(item.query);
    
    try {
      const userModelData = JSON.parse(item.user_model || "{}");
      if (userModelData.domain) setDomain(userModelData.domain);
      if (userModelData.expertise_level) setExpertiseLevel(userModelData.expertise_level);
      if (userModelData.userContext) setUserContext(userModelData.userContext);
      
      if (userModelData.cognitiveStyle) {
        setSelectedCognitiveStyle(userModelData.cognitiveStyle);
      }
      
      if (userModelData.session_id && userModelData.session_id !== currentSessionIdRef.current) {
        navigate(`/research/${userModelData.session_id}`);
        return;
      }
    } catch (e) {
      console.error("Error parsing user model from history:", e);
    }
  };

  const handleApproveRequest = async (callId: string, nodeId: string) => {
    try {
      console.log(`[${new Date().toISOString()}] 👍 Sending approval for call ID:`, callId, "node ID:", nodeId);
      
      await submitFeedback(callId, true, '');
      
      toast.success("Feedback submitted successfully");
      setShowApprovalDialog(false);
      setHumanApprovalRequest(null);
      
      return Promise.resolve();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error submitting approval:`, error);
      toast.error("Failed to submit feedback");
      throw error;
    }
  };

  const handleRejectRequest = async (callId: string, nodeId: string, reason: string) => {
    try {
      console.log(`[${new Date().toISOString()}] 👎 Sending rejection for call ID:`, callId, "node ID:", nodeId, "reason:", reason);
      
      await submitFeedback(callId, false, reason);
      
      toast.success("Feedback submitted successfully");
      setShowApprovalDialog(false);
      setHumanApprovalRequest(null);
      
      return Promise.resolve();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error submitting rejection:`, error);
      toast.error("Failed to submit feedback");
      throw error;
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-h-screen">
      <header className="border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <img src="/arcadia.png" alt="Nexus Logo" className="h-6 w-6" />
            <h1 className="text-lg font-semibold">nexus</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/models")}
              className="flex items-center gap-1"
            >
              <User className="h-4 w-4" />
              <span>user models</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleNewChat}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <ResearchHistorySidebar 
          isOpen={sidebarOpen}
          history={groupedHistory}
          onHistoryItemClick={(item) => loadHistoryItem(item)}
          onSelectItem={(item) => loadHistoryItem(item)}
          onToggle={toggleSidebar}
        />

        <main className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-200 ease-in-out",
          sidebarOpen && "lg:ml-72",
          !sidebarOpen && "ml-0"
        )}>
          {initialEventReceivedRef.current || researchObjective ? (
            <>
              <div className={cn(
                "p-4 border-b transition-opacity duration-300",
                isLoading && initialEventReceivedRef.current ? "opacity-50" : "opacity-100"
              )}>
                <ResearchForm 
                  isLoading={isLoading}
                  initialValue={researchObjective}
                  initialDomain={domain}
                  initialExpertiseLevel={expertiseLevel}
                  initialUserContext={userContext}
                  initialCognitiveStyle={selectedCognitiveStyle}
                  initialLLM={selectedLLM}
                  onLLMChange={setSelectedLLM}
                  onSubmit={handleResearch}
                  setResearchObjective={setResearchObjective}
                />
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {isLoading && (
                  <div className="mb-4">
                    <ProgressIndicator 
                      isLoading={isLoading} 
                      currentStage={currentStage}
                      events={progressEvents}
                    />
                  </div>
                )}
                
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="reasoning" className="flex items-center space-x-1">
                      <span>process ({reasoningPath.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="output" className="flex items-center space-x-1">
                      <span>output</span>
                    </TabsTrigger>
                    <TabsTrigger value="sources" className="flex items-center space-x-1">
                      <Search className="h-4 w-4" />
                      <span>sources ({sources.length})</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="reasoning" className="mt-0">
                    <ReasoningPath 
                      reasoningPath={reasoningPath} 
                      sources={sources}
                      findings={findings}
                      isActive={activeTab === "reasoning"}
                      isLoading={isLoading}
                      rawData={rawData}
                      sessionId={currentSessionIdRef.current || ""}
                    />
                  </TabsContent>
                  
                  <TabsContent value="output" className="mt-0">
                    <ResearchOutput output={researchOutput} isLoading={isLoading} />
                  </TabsContent>
                  
                  <TabsContent value="sources" className="mt-0">
                    <SourcesList sources={sources} />
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="max-w-4xl w-full">
                <div className="mb-8">
                  <ResearchOutput 
                    output="" 
                    userName={displayName || user?.email?.split('@')[0] || "researcher"}
                    userModels={userModels}
                    onSelectModel={selectUserModel}
                  />
                </div>
                
                <ResearchForm 
                  isLoading={isLoading}
                  initialValue={researchObjective}
                  initialDomain={domain}
                  initialExpertiseLevel={expertiseLevel}
                  initialUserContext={userContext}
                  initialCognitiveStyle={selectedCognitiveStyle}
                  initialLLM={selectedLLM}
                  onLLMChange={setSelectedLLM}
                  onSubmit={handleResearch}
                  setResearchObjective={setResearchObjective}
                />
              </div>
            </div>
          )}
        </main>
      </div>
      
      {showApprovalDialog && humanApprovalRequest && (
        <HumanApprovalDialog
          isOpen={showApprovalDialog}
          callId={humanApprovalRequest.call_id}
          nodeId={humanApprovalRequest.node_id}
          query={humanApprovalRequest.query}
          content={humanApprovalRequest.content}
          approvalType={humanApprovalRequest.approval_type}
          onApprove={(callId, nodeId) => handleApproveRequest(callId, nodeId)}
          onReject={(callId, nodeId, reason) => handleRejectRequest(callId, nodeId, reason)}
          onClose={() => setShowApprovalDialog(false)}
        />
      )}
      
      {showOnboarding && (
        <UserModelOnboarding
          isOpen={true}
          onClose={() => setShowOnboarding(false)}
          onCompleted={(model: any) => {
            setShowOnboarding(false);
            markOnboardingCompleted();
            setDomain(model.domain);
            setExpertiseLevel(model.expertise_level);
            setSelectedCognitiveStyle(model.cognitive_style);
            loadUserModels();
          }}
        />
      )}
    </div>
  );
};

export default ResearchPage;
