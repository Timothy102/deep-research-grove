
import React, { useState, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock, MessageSquare, Brain, ChevronRight, Loader2, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { ResearchHistoryEntry, ResearchHistoryGroup } from '@/services/researchService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getSessionResearchStates } from '@/services/researchStateService';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';

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
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Set up realtime subscription for research_states table updates
    const channel = supabase
      .channel('research_states_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'research_states' }, 
        (payload) => {
          // When we get an update to research_states, refresh the affected session
          if (payload.new) {
            const sessionId = (payload.new as { session_id?: string }).session_id;
            if (sessionId && expandedSessions[sessionId]) {
              fetchSessionDetails(sessionId);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expandedSessions]);

  if (!isOpen) {
    return null;
  }

  const toggleSessionDetails = async (sessionId: string) => {
    // Toggle the expanded state
    setExpandedSessions(prev => {
      const isCurrentlyExpanded = prev[sessionId] || false;
      const newState = { ...prev, [sessionId]: !isCurrentlyExpanded };
      
      // If we're expanding and we don't have session data yet, fetch it
      if (!isCurrentlyExpanded && (!sessionStates[sessionId] || sessionStates[sessionId].length === 0)) {
        fetchSessionDetails(sessionId);
      }
      
      return newState;
    });
  };
  
  const fetchSessionDetails = async (sessionId: string) => {
    try {
      setLoading(prev => ({ ...prev, [sessionId]: true }));
      
      console.log(`[${new Date().toISOString()}] 🔍 Fetching session details for:`, sessionId);
      const states = await getSessionResearchStates(sessionId);
      
      console.log(`[${new Date().toISOString()}] ✅ Retrieved ${states.length} states for session:`, sessionId);
      
      // Cache the session states
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
    } finally {
      setLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'awaiting_human_input': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <>
      {/* Add toggle button when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-1/2 -translate-y-1/2 bg-background border border-l-0 border-border rounded-r-md p-1.5 hover:bg-accent transition-colors z-30"
          aria-label="Open history sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-72 bg-background border-r transform transition-transform duration-200 ease-in-out",
          !isOpen && "-translate-x-full",
          className
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold flex items-center">
              <History className="h-4 w-4 mr-2" />
              research history
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-4 pb-4">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No research history yet
                </div>
              ) : (
                history.map((group) => (
                  <div key={group.date} className="mb-6">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {group.label}
                    </h4>
                    
                    <div className="space-y-2 mt-2">
                      {group.items.map((item) => {
                        // Parse the user_model to get the session_id
                        let sessionId = null;
                        try {
                          if (item.user_model && typeof item.user_model === 'string') {
                            const userModel = JSON.parse(item.user_model);
                            sessionId = userModel?.session_id || null;
                          }
                        } catch (e) {
                          console.error("Error parsing user model:", e);
                        }
                        
                        const isExpanded = sessionId ? expandedSessions[sessionId] || false : false;
                        const sessionData = sessionId ? sessionStates[sessionId] : null;
                        const isLoading = sessionId ? loading[sessionId] : false;
                        
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
                                {isLoading ? (
                                  <div className="flex justify-center py-4">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  </div>
                                ) : sessionData ? (
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
                                                state.status === 'awaiting_human_input' ? "outline" :
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
                                              <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground mb-1">
                                                <div className="flex items-center gap-1">
                                                  <Brain className="h-3 w-3" />
                                                  <span>Reasoning steps: {state.reasoning_path.length}</span>
                                                </div>
                                                
                                                {state.sources && state.sources.length > 0 && (
                                                  <span className="text-[10px]">
                                                    {state.sources.length} source{state.sources.length !== 1 ? 's' : ''}
                                                  </span>
                                                )}
                                              </div>
                                              
                                              <div className="text-[10px] max-h-[60px] overflow-y-auto pb-1 space-y-1">
                                                {state.reasoning_path.slice(-3).map((step, i) => (
                                                  <div key={i} className="line-clamp-1 text-muted-foreground">
                                                    • {step}
                                                  </div>
                                                ))}
                                                {state.reasoning_path.length > 3 && (
                                                  <div className="text-[9px] text-muted-foreground italic">
                                                    + {state.reasoning_path.length - 3} more steps
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {state.answer && state.answer.length > 0 && (
                                            <div className="mt-2 pt-1 border-t border-border text-[10px]">
                                              <div className="font-medium text-[10px] mb-0.5">Answer:</div>
                                              <div className="line-clamp-2 text-muted-foreground">
                                                {state.answer}
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
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      
      {/* Add overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden" 
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default ResearchHistorySidebar;
