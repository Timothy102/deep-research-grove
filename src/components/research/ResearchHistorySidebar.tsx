
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock, MessageSquare } from "lucide-react";
import { ResearchHistoryEntry, ResearchHistoryGroup } from '@/services/researchService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ResearchHistorySidebarProps {
  history: ResearchHistoryGroup[];
  onHistoryItemClick: (item: ResearchHistoryEntry) => void;
  className?: string;
  isOpen?: boolean;
}

const ResearchHistorySidebar: React.FC<ResearchHistorySidebarProps> = ({
  history,
  onHistoryItemClick,
  className,
  isOpen = true
}) => {
  const navigate = useNavigate();

  if (!isOpen) {
    return null;
  }

  if (history.length === 0) {
    return (
      <div className={cn("p-4", className)}>
        <h3 className="font-semibold mb-4 flex items-center">
          <History className="h-4 w-4 mr-2" />
          research history
        </h3>
        <p className="text-sm text-muted-foreground">no history yet</p>
      </div>
    );
  }

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
                  
                  return (
                    <div 
                      key={item.id} 
                      className="cursor-pointer hover:bg-secondary/50 transition-colors p-3 rounded-md border border-border"
                      onClick={() => {
                        if (sessionId) {
                          // Navigate directly to the session
                          navigate(`/research/${sessionId}`);
                        } else {
                          // Fallback to the old behavior
                          onHistoryItemClick(item);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium truncate">{item.query}</p>
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
