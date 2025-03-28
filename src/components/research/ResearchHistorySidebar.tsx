
import React, { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock, MessageSquare, Brain, ChevronRight } from "lucide-react";
import { ResearchHistoryEntry, ResearchHistoryGroup } from '@/services/researchService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getSessionResearchStates } from '@/services/researchStateService';
import { Button } from "@/components/ui/button";

interface ResearchHistorySidebarProps {
  history: ResearchHistoryGroup[];
  onHistoryItemClick?: (item: ResearchHistoryEntry) => void;
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onSelectItem?: (item: ResearchHistoryEntry) => void;
}

const ResearchHistorySidebar: React.FC<ResearchHistorySidebarProps> = ({
  history,
  onHistoryItemClick,
  className,
  isOpen = true,
  onToggle,
  onSelectItem
}) => {
  const navigate = useNavigate();
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [sessionStates, setSessionStates] = useState<Record<string, any>>({});

  if (!isOpen) {
    return null;
  }

  const toggleSessionDetails = async (sessionId: string) => {
    // Toggle the expanded state
    setExpandedSessions(prev => {
      const isCurrentlyExpanded = prev[sessionId] || false;
      const newState = { ...prev, [sessionId]: !isCurrentlyExpanded };
      
      // If we're expanding and we don't have session data yet, fetch it
      if (!isCurrentlyExpanded && !sessionStates[sessionId]) {
        fetchSessionDetails(sessionId);
      }
      
      return newState;
    });
  };
  
  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const states = await getSessionResearchStates(sessionId);
      setSessionStates(prev => ({
        ...prev,
        [sessionId]: states
      }));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error fetching session details:`, error);
      // Show an error state
      setSessionStates(prev => ({
        ...prev,
        [sessionId]: { error: true }
      }));
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <h3 className="font-semibold p-4 flex items-center">
        <History className="h-4 w-4 mr-2" />
        research history
      </h3>
      
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          {history.map((group) => (
            <div key={group.date} className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {group.label}
              </h4>
              
              <div className="space-y-2">
                {group.items.map((item) => {
                  // Parse the user_model to get the session_id
                  let sessionId = null;
                  try {
                    if (item.user_model) {
                      const userModel = JSON.parse(item.user_model);
                      sessionId = userModel.session_id;
                    }
                  } catch (e) {
                    console.error("Error parsing user model:", e);
                  }
                  
                  const isExpanded = sessionId ? expandedSessions[sessionId] || false : false;
                  const sessionData = sessionId ? sessionStates[sessionId] : null;
                  
                  return (
                    <Collapsible 
                      key={item.id} 
                      open={isExpanded} 
                      onOpenChange={() => sessionId && toggleSessionDetails(sessionId)}
                      className="border border-border rounded-md overflow-hidden"
                    >
                      <CollapsibleTrigger asChild>
                        <div 
                          className="cursor-pointer hover:bg-secondary/50 transition-colors p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <ChevronRight className={cn(
                                "h-4 w-4 transition-transform",
                                isExpanded && "transform rotate-90"
                              )} />
                              <p className="text-sm font-medium truncate">{item.query}</p>
                            </div>
                            {sessionId && (
                              <MessageSquare className="h-3 w-3 ml-2 flex-shrink-0 text-primary/70" />
                            )}
                          </div>
                          {item.created_at && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(item.created_at), 'h:mm a')}
                            </p>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      
                      {sessionId && (
                        <CollapsibleContent className="p-3 pt-0 border-t border-border bg-muted/20">
                          {sessionData ? (
                            sessionData.error ? (
                              <div className="text-sm text-muted-foreground py-2">
                                Error loading session details
                              </div>
                            ) : Array.isArray(sessionData) && sessionData.length > 0 ? (
                              <div className="space-y-2 pt-2">
                                {sessionData.map((state, idx) => (
                                  <div 
                                    key={state.id || idx} 
                                    className="text-xs border border-border rounded-sm p-2 bg-background"
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <Badge 
                                        variant={
                                          state.status === 'completed' ? "default" : 
                                          state.status === 'error' ? "destructive" : 
                                          "secondary"
                                        } 
                                        className="text-[10px] h-4"
                                      >
                                        {state.status}
                                      </Badge>
                                      {state.created_at && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {format(new Date(state.created_at), 'h:mm:ss a')}
                                        </span>
                                      )}
                                    </div>
                                    
                                    {state.reasoning_path && state.reasoning_path.length > 0 && (
                                      <div className="mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                                          <Brain className="h-3 w-3" />
                                          <span>Reasoning steps: {state.reasoning_path.length}</span>
                                        </div>
                                        <div className="text-[10px] line-clamp-2 text-muted-foreground">
                                          {state.reasoning_path[state.reasoning_path.length - 1]}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground py-2">
                                No research states found
                              </div>
                            )
                          ) : (
                            <div className="flex justify-center py-2">
                              <Clock className="h-3 w-3 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 h-8 text-xs"
                            onClick={() => navigate(`/research/${sessionId}`)}
                          >
                            Open full session
                          </Button>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ResearchHistorySidebar;
