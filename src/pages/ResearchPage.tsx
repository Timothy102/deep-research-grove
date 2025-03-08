
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, User, LogOut, FileText, X, Plus } from "lucide-react";
import { saveResearchHistory, getResearchHistory } from "@/services/researchService";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ResearchHistory {
  id: string;
  query: string;
  user_model: string;
  use_case: string;
  created_at: string;
}

// Cognitive style options
const cognitiveStyles = [
  { id: "systematic", label: "Systematic" },
  { id: "general", label: "General" },
  { id: "first-principles", label: "First-principles" },
  { id: "creative", label: "Creative" },
  { id: "practical", label: "Practical Applier" },
];

// Expertise levels
const expertiseLevels = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert"
];

const ResearchPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [userModel, setUserModel] = useState("");
  const [useCase, setUseCase] = useState("");
  
  // User model fields
  const [domain, setDomain] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState("Intermediate");
  const [researchInterests, setResearchInterests] = useState<string[]>([""]);
  const [selectedCognitiveStyles, setSelectedCognitiveStyles] = useState<Record<string, boolean>>({
    systematic: false,
    general: true,
    "first-principles": false,
    creative: false,
    practical: false
  });
  
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

  // Toggle cognitive style selection
  const toggleCognitiveStyle = (styleId: string) => {
    setSelectedCognitiveStyles(prev => ({
      ...prev,
      [styleId]: !prev[styleId]
    }));
  };

  // Get selected cognitive styles as comma-separated string
  const getSelectedCognitiveStyles = (): string => {
    return Object.entries(selectedCognitiveStyles)
      .filter(([_, isSelected]) => isSelected)
      .map(([style]) => style)
      .join(", ");
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
      cognitiveStyle: getSelectedCognitiveStyles()
    };
  };

  const handleResearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Query required",
        description: "Please enter a research query",
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
        query,
        user_model: JSON.stringify(userModelPayload),
        use_case: useCase,
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
        title: "Research Failed",
        description: "There was an error processing your request",
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
            query: query,
            user_model: userModelData,
            use_case: useCase,
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
                    title: "Research Error",
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
          title: "Connection Error",
          description: "Failed to connect to research service",
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
          title: "Research Error",
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
    setQuery(item.query);
    
    // Try to parse user model from history
    try {
      const userModelData = JSON.parse(item.user_model || "{}");
      if (userModelData.domain) setDomain(userModelData.domain);
      if (userModelData.expertise_level) setExpertiseLevel(userModelData.expertise_level);
      if (userModelData.researchInterests && Array.isArray(userModelData.researchInterests)) {
        setResearchInterests(userModelData.researchInterests.length ? userModelData.researchInterests : [""]);
      }
      
      // Reset cognitive styles
      const newCognitiveStyles: Record<string, boolean> = {
        systematic: false,
        general: false,
        "first-principles": false,
        creative: false,
        practical: false
      };
      
      // Set selected cognitive styles
      if (userModelData.cognitiveStyle) {
        const styles = userModelData.cognitiveStyle.split(",").map((s: string) => s.trim());
        styles.forEach((style: string) => {
          if (style in newCognitiveStyles) {
            newCognitiveStyles[style] = true;
          }
        });
      }
      setSelectedCognitiveStyles(newCognitiveStyles);
    } catch (e) {
      console.error("Error parsing user model from history:", e);
      setUserModel(item.user_model || "");
    }
    
    setUseCase(item.use_case || "");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-6 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600"></div>
          <a href="/" className="no-underline">
            <span className="font-display font-semibold text-xl">DeepResearch</span>
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
            Profile
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r p-4 overflow-y-auto hidden md:block">
          <h3 className="font-semibold mb-4 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Research History
          </h3>
          
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet</p>
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
            <h1 className="text-2xl font-bold mb-6">Deep Research</h1>
            
            <div className="space-y-6 mb-8">
              {/* Research Query */}
              <div>
                <label className="block text-sm font-medium mb-1">Research Query</label>
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your research question..."
                  className="min-h-[100px]"
                />
              </div>
              
              {/* User Domain */}
              <div>
                <label className="block text-sm font-medium mb-1">Your Domain/Field</label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. Computer Science, Medicine, Finance..."
                />
              </div>
              
              {/* Expertise Level */}
              <div>
                <label className="block text-sm font-medium mb-1">Expertise Level</label>
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
                <label className="block text-sm font-medium mb-1">Research Interests</label>
                <div className="space-y-2">
                  {researchInterests.map((interest, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={interest}
                        onChange={(e) => updateResearchInterest(index, e.target.value)}
                        placeholder={`Research interest ${index + 1}`}
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
                    <Plus className="h-3 w-3" /> Add Interest
                  </Button>
                </div>
              </div>
              
              {/* Cognitive Style */}
              <div>
                <label className="block text-sm font-medium mb-2">Cognitive Style</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {cognitiveStyles.map((style) => (
                    <div key={style.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`cognitive-${style.id}`} 
                        checked={selectedCognitiveStyles[style.id]} 
                        onCheckedChange={() => toggleCognitiveStyle(style.id)}
                      />
                      <Label htmlFor={`cognitive-${style.id}`}>{style.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Use Case (Optional) */}
              <div>
                <label className="block text-sm font-medium mb-1">Use Case (Optional)</label>
                <Input
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  placeholder="What is this research for?"
                />
              </div>
              
              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="deepseek-ai/DeepSeek-R1">DeepSeek R1</option>
                  <option value="gpt4-turbo">GPT-4 Turbo</option>
                </select>
              </div>
              
              {/* Submit Button */}
              <Button 
                onClick={handleResearch} 
                disabled={isLoading || !query.trim()}
                className="w-full h-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Researching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Start Research
                  </>
                )}
              </Button>
            </div>
            
            {/* Research Results */}
            {(researchOutput || sources.length > 0 || reasoningPath.length > 0) && (
              <div className="mt-8 border rounded-lg overflow-hidden">
                <Tabs defaultValue="output" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="output">Research Output</TabsTrigger>
                    <TabsTrigger value="sources">Sources ({sources.length})</TabsTrigger>
                    <TabsTrigger value="reasoning">Reasoning Path</TabsTrigger>
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
                      <p className="text-muted-foreground">No sources available yet.</p>
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
                      <p className="text-muted-foreground">No reasoning path available yet.</p>
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
