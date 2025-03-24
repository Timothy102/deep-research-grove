import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Search, User, LogOut, MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Brain, FileText } from "lucide-react";
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
import ResearchHistorySidebar from "@/components/research/ResearchHistorySidebar";
import HumanApprovalDialog from "@/components/research/HumanApprovalDialog";
import UserModelOnboarding from "@/components/onboarding/UserModelOnboarding";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getClientId } from "@/integrations/supabase/client";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [humanApprovalRequest, setHumanApprovalRequest] = useState<HumanApprovalRequest | null>(null);
  const [researchObjective, setResearchObjective] = useState("");
  const [domain, setDomain] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState("");
  const [userContext, setUserContext] = useState("");
  const [selectedCognitiveStyle, setSelectedCognitiveStyle] = useState("");
  const [selectedLLM, setSelectedLLM] = useState("claude-3.5-sonnet");
  const [rawData, setRawData] = useState<Record<string, string>>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const researchIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(sessionId || null);
  const clientIdRef = useRef<string>(getClientId());
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
    
    checkOnboardingStatus();
    resetResearchState();
    loadHistory();
    loadSessionData(sessionId);
    
    return () => {
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
    setActiveTab("reasoning");
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
        
        // Restore all session state
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
        
        // Check for pending human interactions
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
                
          // Find the last unanswered interaction request
          const lastInteraction = interactions
            .filter(interaction => interaction.type === 'interaction_request')
            .pop();
            
          if (lastInteraction) {
            // Restore the human interaction request
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
          // Set appropriate active tab based on status
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
              model_id: model.id,
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
            session_id: currentSessionIdRef.current,
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
          session_id: currentSessionIdRef.current,
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
          reasoning_path: initialReasoningPath
        });
      }
      
      startResearchStream(userModelPayload, newResearchId, query);
      
      await loadHistory();
      
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

  const startResearchStream = (userModelData: any, researchId: string, query: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const streamUrl = `https://timothy102--vertical-deep-research-stream-research.modal.run`;
    
    const fetchEventSource = async () => {
      try {
        console.log(`[${new Date().toISOString()}] 🔄 Starting research stream with client ID:`, clientIdRef.current.substring(0, 15));
        
        const response = await fetch(streamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            research_objective: query,
            user_model: userModelData,
            model: selectedLLM,
            session_id: currentSessionIdRef.current,
            research_id: researchId,
            user_id: user?.id,
            client_id: clientIdRef.current
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Unable to get reader from response");
        }
        
        const decoder = new TextDecoder();
        let buffer = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                
                const eventClientId = data.client_id || userModelData.client_id;
                const eventSessionId = data.session_id || currentSessionIdRef.current;
                const eventResearchId = data.research_id || researchId;
                
                if (eventClientId !== clientIdRef.current) {
                  console.warn(`[${new Date().toISOString()}] 🚫 Rejected event for different client:`, { 
                    eventClientId: eventClientId?.substring(0, 15), 
                    currentClientId: clientIdRef.current.substring(0, 15),
                    eventType: data.event || data.type
                  });
                  continue;
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
                  continue;
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
                
                if (eventType === "start") {
                  console.log("Research started");
                  setActiveTab("reasoning");
                } else if (eventType === "update") {
                  const message = data.data.message || "";
                  setResearchOutput(prev => prev + message + "\n");
                  
                  if (currentSessionIdRef.current) {
                    updateResearchState(researchId, currentSessionIdRef.current, {
                      answer: researchOutput + message + "\n"
                    }).catch(err => console.error("Error updating research state:", err));
                  }
                } else if (eventType === "source") {
                  const source = data.data.source || "";
                  setSources(prev => [...prev, source]);
                  
                  if (currentSessionIdRef.current) {
                    updateResearchState(researchId, currentSessionIdRef.current, {
                      sources: [...sources, source]
                    }).catch(err => console.error("Error updating sources:", err));
                  }
                } else if (eventType === "finding") {
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
                } else if (eventType === "reasoning") {
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
                } else if (eventType === "complete") {
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
                } else if (eventType === "error") {
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
                } else if (eventType === "human_interaction_request") {
                  console.log(`[${new Date().toISOString()}] 🧠 Human interaction requested:`, data.data);
                  
                  const interactionRequest: HumanInteractionRequest = {
                    call_id: data.data.call_id,
                    node_id: data.data.node_id,
                    query: data.data.query || researchObjective,
                    content: data.data.content,
                    interaction_type: data.data.interaction_type
                  };
                  
                  // Convert HumanInteractionRequest to HumanApprovalRequest
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
                    // Create an array of human interactions
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
                    
                    // Save the human interaction request to the database for persistence
                    await updateResearchState(researchId, currentSessionIdRef.current, {
                      status: 'awaiting_human_input',
                      human_interactions: humanInteractions
                    });
                  }
                } else if (eventType === "human_interaction_result") {
                  console.log(`[${new Date().toISOString()}] 🧠 Human interaction result received:`, data.data);
                  
                  if (humanApprovalRequest?.call_id === data.data.call_id) {
                    setHumanApprovalRequest(null);
                    setShowApprovalDialog(false);
                  }
                  
                  toast.dismiss(`interaction-${data.data.call_id}`);
                  
                  if (currentSessionIdRef.current) {
                    // Update the database with the human interaction result
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
                }
              } catch (error) {
                console.error(`[${new Date().toISOString()}] ❌ Error parsing event data:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Fetch error:`, error);
        uiToast({
          title: "connection error",
          description: "failed to connect to research service",
          variant: "destructive",
        });
        setIsLoading(false);
        
        if (researchId && currentSessionIdRef.current) {
          pollResearchState(researchId);
        }
      }
    };
    
    fetchEventSource();
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
        // Do nothing, wait for human input
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

  return (
    <div className="flex flex-col min-h-screen max-h-screen">
      <header className="border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">arcadia research</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden md:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
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

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && !isMobile && (
          <aside className="w-72 border-r overflow-y-auto flex-shrink-0">
            <ResearchHistorySidebar 
              isOpen={sidebarOpen}
              history={groupedHistory}
              onHistoryItemClick={(item) => loadHistoryItem(item)}
              onSelectItem={(item) => loadHistoryItem(item)}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
            />
          </aside>
        )}

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <ResearchForm 
              isLoading={isLoading}
              initialValue={researchObjective}
              initialDomain={domain}
              initialExpertiseLevel={expertiseLevel}
              initialUserContext={userContext}
              initialCognitiveStyle={selectedCognitiveStyle}
              initialLLM={selectedLLM}
              onSubmit={handleResearch}
            />
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="reasoning" className="flex items-center space-x-1">
                  <Brain className="h-4 w-4" />
                  <span>process ({reasoningPath.length})</span>
                </TabsTrigger>
                <TabsTrigger value="output" className="flex items-center space-x-1">
                  <FileText className="h-4 w-4" />
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
        </main>
      </div>
      
      {showApprovalDialog && humanApprovalRequest && (
        <HumanApprovalDialog
          isOpen={showApprovalDialog}
          request={humanApprovalRequest}
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
