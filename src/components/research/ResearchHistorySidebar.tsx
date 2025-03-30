import React, { useState, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock, MessageSquare, Brain, ChevronRight, Loader2 } from "lucide-react";
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
    <div className={cn("flex flex-col h-full bg-white", className)}>
      <h3 className="font-semibold p-4 flex items-center border-b">
        <History className="h-4 w-4 mr-2" />
        research history
      </h3>
      
      <ScrollArea className="flex-1">
        <div className="px-2 pb-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No research history yet
            </div>
          ) : (
            history.map((group) => (
              <div key={group.date} className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground px-2 py-1 mt-2">
                  {group.label}
                </h4>
                
                <div className="space-y-0.5">
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
                    
                    return (
                      <div 
                        key={item.id} 
                        className="cursor-pointer hover:bg-slate-50 px-2 py-2 rounded-md"
                        onClick={() => onSelectItem && onSelectItem(item)}
                      >
                        <div className="flex items-start">
                          <ChevronRight className="h-4 w-4 mr-1 mt-0.5 text-slate-400" />
                          <div className="flex-1">
                            <p className="text-sm truncate">{item.query}</p>
                            {item.created_at && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(new Date(item.created_at), 'h:mm a')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ResearchHistorySidebar;
