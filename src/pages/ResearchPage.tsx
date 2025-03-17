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
import { getUserOnboardingStatus, UserModel, getUserModelById } from "@/services/userModelService";
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
}

interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
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
  const eventSourceRef = useRef<EventSource | null>(null);
  const researchIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(sessionId || null);
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
      const historyData = await getResearchHistory(20); // Limit to 20 items
      setHistory(historyData as ResearchHistoryEntry[]);
      const grouped = groupResearchHistoryByDate(historyData);
      setGroupedHistory(grouped);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const loadSessionData = async (sessionId: string) => {
    try {
      console.log("Loading session data for session ID:", sessionId);
      
      const sessionState = await getLatestSessionState(sessionId);
      
      if (!sessionState) {
        console.log("No existing session data found");
        return;
      }
      
      console.log("Retrieved session data:", sessionState);
      
      if (sessionState.research_id) {
        researchIdRef.current = sessionState.research_id;
        
        if (sessionState.active_tab) {
          setActiveTab(sessionState.active_tab);
        } else {
          setActiveTab(sessionState.status === 'in_progress' ? 'reasoning' : 'output');
        }
        
        if (sessionState.status === 'in_progress') {
          setIsLoading(true);
          pollResearchState(sessionState.research_id);
        }
      }
    } catch (error) {
      console.error("Error loading session data:", error);
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
              currentUnderstanding: currentUnderstanding
            };
          }
        } catch (err) {
          console.error("Error fetching user model:", err);
          userModelPayload = {
            user_id: user?.id || "anonymous",
            name: user?.email || "anonymous",
            userModel: userModelText,
            useCase: useCase,
            session_id: currentSessionIdRef.current,
            currentUnderstanding: currentUnderstanding
          };
        }
      } else {
        userModelPayload = {
          user_id: user?.id || "anonymous",
          name: user?.email || "anonymous",
          userModel: userModelText,
          useCase: useCase,
          session_id: currentSessionIdRef.current,
          currentUnderstanding: currentUnderstanding
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
      console.error("Research error:", error);
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
            user_id: user?.id
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
                
                const eventSessionId = data.session_id || currentSessionIdRef.current;
                const eventResearchId = data.research_id || researchId;
                
                if (eventSessionId !== currentSessionIdRef.current || 
                    eventResearchId !== researchId) {
                  console.warn("Received event for different session/research, ignoring", { 
                    eventSessionId, currentSessionId: currentSessionIdRef.current,
                    eventResearchId, currentResearchId: researchId
                  });
                  continue;
                }
                
                const eventType = data.event || data.type;
                console.log(`[${new Date().toISOString()}] 📊 Processing event type:`, eventType, data);
                
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
                    query: data.data.query || undefined
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
                } else if (eventType === "human_approval_request") {
                  console.log(`[${new Date().toISOString()}] 📝 Received human approval request:`, data.data);
                  
                  const approvalRequest = {
                    call_id: data.data.call_id,
                    node_id: data.data.node_id,
                    query: data.data.query || researchObjective,
                    content: data.data.content,
                    approval_type: data.data.approval_type || "synthesis"
                  };
                  
                  console.log(`[${new Date().toISOString()}] 🆔 Setting approval request with ID:`, approvalRequest.call_id);
                  setHumanApprovalRequest(approvalRequest);
                  
                  toast.custom(
                    (t) => (
                      <HumanApprovalDialog
                        content={approvalRequest.content}
                        query={approvalRequest.query}
                        callId={approvalRequest.call_id}
                        nodeId={approvalRequest.node_id}
                        approvalType={approvalRequest.approval_type}
                        isOpen={true}
                        onClose={() => {
                          console.log(`[${new Date().toISOString()}] 🚪 Dialog closed from toast:`, t);
                          toast.dismiss(t);
                        }}
                        onApprove={handleApproveRequest}
                        onReject={handleRejectRequest}
                      />
                    ),
                    {
                      id: `approval-${approvalRequest.call_id}`,
                      duration: Infinity,
                      position: "top-center"
                    }
                  );
                }
              } catch (error) {
                console.error("Error parsing event data:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Fetch error:", error);
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
        console.error("No session ID available for polling");
        return;
      }
      
      console.log("Polling for research state:", researchId, "in session:", currentSessionIdRef.current);
      
      const data = await getResearchState(researchId, currentSessionIdRef.current);
      
      if (!data) {
        console.log("No research state found, will retry...");
        setTimeout(() => pollResearchState(researchId), 3000);
        return;
      }
      
      console.log("Polled research state:", data);
      
      if ((data?.session_id && data.session_id !== currentSessionIdRef.current) ||
          (data?.research_id && data.research_id !== researchId)) {
        console.warn("Received polling response for different session/research, ignoring");
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
      }
    } catch (error) {
      console.error("Polling error:", error);
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
      console.log("Sending approval for call ID:", callId, "node ID:", nodeId);
      const response = await fetch('https://timothy102--vertical-deep-research-respond-to-approval.modal.run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_id: callId,
          approved: true,
          comment: '',
          session_id: currentSessionIdRef.current
        })
      });
      
      console.log("Approval response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Approval response error:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log("Approval response data:", responseData);
      
      uiToast({
        title: "approval submitted",
        description: "your approval has been processed",
      });
      
      setShowApprovalDialog(false);
      setHumanApprovalRequest(null);
    } catch (error) {
      console.error("Error submitting approval:", error);
      uiToast({
        title: "approval error",
        description: "there was an error submitting your approval",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (callId: string, nodeId: string, reason: string) => {
    try {
      console.log("Sending rejection for call ID:", callId, "node ID:", nodeId, "reason:", reason);
      const response = await fetch('https://timothy102--vertical-deep-research-respond-to-approval.modal.run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_id: callId,
          approved: false,
          comment: reason,
          session_id: currentSessionIdRef.current
        })
      });
      
      console.log("Rejection response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Rejection response error:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log("Rejection response data:", responseData);
      
      uiToast({
        title: "rejection submitted",
        description: "your rejection has been processed",
      });
      
      setShowApprovalDialog(false);
      setHumanApprovalRequest(null);
    } catch (error) {
      console.error("Error submitting rejection:", error);
      uiToast({
        title: "rejection error",
        description: "there was an error submitting your rejection",
        variant: "destructive",
      });
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-6 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600"></div>
          <a href="/" className="no-underline">
            <span className="font-display font-semibold text-xl lowercase">deepresearch</span>
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNewChat}
            className="flex items-center gap-1 lowercase"
          >
            <MessageSquarePlus className="h-4 w-4" />
            new chat
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/models")}
            className="flex items-center gap-1 lowercase"
          >
            <Brain className="h-4 w-4" />
            models
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 lowercase"
          >
            <User className="h-4 w-4" />
            profile
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-2 lowercase"
          >
            <LogOut className="h-4 w-4" />
            logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <aside className="w-64 border-r overflow-y-auto hidden md:block">
            <ResearchHistorySidebar 
              history={groupedHistory}
              onHistoryItemClick={loadHistoryItem}
            />
          </aside>
        )}

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold lowercase">deep research</h1>
              <Button
                variant="ghost"
                size="sm"
                className="md:flex hidden"
                onClick={toggleSidebar}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="space-y-6 mb-8">
              <ResearchForm 
                onSubmit={handleResearch}
                isLoading={isLoading}
              />
            </div>
            
            {(researchOutput || sources.length > 0 || reasoningPath.length > 0) && (
              <div className="mt-10">
                <Tabs 
                  value={activeTab} 
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="reasoning" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">research</span> planning
                    </TabsTrigger>
                    <TabsTrigger value="sources" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      sources
                    </TabsTrigger>
                    <TabsTrigger value="output" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      result
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="reasoning">
                    <ReasoningPath 
                      reasoningPath={reasoningPath} 
                      sources={sources}
                      findings={findings}
                      isLoading={isLoading}
                      isActive={isLoading}
                    />
                  </TabsContent>
                  
                  <TabsContent value="sources">
                    <SourcesList sources={sources} findings={findings} />
                  </TabsContent>
                  
                  <TabsContent value="output">
                    <ResearchOutput 
                      output={researchOutput} 
                      isLoading={isLoading}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </main>
      </div>
      
      <UserModelOnboarding 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
      
      {showApprovalDialog && humanApprovalRequest && (
        <HumanApprovalDialog
          isOpen={showApprovalDialog}
          onClose={() => {
            setShowApprovalDialog(false);
            setHumanApprovalRequest(null);
          }}
          content={humanApprovalRequest.content}
          query={humanApprovalRequest.query}
          callId={humanApprovalRequest.call_id}
          nodeId={humanApprovalRequest.node_id}
          approvalType={humanApprovalRequest.approval_type}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
        />
      )}
    </div>
  );
};

export default ResearchPage;

