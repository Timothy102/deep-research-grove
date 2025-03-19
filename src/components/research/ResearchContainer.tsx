
import { useState, useEffect } from "react";
import { ResearchForm } from "./ResearchForm";
import { ReasoningPath } from "./ReasoningPath";
import { ResearchOutput } from "./ResearchOutput";
import { SourcesList } from "./SourcesList";
import { NodeExplorationGraph } from "./NodeExplorationGraph";
import { ResearchResults } from "./ResearchResults";
import { ResearchHistorySidebar } from "./ResearchHistorySidebar";
import { ProgressIndicator } from "./ProgressIndicator";
import { HumanApprovalDialog } from "./HumanApprovalDialog";
import { 
  researchService, 
  ResearchSessionState, 
  ResearchSession,
  ResearchSessionEvent,
} from "@/services/researchService";

export const ResearchContainer = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | undefined>();
  const [events, setEvents] = useState<string[]>([]);
  const [researchEvents, setResearchEvents] = useState<ResearchSessionEvent[]>([]);
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [showHumanDialog, setShowHumanDialog] = useState(false);
  const [showFullResults, setShowFullResults] = useState(false);

  const handleResearchSubmit = async (query: string, includeHuman: boolean) => {
    setIsLoading(true);
    setShowFullResults(false);
    setCurrentStage("Initializing research");
    setEvents([]);
    setResearchEvents([]);
    
    try {
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

  return (
    <div className="relative flex h-full">
      {showSidebar && (
        <div className="w-80 border-r border-border">
          <ResearchHistorySidebar onSelectSession={() => {}} />
        </div>
      )}
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b">
          <ResearchForm 
            onSubmit={handleResearchSubmit} 
            toggleSidebar={() => setShowSidebar(!showSidebar)}
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
                <ResearchResults 
                  session={session} 
                  onBack={() => setShowFullResults(false)} 
                />
              ) : (
                <div className="grid grid-cols-4 gap-4 p-4 h-full">
                  <div className="col-span-1 border rounded-md p-4 overflow-auto">
                    <h3 className="font-medium text-lg mb-4">Research Path</h3>
                    <ReasoningPath session={session} />
                  </div>
                  
                  <div className="col-span-1 border rounded-md p-4 overflow-auto">
                    <h3 className="font-medium text-lg mb-4">Sources</h3>
                    <SourcesList session={session} />
                  </div>
                  
                  <div className="col-span-1 border rounded-md p-4 overflow-auto">
                    <h3 className="font-medium text-lg mb-4">Results</h3>
                    <ResearchOutput 
                      session={session} 
                      onShowFullResults={() => setShowFullResults(true)} 
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
        open={showHumanDialog}
        onOpenChange={setShowHumanDialog}
        onApprove={() => handleHumanApproval(true)}
        onReject={() => handleHumanApproval(false)}
      />
    </div>
  );
};
