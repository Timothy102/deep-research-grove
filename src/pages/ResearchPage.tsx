
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  MessageSquarePlus, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Send,
  MessageSquare,
  History,
  User
} from "lucide-react";
import { 
  getResearchHistory,
  groupResearchHistoryByDate,
  ResearchHistoryEntry 
} from "@/services/researchService";
import { toast } from "sonner";
import { getLatestSessionState } from "@/services/researchStateService";
import { ResearchForm } from "@/components/research/ResearchForm";
import ReasoningPath from "@/components/research/ReasoningPath";
import ResearchOutput from "@/components/research/ResearchOutput";
import ResearchHistorySidebar from "@/components/research/ResearchHistorySidebar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { LOCAL_STORAGE_KEYS, UI } from "@/lib/constants";
import { v4 as uuidv4 } from 'uuid';

const ResearchPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [researchOutput, setResearchOutput] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [reasoningPath, setReasoningPath] = useState<string[]>([]);
  const [history, setHistory] = useState<ResearchHistoryEntry[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE);
    return saved !== null ? saved === 'true' : true;
  });
  const [researchObjective, setResearchObjective] = useState("");
  const currentSessionIdRef = useRef<string | null>(sessionId || null);
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
    
    loadHistory();
    loadSessionData(sessionId);
  }, [user, navigate, sessionId]);

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
      const sessionState = await getLatestSessionState(sessionId);
      
      if (!sessionState) {
        console.log(`[${new Date().toISOString()}] ℹ️ No existing session data found`);
        return;
      }
      
      if (sessionState.research_id) {
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
      }
    } catch (error) {
      console.error("Error loading session data:", error);
    }
  };

  const handleResearch = async (query: string, userModelText: string, useCase: string) => {
    if (!query.trim()) {
      toast.error("Please enter a research objective");
      return;
    }
  
    setIsLoading(true);
    setResearchOutput("");
    setReasoningPath(["Analyzing research objective..."]);
    
    // Simulate research for demo
    setTimeout(() => {
      setResearchOutput("This is a simulated research response. In a real implementation, this would be populated with actual research results.");
      setIsLoading(false);
    }, 3000);
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

  const toggleSidebar = () => {
    const newState = !showSidebar;
    setShowSidebar(newState);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE, String(newState));
  };

  const loadHistoryItem = (item: ResearchHistoryEntry) => {
    setResearchObjective(item.query);
    // In a real implementation, we would load the full session
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Narrow sidebar with icons */}
      <div className="w-16 bg-white border-r flex flex-col items-center py-5 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mb-5"
          onClick={toggleSidebar}
        >
          {showSidebar ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="mb-3"
          onClick={handleNewChat}
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="mb-3"
        >
          <History className="h-5 w-5" />
        </Button>
        
        <div className="mt-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/models")}
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* History sidebar */}
      {showSidebar && !isMobile && (
        <div className="w-72 border-r bg-white overflow-y-auto flex-shrink-0">
          <ResearchHistorySidebar 
            isOpen={showSidebar}
            history={groupedHistory}
            onHistoryItemClick={(item) => loadHistoryItem(item)}
            onSelectItem={(item) => loadHistoryItem(item)}
            onToggle={toggleSidebar}
          />
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto px-6 py-6">
          {!researchOutput && reasoningPath.length === 0 ? (
            <ResearchOutput output="" isLoading={false} />
          ) : isLoading ? (
            <ReasoningPath 
              reasoningPath={reasoningPath} 
              sources={sources}
              findings={findings}
              isActive={true}
              isLoading={isLoading}
              rawData={{}}
              sessionId={currentSessionIdRef.current || ""}
            />
          ) : (
            <ResearchOutput 
              output={researchOutput} 
              isLoading={isLoading} 
            />
          )}
        </div>
        
        <div className="p-6 border-t bg-white">
          <div className="max-w-3xl mx-auto">
            <ResearchForm 
              isLoading={isLoading}
              initialValue={researchObjective}
              onSubmit={handleResearch}
              setResearchObjective={setResearchObjective}
              simplified={false}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResearchPage;
