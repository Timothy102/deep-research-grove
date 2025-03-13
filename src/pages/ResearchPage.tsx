
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { History, Menu, PanelRight, X, PlusCircle, PanelLeft } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { v4 as uuidv4 } from 'uuid';
import ReasoningPath from '@/components/research/ReasoningPath';
import ResearchForm from '@/components/research/ResearchForm';
import ResearchResults from '@/components/research/ResearchResults';
import ResearchOutput from '@/components/research/ResearchOutput';
import HumanApprovalDialog from '@/components/research/HumanApprovalDialog';
import ProgressIndicator from '@/components/research/ProgressIndicator';
import SourcesList from '@/components/research/SourcesList';
import HistorySidebar from '@/components/research/HistorySidebar';

// Import services
import * as humanLayerService from '@/services/humanLayerService';
import * as researchService from '@/services/researchService';
import * as researchStateService from '@/services/researchStateService';

// Types
interface ResearchSession {
  id: string;
  query: string;
  output?: string;
  reasoning_path?: string[];
  sources?: any[];
  human_approval_requested?: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  created_at?: string;
  updated_at?: string;
}

interface HistoryItem {
  id: string;
  query: string;
  user_model: string;
  use_case: string;
  created_at: string;
}

const ResearchPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);

  // State management
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [reasoningPath, setReasoningPath] = useState<string[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [output, setOutput] = useState<string>('');
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'output'>('split');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const stateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load session data when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
      fetchHistory();
    }
    
    return () => {
      // Cleanup polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (stateIntervalRef.current) {
        clearInterval(stateIntervalRef.current);
      }
    };
  }, [sessionId, user]);

  const loadSession = async (id: string) => {
    try {
      setIsLoadingResults(true);
      const sessionData = await researchService.getResearchSession(id);
      
      if (sessionData) {
        setSession(sessionData);
        
        // Set other state based on session data
        if (sessionData.reasoning_path) {
          setReasoningPath(sessionData.reasoning_path);
        }
        
        if (sessionData.output) {
          setOutput(sessionData.output);
        }
        
        if (sessionData.sources) {
          setSources(sessionData.sources);
        }
        
        if (sessionData.human_approval_requested) {
          setShowApprovalDialog(true);
        }
        
        // If session is in progress, start polling
        if (sessionData.status === 'in_progress') {
          startPolling(id);
        }
      }
    } catch (error) {
      console.error("Error loading session:", error);
      toast.error("Failed to load research session");
    } finally {
      setIsLoadingResults(false);
    }
  };

  const startPolling = (id: string) => {
    if (isPolling) return;
    
    setIsPolling(true);
    
    // Poll for session status updates
    pollingRef.current = setInterval(async () => {
      try {
        const updatedSession = await researchService.getResearchSession(id);
        
        if (updatedSession) {
          setSession(updatedSession);
          
          // Update other state
          if (updatedSession.reasoning_path) {
            setReasoningPath(updatedSession.reasoning_path);
          }
          
          if (updatedSession.output) {
            setOutput(updatedSession.output);
          }
          
          if (updatedSession.sources) {
            setSources(updatedSession.sources);
          }
          
          if (updatedSession.human_approval_requested && !showApprovalDialog) {
            setShowApprovalDialog(true);
          }
          
          // Stop polling if status is no longer in_progress
          if (updatedSession.status !== 'in_progress') {
            stopPolling();
          }
        }
      } catch (error) {
        console.error("Error polling session:", error);
        stopPolling();
      }
    }, 3000);
    
    // Also poll for state updates
    stateIntervalRef.current = setInterval(async () => {
      try {
        const stateUpdates = await researchStateService.getResearchState(id);
        
        if (stateUpdates) {
          // Update reasoning path, sources, etc. based on state updates
          if (stateUpdates.reasoning_path) {
            setReasoningPath(stateUpdates.reasoning_path);
          }
          
          if (stateUpdates.sources) {
            setSources(stateUpdates.sources);
          }
        }
      } catch (error) {
        console.error("Error fetching state updates:", error);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    if (stateIntervalRef.current) {
      clearInterval(stateIntervalRef.current);
      stateIntervalRef.current = null;
    }
    
    setIsPolling(false);
  };

  const handleStartResearch = async (query: string, userModel: string, useCase: string) => {
    try {
      setIsLoadingResults(true);
      
      // Create a new session ID if not provided
      const id = sessionId || uuidv4();
      
      // Initialize session state
      setSession({
        id,
        query,
        status: 'pending',
      });
      
      setReasoningPath([]);
      setSources([]);
      setOutput('');
      
      // Navigate to the research page with session ID if not already there
      if (!sessionId) {
        navigate(`/research/${id}`);
      }
      
      // This is the line with the error - ensure we're passing the options object correctly
      const response = await researchService.startResearch(
        id, 
        query, 
        { userModel, useCase }
      );
      
      if (response) {
        setSession({
          ...response,
          id,
          query,
          status: 'in_progress',
        });
        
        // Start polling for updates
        startPolling(id);
      }
    } catch (error) {
      console.error("Error starting research:", error);
      toast.error("Failed to start research");
      setSession((prev) => prev ? { ...prev, status: 'error' } : null);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleHumanApproval = async (approved: boolean) => {
    if (!session) return;
    
    try {
      setShowApprovalDialog(false);
      
      await humanLayerService.submitHumanApproval(session.id, approved);
      
      // If approved, continue polling for updates
      if (approved) {
        setSession((prev) => prev ? { ...prev, human_approval_requested: false, status: 'in_progress' } : null);
        startPolling(session.id);
      } else {
        // If rejected, mark session as completed
        setSession((prev) => prev ? { ...prev, human_approval_requested: false, status: 'completed' } : null);
      }
    } catch (error) {
      console.error("Error submitting human approval:", error);
      toast.error("Failed to submit approval");
    }
  };

  const fetchHistory = async () => {
    if (!user || isFetchingHistory) return;
    
    try {
      setIsFetchingHistory(true);
      const historyData = await researchService.getResearchHistory();
      setHistory(historyData);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleHistoryItemClick = (item: HistoryItem) => {
    try {
      const userModel = JSON.parse(item.user_model);
      const sessionId = userModel.session_id;
      
      if (sessionId) {
        navigate(`/research/${sessionId}`);
        setHistoryOpen(false);
      }
    } catch (error) {
      console.error("Error parsing history item:", error);
    }
  };

  const handleNewChat = () => {
    setHistoryOpen(false);
    navigate('/research');
  };

  const isSessionInProgress = session?.status === 'in_progress';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between sticky top-0 bg-background z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setHistoryOpen(true)}
            className="h-8 w-8"
          >
            <History className="h-4 w-4" />
          </Button>
          
          <h1 className="text-lg font-medium">Deep Research</h1>
          
          {session?.status && (
            <Badge variant={
              session.status === 'completed' ? 'default' : 
              session.status === 'error' ? 'destructive' : 
              'outline'
            } className="ml-2">
              {session.status === 'in_progress' ? 'Researching' : 
               session.status === 'completed' ? 'Completed' : 
               session.status === 'error' ? 'Error' : 'Pending'}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="text-xs"
          >
            Back to Home
          </Button>
          
          {session && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'split' ? 'output' : 'split')}
              className="text-xs"
            >
              {viewMode === 'split' ? <PanelRight className="h-3.5 w-3.5 mr-1" /> : <PanelLeft className="h-3.5 w-3.5 mr-1" />}
              {viewMode === 'split' ? 'Output Only' : 'Show Details'}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/research')}
            className="text-xs"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1" />
            New Research
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left panel: Form & Research Progress */}
        {(!session || viewMode === 'split') && (
          <div className={`${session ? 'w-1/2 border-r' : 'w-full'} flex flex-col overflow-hidden bg-background/60`}>
            {!session && (
              <div className="flex-1 p-6 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                <ResearchForm onSubmit={handleStartResearch} isLoading={isLoadingResults} />
              </div>
            )}
            
            {session && viewMode === 'split' && (
              <div className="flex-1 flex flex-col overflow-hidden divide-y">
                {/* Progress indicator */}
                {isSessionInProgress && (
                  <div className="p-4 bg-muted/30">
                    <ProgressIndicator isLoading={true} />
                  </div>
                )}
                
                {/* Reasoning Path */}
                <div className="flex-1 overflow-auto">
                  <div className="p-4">
                    <h2 className="text-lg font-medium mb-4">Research Path</h2>
                    <ReasoningPath reasoningPath={reasoningPath} isLoading={isLoadingResults} />
                  </div>
                </div>
                
                {/* Sources Panel */}
                <div className="p-4 h-1/3 overflow-auto">
                  <h2 className="text-lg font-medium mb-4">Sources</h2>
                  <SourcesList sources={sources} />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Right panel: Output */}
        {session && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden bg-background`}>
            <div className="p-6 flex-1 overflow-auto">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-lg font-medium mb-2">Query</h2>
                <p className="text-sm bg-muted p-3 rounded-md mb-6">{session.query}</p>
                
                <h2 className="text-lg font-medium mb-4">Research Output</h2>
                <ResearchOutput output={output} isLoading={isLoadingResults} />
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* History Sidebar */}
      <HistorySidebar 
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        activeSessionId={sessionId}
        onHistoryItemClick={handleHistoryItemClick}
        onNewChat={handleNewChat}
      />
      
      {/* Human Approval Dialog */}
      {showApprovalDialog && session && (
        <HumanApprovalDialog
          isOpen={showApprovalDialog}
          onClose={() => setShowApprovalDialog(false)}
          onApprove={() => handleHumanApproval(true)}
          onReject={() => handleHumanApproval(false)}
          session={session}
          content=""
          query=""
          callId=""
          nodeId=""
          approvalType=""
        />
      )}
    </div>
  );
};

export default ResearchPage;
