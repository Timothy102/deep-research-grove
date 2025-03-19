import { useState, useEffect } from "react";
import { ResearchForm } from "./ResearchForm";
import ReasoningPath from "./ReasoningPath";
import ResearchOutput from "./ResearchOutput";
import SourcesList from "./SourcesList";
import { NodeExplorationGraph } from "./NodeExplorationGraph";
import ResearchResults from "./ResearchResults"; // Changed from named import to default import
import ResearchHistorySidebar from "./ResearchHistorySidebar";
import { ProgressIndicator } from "./ProgressIndicator";
import HumanApprovalDialog from "./HumanApprovalDialog";
import { Button } from "@/components/ui/button";

// Define the interface for research session state and events
interface ResearchSessionState {
  stage?: string;
  humanApprovalNeeded?: boolean;
}

interface ResearchSessionEvent {
  event: string;
  data: {
    message?: string;
    [key: string]: any;
  };
}

interface ResearchSession {
  id: string;
  query: string;
  // Add other properties as needed
}

// Mock research service until actual implementation
const researchService = {
  createResearchSession: async (
    query: string,
    includeHuman: boolean,
    callback: (state: ResearchSessionState, event?: ResearchSessionEvent) => void
  ): Promise<ResearchSession> => {
    // Mock implementation
    const session = { id: `session-${Date.now()}`, query };
    // Simulate some activity
    setTimeout(() => {
      callback({ stage: "Searching for information" }, { 
        event: 'log', 
        data: { message: "Initialized research session" } 
      });
    }, 1000);
    return session;
  },
  updateHumanApproval: async (sessionId: string, approved: boolean): Promise<void> => {
    // Mock implementation
    console.log(`Human approval for session ${sessionId}: ${approved}`);
  }
};

export const ResearchContainer = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | undefined>();
  const [events, setEvents] = useState<string[]>([]);
  const [researchEvents, setResearchEvents] = useState<ResearchSessionEvent[]>([]);
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [showHumanDialog, setShowHumanDialog] = useState(false);
  const [showFullResults, setShowFullResults] = useState(false);

  // Updated to match ResearchForm props signature
  const handleResearchSubmit = async (
    query: string, 
    userModel: string, 
    useCase: string, 
    selectedModelId?: string, 
    currentUnderstanding?: string
  ) => {
    setIsLoading(true);
    setShowFullResults(false);
    setCurrentStage("Initializing research");
    setEvents([]);
    setResearchEvents([]);
    
    try {
      // We'll ignore the additional parameters for now or adapt them as needed
      const includeHuman = userModel.includes("human") || false; // Simple adaptation
      
      const session = await researchService.createResearchSession(
        query,
        includeHuman,
        (state: ResearchSessionState, event?: ResearchSessionEvent) => {
          setCurrentStage(state.stage);
          if (state.humanApprovalNeeded) {
            setShowHumanDialog(true);
          }
          if (event) {
            if (event.event === 'log') {
              setEvents(prev => [...prev, event.data.message]);
            } else {
              setResearchEvents(prev => [...prev, event]);
            }
          }
        }
      );
      
      setSession(session);
    } catch (error) {
      console.error("Research error:", error);
      setEvents(prev => [...prev, `Error: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHumanApproval = async (approved: boolean) => {
    setShowHumanDialog(false);
    try {
      if (session) {
        await researchService.updateHumanApproval(session.id, approved);
      }
    } catch (error) {
      console.error("Human approval error:", error);
    }
  };

  // Create a mock result object that matches the ResearchResult type
  const mockResult = session ? {
    query: session.query,
    answer: "This is a placeholder for the research results.",
    sources: [],
    reasoning_path: [],
    confidence: 0.85,
    session_id: session.id
  } : null;

  return (
    <div className="relative flex h-full">
      {showSidebar && (
        <div className="w-80 border-r border-border">
          <ResearchHistorySidebar 
            history={[]} 
            onHistoryItemClick={() => {}} 
          />
        </div>
      )}
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b">
          <ResearchForm 
            onSubmit={handleResearchSubmit} 
            isLoading={isLoading}
          />
        </div>
        
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="p-4">
              <ProgressIndicator 
                isLoading={isLoading} 
                currentStage={currentStage} 
                events={events} 
              />
            </div>
          )}
          
          {session && !isLoading && (
            <>
              {showFullResults ? (
                <div className="p-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowFullResults(false)}
                    className="mb-4"
                  >
                    Back to research overview
                  </Button>
                  <ResearchResults result={mockResult} />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4 p-4 h-full">
                  <div className="col-span-1 border rounded-md p-4 overflow-auto">
                    <h3 className="font-medium text-lg mb-4">Research Path</h3>
                    <ReasoningPath 
                      reasoningPath={[]} 
                      sources={[]} 
                      findings={[]} 
                    />
                  </div>
                  
                  <div className="col-span-1 border rounded-md p-4 overflow-auto">
                    <h3 className="font-medium text-lg mb-4">Sources</h3>
                    <SourcesList 
                      sources={[]} 
                      findings={[]}
                    />
                  </div>
                  
                  <div className="col-span-1 border rounded-md p-4 overflow-auto">
                    <h3 className="font-medium text-lg mb-4">Results</h3>
                    <ResearchOutput 
                      output=""
                      isLoading={false}
                    />
                  </div>
                  
                  <div className="col-span-1 border rounded-md p-4 overflow-auto">
                    <h3 className="font-medium text-lg mb-4">Node Exploration</h3>
                    <NodeExplorationGraph researchEvents={researchEvents} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <HumanApprovalDialog
        isOpen={showHumanDialog}
        onClose={() => setShowHumanDialog(false)}
        content=""
        query=""
        callId=""
        nodeId=""
        approvalType="synthesis"
        onApprove={() => handleHumanApproval(true)}
        onReject={() => handleHumanApproval(false)}
      />
    </div>
  );
};
