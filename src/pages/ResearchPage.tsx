
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';
import ResearchForm from '@/components/research/ResearchForm';
import ResearchOutput from '@/components/research/ResearchOutput';
import ReasoningPath from '@/components/research/ReasoningPath';
import SourcesList from '@/components/research/SourcesList';
import HistorySidebar from '@/components/research/HistorySidebar';
import { ProgressIndicator } from '@/components/research/ProgressIndicator';
import HumanApprovalDialog from '@/components/research/HumanApprovalDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as researchService from '@/services/researchService';
import * as researchStateService from '@/services/researchStateService';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';
import { startResearchWithCorrectParams, continueResearchAfterApproval } from '@/services/researchUtils';

interface ResearchData {
  query: string;
  reasoning: string[];
  sources: { title: string; url: string }[];
  isLoading: boolean;
  progress: number;
  requireHumanApproval: boolean;
  maxSteps: number;
}

// Interface to match the expected history item structure
interface HistoryItem {
  id: string;
  query: string;
  created_at: string;
  user_model: string;
  use_case: string;
}

const ResearchPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [researchData, setResearchData] = useState<ResearchData>({
    query: '',
    reasoning: [],
    sources: [],
    isLoading: false,
    progress: 0,
    requireHumanApproval: false,
    maxSteps: 25,
  });
  const [activeTab, setActiveTab] = useState<'query' | 'results' | 'history'>('query');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalQuery, setApprovalQuery] = useState('');
  // Initialize with empty array of the correct type
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isMobile] = useIsMobile();
  const [maxSteps, setMaxSteps] = useState<number>(25);
  const reasoningPathRef = useRef<HTMLDivElement>(null);

  const { query, reasoning, sources, isLoading, progress, requireHumanApproval } = researchData;

  useEffect(() => {
    const storedHistory = localStorage.getItem('researchHistory');
    if (storedHistory) {
      try {
        // Parse stored history and ensure it has the correct structure
        const parsedHistory = JSON.parse(storedHistory);
        // If the history is just an array of strings, convert to proper format
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
          if (typeof parsedHistory[0] === 'string') {
            // Convert strings to HistoryItem objects
            const formattedHistory: HistoryItem[] = parsedHistory.map((query, index) => ({
              id: `history-${index}`,
              query,
              created_at: new Date().toISOString(),
              user_model: '',
              use_case: ''
            }));
            setHistory(formattedHistory);
          } else {
            // Already in the correct format
            setHistory(parsedHistory);
          }
        }
      } catch (error) {
        console.error('Error parsing history:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('researchHistory', JSON.stringify(history));
  }, [history]);

  const handleHistoryClick = (item: HistoryItem) => {
    setResearchData(prev => ({ ...prev, query: item.query }));
    setActiveTab('query');
  };

  const toggleHistorySidebar = () => {
    setIsHistoryOpen(!isHistoryOpen);
  };

  const scrollToBottom = () => {
    if (reasoningPathRef.current) {
      reasoningPathRef.current.scrollTop = reasoningPathRef.current.scrollHeight;
    }
  };

  const handleProgressUpdate = useCallback((progress: number, reasoningStep: string | null, newSources: { title: string; url: string }[] | null) => {
    setResearchData(prev => {
      const updatedReasoning = reasoningStep ? [...prev.reasoning, reasoningStep] : prev.reasoning;
      const updatedSources = newSources ? [...prev.sources, ...newSources] : prev.sources;
      
      return {
        ...prev,
        progress: progress,
        reasoning: updatedReasoning,
        sources: updatedSources,
      };
    });
    scrollToBottom();
  }, []);

  const handleApprovalResponse = useCallback(async (approved: boolean) => {
    setIsApprovalDialogOpen(false);
    setResearchData(prev => ({ ...prev, isLoading: true }));
  
    try {
      if (sessionId) {
        // Use our utility function for continuing research
        const response = await continueResearchAfterApproval(sessionId, approved);
        
        if (response) {
          setResearchData(prev => ({
            ...prev,
            reasoning: [...prev.reasoning, ...response.reasoning],
            sources: [...prev.sources, ...response.sources],
            isLoading: false
          }));
        }
      }
    } catch (error) {
      console.error('Approval response error:', error);
      toast.error('An error occurred while processing the approval response.');
      setResearchData(prev => ({ ...prev, isLoading: false }));
    }
  }, [sessionId]);

  const handleRequireApprovalChange = (value: boolean) => {
    setResearchData(prev => ({ ...prev, requireHumanApproval: value }));
  };

  const handleMaxStepsChange = (value: number) => {
    setMaxSteps(value);
    setResearchData(prev => ({ ...prev, maxSteps: value }));
  };

  const handleStartResearch = useCallback(async (query: string) => {
    try {
      setResearchData(prev => ({ ...prev, isLoading: true }));
      setActiveTab('results');
      
      const id = sessionId || uuidv4();
      if (!sessionId) {
        navigate(`/research/${id}`, { replace: true });
      }
      
      const options = {
        userId: user?.id,
        requireHumanApproval: requireHumanApproval,
        maxSteps: parseInt(maxSteps.toString()),
        onProgress: handleProgressUpdate,
      };
      
      const response = await startResearchWithCorrectParams(id, query, options, sessionId);
      
      if (response) {
        // Create a new history item
        const newHistoryItem: HistoryItem = {
          id: uuidv4(),
          query,
          created_at: new Date().toISOString(),
          user_model: '',
          use_case: ''
        };
        
        // Since response may not have reasoning/sources/progress directly (ResearchSession type),
        // use placeholder values or extract what's available
        setResearchData(prev => ({
          ...prev,
          query: query,
          // Use empty arrays if these properties don't exist
          reasoning: response.reasoning_path || [],
          sources: [],
          // Use 100 as a placeholder for completion
          progress: 100,
          isLoading: false
        }));
        
        // Update history with the new item
        setHistory(prevHistory => [newHistoryItem, ...prevHistory]);
      }
    } catch (error) {
      console.error('Research error:', error);
      toast.error('An error occurred during research');
      setResearchData(prev => ({ ...prev, isLoading: false }));
    }
  }, [sessionId, navigate, user?.id, requireHumanApproval, maxSteps, handleProgressUpdate]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-6 flex items-center justify-between backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center space-x-2">
          <a href="/" className="no-underline flex items-center">
            <img 
              src="/arcadia.png" 
              alt="Deep Research" 
              className="h-8 w-auto mr-2" 
            />
            <span className="text-lg font-medium">DeepResearch</span>
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => navigate("/")} 
            variant="outline"
            className="text-sm"
          >
            Landing Page
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto flex flex-col flex-1 h-full">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'query' | 'results' | 'history')} className="flex flex-col flex-1">
          <div className="border-b">
            <TabsList className="mx-4">
              <TabsTrigger value="query">Query</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex flex-1">
            <div className={`flex-1 p-4 ${isMobile ? '' : 'border-r'}`}>
              <TabsContent value="query" className="outline-none">
                <ResearchForm
                  query={query}
                  isLoading={isLoading}
                  requireHumanApproval={requireHumanApproval}
                  maxSteps={maxSteps}
                  onRequireApprovalChange={handleRequireApprovalChange}
                  onMaxStepsChange={handleMaxStepsChange}
                  onSubmit={handleStartResearch}
                />
              </TabsContent>

              <TabsContent value="results" className="flex flex-col h-full outline-none">
                {isLoading && <ProgressIndicator isLoading={isLoading} currentStage={`Researching (${progress}%)`} />}
                <ResearchOutput 
                  query={query} 
                  isLoading={isLoading} 
                  output="" 
                  reasoningPathRef={reasoningPathRef} 
                />
              </TabsContent>

              <TabsContent value="history" className="outline-none">
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">Research History</h3>
                  <ul>
                    {history.map((item) => (
                      <li key={item.id} className="py-2 border-b">
                        <button onClick={() => handleHistoryClick(item)} className="hover:underline">
                          {item.query}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            </div>

            {!isMobile && (
              <div className="w-64 p-4 border-l">
                <HistorySidebar
                  history={history}
                  onHistoryClick={handleHistoryClick}
                  isOpen={isHistoryOpen}
                  onToggle={toggleHistorySidebar}
                />
              </div>
            )}
          </div>
        </Tabs>

        <HumanApprovalDialog
          isOpen={isApprovalDialogOpen}
          query={approvalQuery}
          content=""
          callId=""
          nodeId=""
          approvalType=""
          onApprove={() => handleApprovalResponse(true)}
          onReject={() => handleApprovalResponse(false)}
          onClose={() => setIsApprovalDialogOpen(false)}
        />
      </main>
    </div>
  );
};

export default ResearchPage;
