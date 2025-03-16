
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, History } from "lucide-react";
import { ResearchHistoryEntry, ResearchHistoryGroup } from '@/services/researchService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ResearchHistorySidebarProps {
  history: ResearchHistoryGroup[];
  onHistoryItemClick: (item: ResearchHistoryEntry) => void;
  className?: string;
}

const ResearchHistorySidebar: React.FC<ResearchHistorySidebarProps> = ({
  history,
  onHistoryItemClick,
  className
}) => {
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
        <div className="px-4 pb-4 space-y-6">
          {history.map((group) => (
            <div key={group.label} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center mb-2">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                {group.label}
              </h4>
              
              <div className="space-y-2">
                {group.items.map((item) => (
                  <Card 
                    key={item.id} 
                    className="cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => onHistoryItemClick(item)}
                  >
                    <CardContent className="p-3">
                      <p className="text-sm font-medium truncate">{item.query}</p>
                      {item.created_at && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(item.created_at), 'h:mm a')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ResearchHistorySidebar;
