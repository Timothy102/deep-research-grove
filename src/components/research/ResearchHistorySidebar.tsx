
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
      
      console.log(`[${new Date().toISOString()}] 🔍 Loading complete research state for session:`, item.session_id, "with query:", item.query);
      
      // Clear any old cached state first
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_STATE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE);
      
      // Get the FULL latest state for this session from Supabase
      const latestState = await getLatestSessionState(item.session_id);
      
      if (latestState) {
        console.log(`[${new Date().toISOString()}] ✅ Retrieved complete state for session:`, item.session_id);
        console.log("Query from state:", latestState.query);
        console.log("Answer first 100 chars:", latestState.answer?.substring(0, 100));
        
        // Validate that the state query matches the history item's query
        if (latestState.query !== item.query) {
          console.warn(`[${new Date().toISOString()}] ⚠️ Query mismatch between state (${latestState.query}) and history item (${item.query})`);
        }
        
        // Build a comprehensive answer object with all state data
        const completeAnswer = {
          query: latestState.query || item.query, // Fallback to history item query if needed
          answer: latestState.answer || "",
          sources: latestState.sources || [],
          reasoning_path: latestState.reasoning_path || [],
          findings: latestState.findings || [],
          syntheses: latestState.user_model || {},
          confidence: latestState.completed_nodes ? (latestState.completed_nodes / 10) : 0.8,
          session_id: item.session_id,
          research_id: latestState.research_id
        };
        
        // Store the complete state and answer in local storage
        localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, JSON.stringify(latestState));
        localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(completeAnswer));
        
        // Also store session-specific caches
        const sessionStateKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, item.session_id);
        localStorage.setItem(sessionStateKey, JSON.stringify(latestState));
        
        const sessionAnswerKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, item.session_id);
        localStorage.setItem(sessionAnswerKey, JSON.stringify(completeAnswer));
        
        // Also cache individual data for better resilience
        if (latestState.sources && latestState.sources.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(latestState.sources));
          const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, item.session_id);
          localStorage.setItem(sessionSourcesKey, JSON.stringify(latestState.sources));
        }
        
        if (latestState.reasoning_path && latestState.reasoning_path.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(latestState.reasoning_path));
          const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, item.session_id);
          localStorage.setItem(sessionPathKey, JSON.stringify(latestState.reasoning_path));
        }
        
        if (latestState.findings && latestState.findings.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(latestState.findings));
          const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, item.session_id);
          localStorage.setItem(sessionFindingsKey, JSON.stringify(latestState.findings));
        }
      } else {
        console.warn(`[${new Date().toISOString()}] ⚠️ Could not find state for session:`, item.session_id);
        
        // Fallback to minimal data from history item
        const fallbackAnswer = {
          query: item.query,
          answer: "Loading research data...",
          sources: [],
          reasoning_path: [],
          findings: [],
          syntheses: {},
          confidence: 0.5,
          session_id: item.session_id
        };
        
        localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(fallbackAnswer));
        const sessionAnswerKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, item.session_id);
        localStorage.setItem(sessionAnswerKey, JSON.stringify(fallbackAnswer));
        
        toast.error("Could not load complete session data. Trying with partial data.");
      }
      
      // Dispatch a custom event for session restoration
      window.dispatchEvent(new CustomEvent('session-selected', { 
        detail: { 
          sessionId: item.session_id,
          query: item.query, // Always use the query from the history item
          isNew: false,
          historyItem: item,
          timestamp: new Date().toISOString()
        }
      }));
      
      // Then handle the click through passed callbacks
      onHistoryItemClick(item);
      onSelectItem(item);
      
      // Close the sidebar
      onToggle();
      
      toast.success(`Loading "${item.query.substring(0, 30)}${item.query.length > 30 ? '...' : ''}"`);
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
