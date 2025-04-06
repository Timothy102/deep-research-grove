
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

interface ResearchPageProps {}

const ResearchPage: React.FC<ResearchPageProps> = () => {
  const [query, setQuery] = useState("");
  const [researchId, setResearchId] = useState(uuidv4());
  const [sessionId, setSessionId] = useState<string | undefined>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID) || uuidv4();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [userModel, setUserModel] = useState<UserModel | null>(null);
  const [isHumanApprovalDialogOpen, setIsHumanApprovalDialogOpen] = useState(false);
  const [humanApprovalData, setHumanApprovalData] = useState<{
    call_id: string;
    node_id: string;
    query: string;
    content: string;
    interaction_type: string;
  } | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("research");
  const [showSidebar, setShowSidebar] = useState(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE);
    return savedState !== null ? savedState === 'true' : false;
  });
  const [progress, setProgress] = useState(0);
  const [isNewSession, setIsNewSession] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [isHeartbeatActive, setIsHeartbeatActive] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState(new Date());
  const [history, setHistory] = useState<any[]>([]);

  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const isMobile = !useMediaQuery('(min-width: 768px)');
  const formRef = useRef<HTMLFormElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load the current session from local storage
  const loadCurrentSession = useCallback(() => {
    const storedSessionId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID);
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

  // Load the current research ID from local storage
  const loadCurrentResearchId = useCallback(() => {
    const storedResearchId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID);
    if (storedResearchId) {
      setResearchId(storedResearchId);
    }
  }, []);

  // Load sidebar state from local storage
  const loadSidebarState = useCallback(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE);
    setShowSidebar(savedState !== null ? savedState === 'true' : false);
  }, []);

  // Load the current query from local storage
  const loadCurrentQuery = useCallback(() => {
    const storedQuery = localStorage.getItem(LOCAL_STORAGE_KEYS.RESEARCH_OBJECTIVE);
    if (storedQuery) {
      setQuery(storedQuery);
    }
  }, []);

  // Load the current active tab from local storage
  const loadActiveTab = useCallback(() => {
    const storedActiveTab = localStorage.getItem('deepresearch.active_tab');
    if (storedActiveTab) {
      setActiveTab(storedActiveTab);
    }
  }, []);

  // Load the current onboarding status from local storage
  const loadOnboardingStatus = useCallback(() => {
    const storedOnboardingStatus = localStorage.getItem('deepresearch.onboarding_status');
    if (storedOnboardingStatus) {
      setOnboardingStatus(storedOnboardingStatus);
    }
  }, []);

  // Load the current user model from local storage
  const loadUserModel = useCallback(async () => {
    if (user) {
      try {
        const userModelData = await getUserModelById(user.id);
        setUserModel(userModelData);
      } catch (error) {
        console.error("Error fetching user model:", error);
      }
    }
  }, [user]);

  // Load the current research state from local storage
  const loadResearchState = useCallback(async () => {
    if (sessionId && researchId) {
      try {
        const latestState = await getResearchState(researchId, sessionId);
        if (latestState) {
          setQuery(latestState.query);
        }
      } catch (error) {
        console.error("Error fetching research state:", error);
      }
    }
  }, [sessionId, researchId]);

  // Load the latest session state from local storage
  const loadLatestSessionState = useCallback(async () => {
    if (sessionId) {
      try {
        const latestSessionState = await getLatestSessionState(sessionId);
        if (latestSessionState) {
          setQuery(latestSessionState.query);
        }
      } catch (error) {
        console.error("Error fetching latest session state:", error);
      }
    }
  }, [sessionId]);

  // Load the current session data from local storage
  const loadSessionData = useCallback(async () => {
    if (sessionId) {
      try {
        const sessionData = await getLatestSessionState(sessionId);
        if (sessionData) {
          setQuery(sessionData.query);
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
      }
    }
  }, [sessionId]);

  // Load user onboarding status
  const loadUserOnboardingStatus = useCallback(async () => {
    if (user) {
      try {
        const status = await getUserOnboardingStatus(user.id);
        setOnboardingStatus(status);
      } catch (error) {
        console.error("Error fetching user onboarding status:", error);
      }
    }
  }, [user]);

  // Load user models
  const loadUserModels = useCallback(async () => {
    if (user) {
      try {
        const userModels = await getUserModels();
        if (userModels && userModels.length > 0) {
          setUserModel(userModels[0]);
        }
      } catch (error) {
        console.error("Error fetching user models:", error);
      }
    }
  }, [user]);

  // Load from local storage
  const loadUserModelFromLocalStorage = useCallback(() => {
    const storedUserModel = localStorage.getItem('deepresearch.user_model');
    if (storedUserModel) {
      setUserModel(JSON.parse(storedUserModel));
    }
  }, []);

  // Load from session storage
  const loadUserModelFromSessionStorage = useCallback(() => {
    const storedUserModel = sessionStorage.getItem('deepresearch.user_model');
    if (storedUserModel) {
      setUserModel(JSON.parse(storedUserModel));
    }
  }, []);

  // Load from cache
  const loadUserModelFromCache = useCallback(() => {
    const storedUserModel = localStorage.getItem('deepresearch.user_model_cache');
    if (storedUserModel) {
      setUserModel(JSON.parse(storedUserModel));
    }
  }, []);

  // API fetch for user model
  const loadUserModelFromAPI = useCallback(async () => {
    if (user) {
      try {
        const userModelData = await getUserModelById(user.id);
        setUserModel(userModelData);
      } catch (error) {
        console.error("Error fetching user model:", error);
      }
    }
  }, [user]);

  // Handle history item click
  const handleHistoryItemClick = (item: any) => {
    console.log("History item clicked:", item);
  };

  // Handle select item
  const handleSelectItem = (item: any) => {
    console.log("Selected item:", item);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Fetch research history
  const fetchResearchHistory = useCallback(async () => {
    if (user) {
      try {
        const historyData = await getResearchHistory();
        const groupedHistory = groupResearchHistoryByDate(historyData);
        setHistory(groupedHistory);
      } catch (error) {
        console.error("Error fetching research history:", error);
      }
    }
  }, [user]);

  // Effect to fetch history data when component mounts
  useEffect(() => {
    fetchResearchHistory();
  }, [fetchResearchHistory]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-20 h-full w-64 transform border-r bg-background transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        showSidebar ? "translate-x-0" : "-translate-x-full"
      )}>
        <ResearchHistorySidebar
          isOpen={showSidebar}
          history={history}
          onHistoryItemClick={handleHistoryItemClick}
          onSelectItem={handleSelectItem}
          onToggle={toggleSidebar}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold mb-4">Research Page</h1>
        {/* Add the rest of your UI components here */}
      </div>
    </div>
  );
};

export default ResearchPage;
