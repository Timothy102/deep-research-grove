import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Search, User, LogOut, MessageSquarePlus, Brain, FileText } from "lucide-react";
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
import { getUserOnboardingStatus, UserModel, getUserModelById, markOnboardingCompleted } from "@/services/userModelService";
import { submitHumanFeedback } from "@/services/humanInteractionService";
import { respondToApproval } from "@/services/humanLayerService";
import { useToast } from "@/hooks/use-toast";
import { ResearchForm } from "@/components/research/ResearchForm";
import ReasoningPath from "@/components/research/ReasoningPath";
import SourcesList from "@/components/research/SourcesList";
import ResearchOutput from "@/components/research/ResearchOutput";
import SideNav from "@/components/research/SideNav";
import HumanApprovalDialog from "@/components/research/HumanApprovalDialog";
import UserModelOnboarding from "@/components/onboarding/UserModelOnboarding";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getClientId } from "@/integrations/supabase/client";
import { LOCAL_STORAGE_KEYS, BRAND_COLORS } from "@/lib/constants";

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
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB);
    return savedTab || "output";
  });
  const [history, setHistory] = useState<ResearchHistoryEntry[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<any[]>([]);
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
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const researchIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(sessionId || null);
  const clientIdRef = useRef<string>(getClientId());
  const { toast: uiToast } = useToast();
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB, activeTab);
  }, [activeTab]);

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
    
    checkOnboardingStatus();
    resetResearchState();
    loadHistory();
    loadSessionData(sessionId);
    
    const timer = setTimeout(() => {
      setIsFirstLoad(false);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [user, navigate, sessionId]);

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
    setResearchOutput("");
    setSources([]);
    setFindings([]);
    setReasoningPath([]);
    researchIdRef.current = null;
    
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
        break;
      case "update":
        const message = data.data.message || "";
        setResearchOutput(prev => prev + message + "\n");
        
        if (currentSessionIdRef.current) {
          updateResearchState(researchId, currentSessionIdRef.current, {
            answer: data.data.answer || ""
          }).catch(err => console.error("Error updating research state:", err));
        }
        break;
      case "source":
        const source = data.data.source || "";
        setSources(prev => [...prev, source]);
        
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
    navigate(`/research/${newSessionId}`);
  };

  const handleApproveRequest = async (callId: string, nodeId: string) => {
    try {
      console.log(`[${new Date().toISOString()}] 👍 Sending approval for call ID:`, callId, "node ID:", nodeId);
      
      await respondToApproval(callId, true, '');
      
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
      
      await respondToApproval(callId, false, reason);
      
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

  const showWelcomeScreen = isFirstLoad && !researchOutput && reasoningPath.length === 0;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <SideNav 
          historyGroups={groupedHistory}
          onHistoryItemClick={loadHistoryItem}
        />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b border-slate-700 bg-slate-800 shadow-sm p-4">
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
          </header>
          
          <div className="flex-1 overflow-auto p-4">
            {showWelcomeScreen ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="text-5xl mb-6 text-claude-DEFAULT">🧠</div>
                <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">Deep Research</h1>
                <p className="text-slate-400 max-w-lg mb-6">
                  Enter your research objective above to get started. 
                  The AI will help you analyze topics, find sources, and create comprehensive answers.
                </p>
                <div className="flex flex-wrap gap-4 justify-center max-w-xl">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-60">
                    <Brain className="h-5 w-5 text-indigo-400 mb-2" />
                    <h3 className="font-semibold text-slate-200 mb-1">Advanced Reasoning</h3>
                    <p className="text-sm text-slate-400">Watch the AI's reasoning process step-by-step</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-60">
                    <Search className="h-5 w-5 text-indigo-400 mb-2" />
                    <h3 className="font-semibold text-slate-200 mb-1">Source Tracking</h3>
                    <p className="text-sm text-slate-400">See all the sources used to generate the answer</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-slate-900 p-2">
                    <TabsTrigger 
                      value="reasoning" 
                      className="data-[state=active]:bg-indigo-900/40 data-[state=active]:text-indigo-400 text-slate-400"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      <span>Process ({reasoningPath.length})</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="output" 
                      className="data-[state=active]:bg-indigo-900/40 data-[state=active]:text-indigo-400 text-slate-400"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span>Output</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sources" 
                      className="data-[state=active]:bg-indigo-900/40 data-[state=active]:text-indigo-400 text-slate-400"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      <span>Sources ({sources.length})</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="reasoning" className="m-0">
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
                  
                  <TabsContent value="output" className="m-0">
                    <ResearchOutput output={researchOutput} isLoading={isLoading} />
                  </TabsContent>
                  
                  <TabsContent value="sources" className="m-0">
                    <SourcesList sources={sources} />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
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
          }}
        />
      )}
    </div>
  );
};

export default ResearchPage;
