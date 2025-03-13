import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';
import { ResearchForm } from '@/components/research/ResearchForm';
import { ResearchOutput } from '@/components/research/ResearchOutput';
import { ReasoningPath } from '@/components/research/ReasoningPath';
import { SourcesList } from '@/components/research/SourcesList';
import { HistorySidebar } from '@/components/research/HistorySidebar';
import { ProgressIndicator } from '@/components/research/ProgressIndicator';
import { HumanApprovalDialog } from '@/components/research/HumanApprovalDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { researchService } from '@/services/researchService';
import { researchStateService, type ResearchOptions } from '@/services/researchStateService';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';
import { startResearchWithCorrectParams } from '@/services/researchUtils';

interface ResearchData {
  query: string;
  reasoning: string[];
  sources: { title: string; url: string }[];
  isLoading: boolean;
  progress: number;
  requireHumanApproval: boolean;
  maxSteps: number;
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
  const [history, setHistory] = useState<string[]>([]);
  const [isMobile] = useMobile();
	const [maxSteps, setMaxSteps] = useState<number>(25);
  const reasoningPathRef = useRef<HTMLDivElement>(null);

  const { query, reasoning, sources, isLoading, progress, requireHumanApproval } = researchData;

  useEffect(() => {
    const storedHistory = localStorage.getItem('researchHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('researchHistory', JSON.stringify(history));
  }, [history]);

  const handleHistoryClick = (query: string) => {
    setResearchData(prev => ({ ...prev, query: query }));
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
    setIsLoading(true);
  
    try {
      const continueResearch = async () => {
        if (sessionId) {
          const response = await researchService.continueResearch(sessionId, approved);
          if (response) {
            setResearchData(prev => ({
              ...prev,
              reasoning: [...prev.reasoning, ...response.reasoning],
              sources: [...prev.sources, ...response.sources],
            }));
          }
        }
      };
  
      await continueResearch();
    } catch (error) {
      console.error('Approval response error:', error);
      toast.error('An error occurred while processing the approval response.');
    } finally {
      setIsLoading(false);
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
      setIsLoading(true);
      setActiveTab('results');
      
      const id = sessionId || uuidv4();
      if (!sessionId) {
        navigate(`/research/${id}`, { replace: true });
      }
      
      const options: ResearchOptions = {
        userId: user?.id,
        requireHumanApproval: requireHumanApproval,
        maxSteps: parseInt(maxSteps.toString()),
        onProgress: handleProgressUpdate,
      };
      
      const response = await startResearchWithCorrectParams(id, query, options, sessionId);
      
      if (response) {
        setResearchData(prev => ({
          ...prev,
          query: query,
          reasoning: response.reasoning,
          sources: response.sources,
          progress: response.progress,
        }));
        setHistory(prevHistory => [...new Set([query, ...prevHistory])]);
      }
    } catch (error) {
      console.error('Research error:', error);
      toast.error('An error occurred during research');
    } finally {
      setIsLoading(false);
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
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
                  initialQuery={query}
                  isLoading={isLoading}
                  requireHumanApproval={requireHumanApproval}
                  maxSteps={maxSteps}
                  onRequireApprovalChange={handleRequireApprovalChange}
									onMaxStepsChange={handleMaxStepsChange}
                  onSubmit={handleStartResearch}
                />
              </TabsContent>

              <TabsContent value="results" className="flex flex-col h-full outline-none">
                {isLoading && <ProgressIndicator progress={progress} />}
                <ResearchOutput query={query} reasoning={reasoning} sources={sources} reasoningPathRef={reasoningPathRef} />
              </TabsContent>

              <TabsContent value="history" className="outline-none">
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">Research History</h3>
                  <ul>
                    {history.map((item, index) => (
                      <li key={index} className="py-2 border-b">
                        <button onClick={() => handleHistoryClick(item)} className="hover:underline">
                          {item}
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
          onApprove={() => handleApprovalResponse(true)}
          onReject={() => handleApprovalResponse(false)}
          onClose={() => setIsApprovalDialogOpen(false)}
        />
      </main>
    </div>
  );
};

export default ResearchPage;
