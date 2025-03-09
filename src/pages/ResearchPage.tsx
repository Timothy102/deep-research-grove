import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, User, LogOut, FileText, X, Plus, HelpCircle, MessageSquarePlus } from "lucide-react";
import { saveResearchHistory, getResearchHistory } from "@/services/researchService";
import { saveResearchState, updateResearchState, getResearchState } from "@/services/researchStateService";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ReasoningPath from "@/components/research/ReasoningPath";
import SourcesList from "@/components/research/SourcesList";
import ResearchOutput from "@/components/research/ResearchOutput";
import HumanApprovalDialog from "@/components/research/HumanApprovalDialog";
import { v4 as uuidv4 } from 'uuid';

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
}

const cognitiveStyles = [
  { id: "systematic", label: "systematic" },
  { id: "general", label: "general" },
  { id: "first-principles", label: "first-principles" },
  { id: "creative", label: "creative" },
  { id: "practical", label: "practical applier" },
];

const expertiseLevels = [
  "beginner",
  "intermediate",
  "advanced",
  "expert"
];

const exampleObjective = `I was always interested as to why life needs to exist. Which biological/thermodynamical processes were in play for why we need to survive? My objective comes from curiosity, I'd love to understand the fundamentals behind this research objective. Feel free to synthesize more than one theory.`;

const ResearchPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [researchObjective, setResearchObjective] = useState("");
  const [userContext, setUserContext] = useState("");

  const [domain, setDomain] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState("intermediate");
  const [selectedCognitiveStyle, setSelectedCognitiveStyle] = useState("general");

  const [model, setModel] = useState("claude-3.5-sonnet");
  const [isLoading, setIsLoading] = useState(false);
  const [researchOutput, setResearchOutput] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [reasoningPath, setReasoningPath] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("output");
  const [history, setHistory] = useState<ResearchHistory[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const researchIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(sessionId || null);
  const { toast } = useToast();

  const [humanApprovalRequest, setHumanApprovalRequest] = useState<{
    call_id: string;
    node_id: string;
    query: string;
    content: string;
    approval_type: string;
  } | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

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
    
    resetResearchState();
    
    loadHistory();
    
    loadSessionData(sessionId);
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [user, navigate, sessionId]);

  useEffect(() => {
    if (humanApprovalRequest) {
      setShowApprovalDialog(true);
    }
  }, [humanApprovalRequest]);

  const resetResearchState = () => {
    setResearchOutput("");
    setSources([]);
    setFindings([]);
    setReasoningPath([]);
    setActiveTab("output");
    researchIdRef.current = null;
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const loadHistory = async () => {
    try {
      const historyData = await getResearchHistory();
      setHistory(historyData as ResearchHistory[]);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const loadSessionData = async (sessionId: string) => {
    try {
      const response = await fetch(`https://timothy102--vertical-deep-research-get-session-state.modal.run?session_id=${sessionId}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        console.log("No existing session data found or error occurred");
        return;
      }
      
      const data = await response.json();
      
      if (data && data.research_id) {
        researchIdRef.current = data.research_id;
        
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
          setResearchObjective(data.query || "");
          
          if (data.user_model) {
            const userModelData = typeof data.user_model === 'string' 
              ? JSON.parse(data.user_model) 
              : data.user_model;
            
            if (userModelData.domain) setDomain(userModelData.domain);
            if (userModelData.expertise_level) setExpertiseLevel(userModelData.expertise_level);
            if (userModelData.cognitiveStyle) setSelectedCognitiveStyle(userModelData.cognitiveStyle);
            if (userModelData.userContext) setUserContext(userModelData.userContext);
          }
        }
      }
    } catch (error) {
      console.error("Error loading session data:", error);
    }
  };

  const createUserModelPayload = () => {
    return {
      user_id: user?.id || "anonymous",
      name: user?.email || "anonymous",
      domain: domain,
      expertise_level: expertiseLevel,
      cognitiveStyle: selectedCognitiveStyle,
      userContext: userContext,
      session_id: currentSessionIdRef.current
    };
  };

  const handleResearch = async () => {
    if (!researchObjective.trim()) {
      toast({
        title: "objective required",
        description: "please enter a research objective",
        variant: "destructive",
      });
      return;
    }
  
    resetResearchState();
    setIsLoading(true);
    
    setActiveTab("reasoning");
    
    try {
      const userModelPayload = createUserModelPayload();
      
      const newResearchId = uuidv4();
      researchIdRef.current = newResearchId;
      
      await saveResearchHistory({
        query: researchObjective,
        user_model: JSON.stringify(userModelPayload),
        model,
      });
      
      if (currentSessionIdRef.current) {
        await saveResearchState({
          research_id: newResearchId,
          session_id: currentSessionIdRef.current,
          status: 'in_progress',
          query: researchObjective,
          user_model: JSON.stringify(userModelPayload)
        });
      }
      
      startResearchStream(userModelPayload, newResearchId);
      
      await loadHistory();
      
    } catch (error) {
      console.error("Research error:", error);
      toast({
        title: "research failed",
        description: "there was an error processing your request",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const startResearchStream = (userModelData: any, researchId: string) => {
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
            research_objective: researchObjective,
            user_model: userModelData,
            model: model,
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
                
                if (data.event === "start") {
                  console.log("Research started");
                } else if (data.event === "update") {
                  const message = data.data.message || "";
                  setResearchOutput(prev => prev + message + "\n");
                  
                  if (currentSessionIdRef.current) {
                    updateResearchState(researchId, currentSessionIdRef.current, {
                      answer: researchOutput + message + "\n"
                    }).catch(err => console.error("Error updating research state:", err));
                  }
                } else if (data.event === "source") {
                  const source = data.data.source || "";
                  setSources(prev => [...prev, source]);
                  
                  if (currentSessionIdRef.current) {
                    updateResearchState(researchId, currentSessionIdRef.current, {
                      sources: [...sources, source]
                    }).catch(err => console.error("Error updating sources:", err));
                  }
                } else if (data.event === "finding") {
                  const finding = { 
                    source: data.data.source || "",
                    content: data.data.content || undefined 
                  };
                  
                  setFindings(prev => [...prev, finding]);
                  
                  if (currentSessionIdRef.current) {
                    const updatedFindings = [...findings, finding];
                    updateResearchState(researchId, currentSessionIdRef.current, {
                      findings: updatedFindings
                    }).catch(err => console.error("Error updating findings:", err));
                  }
                } else if (data.event === "reasoning") {
                  const step = data.data.step || "";
                  setReasoningPath(prev => [...prev, step]);
                  
                  if (currentSessionIdRef.current) {
                    const updatedPath = [...reasoningPath, step];
                    updateResearchState(researchId, currentSessionIdRef.current, {
                      reasoning_path: updatedPath
                    }).catch(err => console.error("Error updating reasoning path:", err));
                  }
                } else if (data.event === "complete") {
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
                } else if (data.event === "error") {
                  toast({
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
                } else if (data.event === "human_approval_request") {
                  console.log("Received human approval request:", data.data);
                  setHumanApprovalRequest(data.data);
                }
              } catch (error) {
                console.error("Error parsing event data:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Fetch error:", error);
        toast({
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
      
      const url = `https://timothy102--vertical-deep-research-get-research-state.modal.run?research_id=${researchId}&session_id=${currentSessionIdRef.current}`;
      
      const response = await fetch(url, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if ((data.session_id && data.session_id !== currentSessionIdRef.current) ||
          (data.research_id && data.research_id !== researchId)) {
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
        
        setActiveTab("output");
      } else if (data.status === "in_progress") {
        setTimeout(() => pollResearchState(researchId), 3000);
      } else if (data.status === "error") {
        toast({
          title: "research error",
          description: data.error || "An error occurred during research",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Polling error:", error);
      toast({
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

  const loadHistoryItem = (item: ResearchHistory) => {
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
      const response = await fetch('https://timothy102--vertical-deep-research-human-approval.modal.run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_id: callId,
          node_id: nodeId,
          approved: true,
          reason: '',
          session_id: currentSessionIdRef.current
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      toast({
        title: "approval submitted",
        description: "your approval has been processed",
      });
    } catch (error) {
      console.error("Error submitting approval:", error);
      toast({
        title: "approval error",
        description: "there was an error submitting your approval",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (callId: string, nodeId: string, reason: string) => {
    try {
      const response = await fetch('https://timothy102--vertical-deep-research-human-approval.modal.run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_id: callId,
          node_id: nodeId,
          approved: false,
          reason: reason,
          session_id: currentSessionIdRef.current
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      toast({
        title: "rejection submitted",
        description: "your rejection has been processed",
      });
    } catch (error) {
      console.error("Error submitting rejection:", error);
      toast({
        title: "rejection error",
        description: "there was an error submitting your rejection",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-6 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600"></div>
          <a href="/" className="no-underline">
            <span className="font-display font-semibold text-xl">deepresearch</span>
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNewChat}
            className="flex items-center gap-1"
          >
            <MessageSquarePlus className="h-4 w-4" />
            new chat
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            profile
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r p-4 overflow-y-auto hidden md:block">
          <h3 className="font-semibold mb-4 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            research history
          </h3>
          
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">no history yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:bg-secondary/50"
                  onClick={() => loadHistoryItem(item)}
                >
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{item.query}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">deep research</h1>
            
            <div className="space-y-6 mb-8">              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-medium">research objective</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">what is a research objective?</h4>
                        <p className="text-xs text-muted-foreground">
                          explain why you're interested in this query:
                          <ul className="list-disc pl-4 mt-1">
                            <li>why does this question interest you?</li>
                            <li>what do you hope to learn from the answer?</li>
                            <li>is this for curiosity, work, or academic research?</li>
                          </ul>
                        </p>
                        <div className="mt-2 p-2 bg-muted rounded-md">
                          <p className="text-xs italic">{exampleObjective}</p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <p className="text-sm text-muted-foreground">What do you want to research?</p>
                
                <Textarea
                  value={researchObjective}
                  onChange={(e) => setResearchObjective(e.target.value)}
                  placeholder="explain your research objective strongly and explain what would be your ideal outcome"
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">current understanding</label>
                <Textarea
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="explain in your own words what you already know about this topic. Use 2-5 sentences."
                  className="min-h-[80px]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">your domain/field</label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. computer science, medicine, finance..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">expertise level</label>
                <select
                  value={expertiseLevel}
                  onChange={(e) => setExpertiseLevel(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                >
                  {expertiseLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">cognitive style</label>
                <RadioGroup 
                  value={selectedCognitiveStyle} 
                  onValueChange={setSelectedCognitiveStyle}
                  className="grid grid-cols-2 md:grid-cols-3 gap-2"
                >
                  {cognitiveStyles.map((style) => (
                    <div key={style.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={style.id} id={`cognitive-${style.id}`} />
                      <Label htmlFor={`cognitive-${style.id}`} className="text-sm">
                        {style.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="claude-3.5-sonnet">claude 3.5 sonnet</option>
                  <option value="gemini-2.0-flash">gemini 2.0 flash</option>
                  <option value="deepseek-ai/DeepSeek-R1">deepseek r1</option>
                  <option value="gpt4-turbo">gpt-4 turbo</option>
                </select>
              </div>
              
              <Button 
                onClick={handleResearch} 
                disabled={isLoading || !researchObjective.trim()}
                className="w-full h-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    researching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    start research
                  </>
                )}
              </Button>
            </div>
            
            {(researchOutput || sources.length > 0 || findings.length > 0 || reasoningPath.length > 0 || isLoading) && (
              <div className="mt-8 border rounded-lg overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="reasoning">reasoning path</TabsTrigger>
                    <TabsTrigger value="sources">
                      sources ({sources.length + findings.length})
                    </TabsTrigger>
                    <TabsTrigger value="output">research output</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="reasoning" className="p-4">
                    {isLoading && reasoningPath.length === 0 ? (
                      <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin opacity-70" />
                      </div>
                    ) : (
                      <ReasoningPath 
                        reasoningPath={reasoningPath} 
                        sources={sources} 
                        findings={findings}
                      />
                    )}
                  </TabsContent>
                  
                  <TabsContent value="sources" className="p-4">
                    <SourcesList sources={sources} findings={findings} />
                  </TabsContent>
                  
                  <TabsContent value="output" className="p-4">
                    {isLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin opacity-70" />
                      </div>
                    ) : (
                      <ResearchOutput output={researchOutput} />
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {humanApprovalRequest && (
        <HumanApprovalDialog
          isOpen={showApprovalDialog}
          onClose={() => setShowApprovalDialog(false)}
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
