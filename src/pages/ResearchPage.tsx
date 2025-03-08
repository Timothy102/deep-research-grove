
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, User, LogOut, FileText, X, Plus, HelpCircle } from "lucide-react";
import { saveResearchHistory, getResearchHistory } from "@/services/researchService";
import { useToast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ResearchHistory {
  id: string;
  query: string;
  user_model: string;
  use_case: string;
  created_at: string;
}

// Cognitive style options
const cognitiveStyles = [
  { id: "systematic", label: "systematic" },
  { id: "general", label: "general" },
  { id: "first-principles", label: "first-principles" },
  { id: "creative", label: "creative" },
  { id: "practical", label: "practical applier" },
];

// Expertise levels
const expertiseLevels = [
  "beginner",
  "intermediate",
  "advanced",
  "expert"
];

// Example research objective
const exampleObjective = `I was always interested as to why life needs to exist. Which biological/thermodynamical processes were in play for why we need to survive? My objective comes from curiosity, I'd love to understand the fundamentals behind this research objective. Feel free to synthesize more than one theory.`;

const ResearchPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [researchObjective, setResearchObjective] = useState("");
  const [userContext, setUserContext] = useState(""); // Added for current understanding
  
  // User model fields
  const [domain, setDomain] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState("intermediate");
  const [researchInterests, setResearchInterests] = useState<string[]>([""]);
  const [selectedCognitiveStyle, setSelectedCognitiveStyle] = useState("general");
  
  const [model, setModel] = useState("claude-3.5-sonnet"); // Default model
  const [isLoading, setIsLoading] = useState(false);
  const [researchOutput, setResearchOutput] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [reasoningPath, setReasoningPath] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("output");
  const [history, setHistory] = useState<ResearchHistory[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const researchIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    
    // Load research history
    const loadHistory = async () => {
      try {
        const historyData = await getResearchHistory();
        setHistory(historyData as ResearchHistory[]);
      } catch (error) {
        console.error("Error loading history:", error);
      }
    };
    
    loadHistory();
    
    return () => {
      // Clean up event source on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [user, navigate]);

  // Handle research interests management
  const addResearchInterest = () => {
    setResearchInterests([...researchInterests, ""]);
  };

  const removeResearchInterest = (index: number) => {
    const updatedInterests = [...researchInterests];
    updatedInterests.splice(index, 1);
    setResearchInterests(updatedInterests);
  };

  const updateResearchInterest = (index: number, value: string) => {
    const updatedInterests = [...researchInterests];
    updatedInterests[index] = value;
    setResearchInterests(updatedInterests);
  };

  // Create user model for API request
  const createUserModelPayload = () => {
    // Filter out empty research interests
    const filteredInterests = researchInterests.filter(interest => interest.trim() !== "");
    
    return {
      user_id: user?.id || "anonymous",
      name: user?.email || "anonymous",
      domain: domain,
      expertise_level: expertiseLevel,
      researchInterests: filteredInterests,
      cognitiveStyle: selectedCognitiveStyle,
      userContext: userContext // Add user context to the user model
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
  
    setIsLoading(true);
    setResearchOutput("");
    setSources([]);
    setReasoningPath([]);
    
    try {
      // Generate user model payload
      const userModelPayload = createUserModelPayload();
      
      // Save research history and get ID
      const savedData = await saveResearchHistory({
        query: researchObjective, // Using research objective as the query
        user_model: JSON.stringify(userModelPayload),
        model,
      });
      
      if (savedData && savedData[0] && savedData[0].id) {
        researchIdRef.current = savedData[0].id;
      }
      
      // Start research with POST request
      startResearchStream(userModelPayload);
      
      // Refresh history after submission
      const historyData = await getResearchHistory();
      setHistory(historyData as ResearchHistory[]);
      
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

  const startResearchStream = (userModelData: any) => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // Create a POST request to the stream_research endpoint
    const streamUrl = `https://timothy102--vertical-deep-research-stream-research.modal.run`;
    
    // Set up EventSource with POST using a lightweight fetch polyfill
    const fetchEventSource = async () => {
      try {
        const response = await fetch(streamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            research_objective: researchObjective, // Changed from query to research_objective
            user_model: userModelData,
            model: model
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Read the response as a stream
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Unable to get reader from response");
        }
        
        const decoder = new TextDecoder();
        let buffer = "";
        
        // Process the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          // Decode the chunk and add it to the buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete events in the buffer
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || ""; // Keep the last incomplete chunk in the buffer
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                
                // Process the event based on its type
                if (data.event === "start") {
                  console.log("Research started");
                } else if (data.event === "update") {
                  setResearchOutput(prev => prev + data.data.message + "\n");
                } else if (data.event === "source") {
                  setSources(prev => [...prev, data.data.source]);
                } else if (data.event === "reasoning") {
                  setReasoningPath(prev => [...prev, data.data.step]);
                } else if (data.event === "complete") {
                  setResearchOutput(data.data.answer);
                  setSources(data.data.sources || []);
                  setReasoningPath(data.data.reasoning_path || []);
                  setIsLoading(false);
                } else if (data.event === "error") {
                  toast({
                    title: "research error",
                    description: data.data.error,
                    variant: "destructive",
                  });
                  setIsLoading(false);
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
        
        // If streaming fails, try polling for research state
        if (researchIdRef.current) {
          pollResearchState(researchIdRef.current);
        }
      }
    };
    
    // Start the fetch process
    fetchEventSource();
  };
  
  const pollResearchState = async (researchId: string) => {
    try {
      // Use GET method for research state
      const response = await fetch(`https://timothy102--vertical-deep-research-get-research-state.modal.run?research_id=${researchId}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === "completed") {
        setResearchOutput(data.answer || "");
        setSources(data.sources || []);
        setReasoningPath(data.reasoning_path || []);
        setIsLoading(false);
      } else if (data.status === "in_progress") {
        // Keep polling if still in progress
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

  const loadHistoryItem = (item: ResearchHistory) => {
    setResearchObjective(item.query); // Load the query as the research objective
    
    // Try to parse user model from history
    try {
      const userModelData = JSON.parse(item.user_model || "{}");
      if (userModelData.domain) setDomain(userModelData.domain);
      if (userModelData.expertise_level) setExpertiseLevel(userModelData.expertise_level);
      if (userModelData.researchInterests && Array.isArray(userModelData.researchInterests)) {
        setResearchInterests(userModelData.researchInterests.length ? userModelData.researchInterests : [""]);
      }
      if (userModelData.userContext) setUserContext(userModelData.userContext);
      
      // Set selected cognitive style
      if (userModelData.cognitiveStyle) {
        setSelectedCognitiveStyle(userModelData.cognitiveStyle);
      }
    } catch (e) {
      console.error("Error parsing user model from history:", e);
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
              {/* Research Objective */}
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
                  placeholder="explain in detail what you want to research and what you already know about it..."
                  className="min-h-[100px]"
                />
              </div>
              
              {/* User Current Understanding */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">current understanding</label>
                <p className="text-sm text-muted-foreground">Explain in your own words what you already know about this topic. Use 2-5 sentences.</p>
                <Textarea
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="share what you already know about this research topic..."
                  className="min-h-[80px]"
                />
              </div>
              
              {/* User Domain */}
              <div>
                <label className="block text-sm font-medium mb-1">your domain/field</label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. computer science, medicine, finance..."
                />
              </div>
              
              {/* Expertise Level */}
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
              
              {/* Research Interests */}
              <div>
                <label className="block text-sm font-medium mb-1">research interests</label>
                <div className="space-y-2">
                  {researchInterests.map((interest, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={interest}
                        onChange={(e) => updateResearchInterest(index, e.target.value)}
                        placeholder={`research interest ${index + 1}`}
                        className="flex-1"
                      />
                      {researchInterests.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeResearchInterest(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addResearchInterest}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> add interest
                  </Button>
                </div>
              </div>
              
              {/* Cognitive Style (Radio buttons) */}
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
              
              {/* Model Selection */}
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
              
              {/* Submit Button */}
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
            
            {/* Research Results */}
            {(researchOutput || sources.length > 0 || reasoningPath.length > 0) && (
              <div className="mt-8 border rounded-lg overflow-hidden">
                <Tabs defaultValue="output" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="output">research output</TabsTrigger>
                    <TabsTrigger value="sources">sources ({sources.length})</TabsTrigger>
                    <TabsTrigger value="reasoning">reasoning path</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="output" className="p-4">
                    {isLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin opacity-70" />
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{researchOutput}</div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="sources" className="p-4">
                    {sources.length === 0 ? (
                      <p className="text-muted-foreground">no sources available yet.</p>
                    ) : (
                      <ul className="list-disc pl-5 space-y-2">
                        {sources.map((source, index) => (
                          <li key={index}>
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
                    )}
                  </TabsContent>
                  
                  <TabsContent value="reasoning" className="p-4">
                    {reasoningPath.length === 0 ? (
                      <p className="text-muted-foreground">no reasoning path available yet.</p>
                    ) : (
                      <ol className="list-decimal pl-5 space-y-2">
                        {reasoningPath.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResearchPage;
