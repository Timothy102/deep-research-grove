
import React, { useEffect, useState } from 'react';
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
import { LOCAL_STORAGE_KEYS, getSessionStorageKey, saveSessionData, getSessionData } from "@/lib/constants";
import { toast } from "sonner";
import { supabase, syncSession } from "@/integrations/supabase/client";
import { getLatestSessionState, ResearchState } from "@/services/researchStateService";

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
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});

  // Add a verification of session when sidebar opens
  useEffect(() => {
    if (isOpen) {
      // Ensure session is valid when sidebar opens
      syncSession().catch(err => {
        console.error("Error syncing session when opening sidebar:", err);
      });
    }
  }, [isOpen]);

  const fetchSessionData = async (sessionId: string) => {
    try {
      // Directly query the database for this specific session
      const { data, error } = await supabase
        .from('research_states')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error(`[${new Date().toISOString()}] Error fetching session ${sessionId}:`, error);
        return null;
      }
      
      if (data && data.length > 0) {
        console.log(`[${new Date().toISOString()}] ✅ Retrieved session data for ${sessionId} directly from DB`);
        return data[0];
      }
      
      console.log(`[${new Date().toISOString()}] ⚠️ No data found for session ${sessionId} in database`);
      return null;
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Failed to fetch session ${sessionId}:`, err);
      return null;
    }
  };

  const handleSessionSelect = async (item: any) => {
    try {
      setIsLoading(prev => ({ ...prev, [item.session_id]: true }));
      
      // First, ensure session is synced
      await syncSession();
      
      // Store current session ID to ensure proper state restoration
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, item.session_id);
      
      // Fetch fresh data directly from database
      const remoteData = await fetchSessionData(item.session_id);
      
      // Get the latest state for this session from Supabase
      const latestState = await getLatestSessionState(item.session_id);
      
      // Also try to get any locally cached session data
      const cachedSessionData = getSessionData(item.session_id);
      
      let mergedState: ResearchState | null = latestState;
      
      // If we have both remote and local data, merge them to get the most complete state
      if (remoteData || (latestState && cachedSessionData)) {
        console.log(`[${new Date().toISOString()}] 🔄 Merging remote and local session data for ${item.session_id}`);
        
        // Start with the most recent state from either remote data or latest state
        const baseState = remoteData || latestState;
        
        // Parse arrays from JSON if needed
        const remoteSources = remoteData?.sources || [];
        const remoteReasoningPath = remoteData?.reasoning_path || [];
        const remoteFindings = remoteData?.findings || [];
        
        // Make sure status is one of the allowed values
        const status = baseState?.status || 'in_progress';
        const validStatus = ['in_progress', 'completed', 'error'].includes(status) 
          ? status as 'in_progress' | 'completed' | 'error'
          : 'in_progress';
        
        // Merge the data, prioritizing remote data but ensuring arrays are properly merged
        if (baseState) {
          mergedState = {
            ...baseState,
            status: validStatus,
            // For arrays, take the one with more items
            sources: Array.isArray(remoteSources) && remoteSources.length > 0 
              ? remoteSources 
              : (cachedSessionData?.sourcesKey || latestState?.sources || []),
              
            reasoning_path: Array.isArray(remoteReasoningPath) && remoteReasoningPath.length > 0 
              ? remoteReasoningPath 
              : (cachedSessionData?.reasoningPathKey || latestState?.reasoning_path || []),
              
            findings: Array.isArray(remoteFindings) && remoteFindings.length > 0
              ? remoteFindings
              : (cachedSessionData?.findingsKey || latestState?.findings || []),
          } as ResearchState;
        }
        
        console.log(`[${new Date().toISOString()}] 📊 Merged state has:`, {
          sources: mergedState?.sources?.length || 0,
          reasoning_path: mergedState?.reasoning_path?.length || 0,
          findings: mergedState?.findings?.length || 0
        });
      }
      
      if (mergedState) {
        console.log(`[${new Date().toISOString()}] ✅ Retrieved session state for ${item.session_id}`);
        
        // Store this state in localStorage for better persistence
        localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, JSON.stringify(mergedState));
        
        // Make sure we have all relevant session data fully cached
        if (mergedState.sources) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(mergedState.sources));
        }
        
        if (mergedState.reasoning_path) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(mergedState.reasoning_path));
        }
        
        if (mergedState.findings) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(mergedState.findings));
        }
        
        // Clear any other session data to prevent mixing
        Object.keys(localStorage).forEach(key => {
          if (key.includes(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE) && 
              !key.includes(item.session_id)) {
            localStorage.removeItem(key);
          }
        });
        
        // Force a complete reset of all other caches
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE);
        
        // Save complete session data to ensure persistence
        saveSessionData(item.session_id, {
          state: mergedState,
          sources: mergedState.sources,
          reasoningPath: mergedState.reasoning_path,
          findings: mergedState.findings
        });
      } else if (cachedSessionData) {
        console.log(`[${new Date().toISOString()}] ⚠️ Using cached session data for ${item.session_id}`);
        
        // If we only have cached data, use that
        if (cachedSessionData.stateKey) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, JSON.stringify(cachedSessionData.stateKey));
        }
        
        if (cachedSessionData.sourcesKey) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(cachedSessionData.sourcesKey));
        }
        
        if (cachedSessionData.reasoningPathKey) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(cachedSessionData.reasoningPathKey));
        }
        
        if (cachedSessionData.findingsKey) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(cachedSessionData.findingsKey));
        }
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
          state: mergedState || cachedSessionData?.stateKey,
          forceRestore: true, // Add this flag to force a complete restoration
          fullReset: true     // Add this flag to signal a full reset of the UI
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
    } finally {
      setIsLoading(prev => ({ ...prev, [item.session_id]: false }));
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
                      className={`px-6 py-3 hover:bg-secondary cursor-pointer transition-colors duration-200 history-item ${
                        isLoading[item.session_id] ? 'opacity-50 pointer-events-none' : ''
                      }`}
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
                          {isLoading[item.session_id] && ' (Loading...)'}
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
