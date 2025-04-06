
import React, { useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, Clock, ChevronsLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LOCAL_STORAGE_KEYS, getSessionStorageKey } from "@/lib/constants";
import { toast } from "sonner";
import { supabase, syncSession } from "@/integrations/supabase/client";
import { getLatestSessionState } from "@/services/researchStateService";

interface ResearchHistorySidebarProps {
  isOpen: boolean;
  history: any[];
  onHistoryItemClick: (item: any) => void;
  onSelectItem: (item: any) => void;
  onToggle: () => void;
}

const ResearchHistorySidebar: React.FC<ResearchHistorySidebarProps> = ({ 
  isOpen, 
  history, 
  onHistoryItemClick,
  onSelectItem,
  onToggle
}) => {
  // Add a verification of session when sidebar opens
  useEffect(() => {
    if (isOpen) {
      // Ensure session is valid when sidebar opens
      syncSession().catch(err => {
        console.error("Error syncing session when opening sidebar:", err);
      });
    }
  }, [isOpen]);

  const handleSessionSelect = async (item: any) => {
    try {
      // First, ensure session is synced
      await syncSession();
      
      // Store current session ID to ensure proper state restoration
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, item.session_id);
      
      // Get the latest state for this session from Supabase
      const latestState = await getLatestSessionState(item.session_id);
      
      if (latestState) {
        console.log(`[${new Date().toISOString()}] ✅ Retrieved latest state for session:`, item.session_id);
        
        // Store this state in localStorage for better persistence
        localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, JSON.stringify(latestState));
        
        // Also save session-specific state
        const sessionStateKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, item.session_id);
        localStorage.setItem(sessionStateKey, JSON.stringify(latestState));
      } else {
        console.warn(`[${new Date().toISOString()}] ⚠️ Could not find state for session:`, item.session_id);
      }
      
      // Dispatch a custom event for session restoration
      window.dispatchEvent(new CustomEvent('session-selected', { 
        detail: { 
          sessionId: item.session_id,
          query: item.query,
          isNew: false,
          historyItem: item,
          state: latestState
        }
      }));
      
      // Then handle the click through passed callbacks
      onHistoryItemClick(item);
      onSelectItem(item);
      
      // Close the sidebar
      onToggle();
      
      toast.success("Loading previous research session...");
    } catch (error) {
      console.error("Error selecting history session:", error);
      toast.error("Failed to load session. Please try again.");
    }
  };

  const handleRefreshHistory = () => {
    // Dispatch an event to refresh history
    window.dispatchEvent(new CustomEvent('refresh-history-requested'));
    toast.success("Refreshing research history...");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetContent side="left" className="w-3/4 sm:w-2/3 md:w-1/2 lg:w-2/5 xl:w-1/4 p-0 shadow-xl z-50">
        <SheetHeader className="pl-6 pr-4 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <SheetTitle>Research History</SheetTitle>
            <SheetDescription className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefreshHistory}
                title="Refresh history"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onToggle}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </SheetDescription>
          </div>
        </SheetHeader>
        
        <div className="py-2 overflow-y-auto max-h-[calc(100vh-120px)]">
          {history.length === 0 ? (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              No research history available. Start a new search to see results here.
            </div>
          ) : (
            history.map((group, index) => (
              <div key={index} className="mb-4">
                <h3 className="px-6 py-2 text-sm font-medium">{group.date === 'Today' ? 'Today' : group.date}</h3>
                <ul>
                  {group.items.map((item: any) => (
                    <li 
                      key={item.id} 
                      className="px-6 py-3 hover:bg-secondary cursor-pointer transition-colors duration-200 history-item"
                      onClick={() => handleSessionSelect(item)}
                    >
                      <div className="flex items-center space-x-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{item.query}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ResearchHistorySidebar;
