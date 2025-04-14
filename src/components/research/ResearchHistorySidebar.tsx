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
import { supabase, syncSession, getClientId } from "@/integrations/supabase/client";
import { getLatestSessionState, subscribeToResearchState } from "@/services/researchStateService";

interface ResearchHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  history: any[];
  onHistoryItemClick?: (item: any) => void;
  onSelectItem?: (item: any) => void;
  currentSessionId?: string;
}

const ResearchHistorySidebar: React.FC<ResearchHistorySidebarProps> = ({ 
  isOpen, 
  onToggle,
  history,
  onHistoryItemClick,
  onSelectItem,
  currentSessionId
}) => {
  useEffect(() => {
    if (isOpen) {
      syncSession().catch(err => {
        console.error("Error syncing session when opening sidebar:", err);
      });
    }
  }, [isOpen]);

  const handleSessionSelect = async (item: any) => {
    try {
      await syncSession();
      
      const sessionId = item.session_id;
      console.log(`[${new Date().toISOString()}] 🔍 Selecting history session:`, sessionId, "with query:", item.query);
      
      const allKeys = Object.keys(localStorage);
      const keysToPreserve = [
        getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId),
        getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId),
        getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId),
        getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId),
        getSessionStorageKey(LOCAL_STORAGE_KEYS.SYNTHESIS_CACHE, sessionId)
      ];
      
      allKeys.forEach(key => {
        if (
          (key.includes(LOCAL_STORAGE_KEYS.CURRENT_STATE) ||
          key.includes(LOCAL_STORAGE_KEYS.ANSWER_CACHE) ||
          key.includes(LOCAL_STORAGE_KEYS.SOURCES_CACHE) ||
          key.includes(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE) || 
          key.includes(LOCAL_STORAGE_KEYS.FINDINGS_CACHE)) && 
          !keysToPreserve.includes(key)
        ) {
          localStorage.removeItem(key);
          console.log(`[${new Date().toISOString()}] 🧹 Removed cached data:`, key);
        }
      });
      
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, sessionId);
      
      const latestState = await getLatestSessionState(sessionId);
      
      if (latestState) {
        console.log(`[${new Date().toISOString()}] ✅ Retrieved complete state for session:`, sessionId);
        console.log("Query from state:", latestState.query);
        console.log("Answer first 100 chars:", latestState.answer?.substring(0, 100) || "No answer found");
        console.log("Findings count:", latestState.findings?.length || 0);
        
        if (latestState.query !== item.query) {
          console.warn(`[${new Date().toISOString()}] ⚠️ Query mismatch between state (${latestState.query}) and history item (${item.query})`);
        }
        
        const processedFindings = Array.isArray(latestState.findings) 
          ? latestState.findings.map(finding => ({
              source: finding.source || "Unknown source",
              content: finding.content || "",
              finding: finding.finding || undefined,
              node_id: finding.node_id || undefined,
              ...(finding as any)
            }))
          : [];
          
        const processedSyntheses = typeof latestState.user_model === 'object' && latestState.user_model !== null
          ? latestState.user_model as Record<string, any>
          : {};
        
        if (processedFindings.length > 0) {
          const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
          localStorage.setItem(sessionFindingsKey, JSON.stringify(processedFindings));
          localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(processedFindings));
          console.log(`[${new Date().toISOString()}] 💾 Cached ${processedFindings.length} findings for session:`, sessionId);
        }
        
        const completeAnswer = {
          query: latestState.query || item.query,
          answer: latestState.answer || "",
          sources: latestState.sources || [],
          reasoning_path: latestState.reasoning_path || [],
          findings: processedFindings,
          syntheses: processedSyntheses,
          confidence: latestState.completed_nodes ? (latestState.completed_nodes / 10) : 0.8,
          session_id: sessionId,
          research_id: latestState.research_id
        };
        
        localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, JSON.stringify(latestState));
        localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(completeAnswer));
        
        const sessionStateKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId);
        localStorage.setItem(sessionStateKey, JSON.stringify(latestState));
        
        const sessionAnswerKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, sessionId);
        localStorage.setItem(sessionAnswerKey, JSON.stringify(completeAnswer));
        
        if (latestState.sources && latestState.sources.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(latestState.sources));
          const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
          localStorage.setItem(sessionSourcesKey, JSON.stringify(latestState.sources));
        }
        
        if (latestState.reasoning_path && latestState.reasoning_path.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(latestState.reasoning_path));
          const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
          localStorage.setItem(sessionPathKey, JSON.stringify(latestState.reasoning_path));
        }
        
        if (processedSyntheses && Object.keys(processedSyntheses).length > 0) {
          const sessionSynthesisKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SYNTHESIS_CACHE, sessionId);
          localStorage.setItem(sessionSynthesisKey, JSON.stringify(processedSyntheses));
        }
        
        try {
          const clientId = getClientId();
          const channel = subscribeToResearchState(
            latestState.research_id, 
            sessionId,
            (payload) => {
              console.log(`[${new Date().toISOString()}] 🔄 Realtime update received:`, payload.eventType);
              getLatestSessionState(sessionId).then(updatedState => {
                if (updatedState) {
                  const sessionStateKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId);
                  localStorage.setItem(sessionStateKey, JSON.stringify(updatedState));
                  
                  if (updatedState.findings && Array.isArray(updatedState.findings)) {
                    const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
                    localStorage.setItem(sessionFindingsKey, JSON.stringify(updatedState.findings));
                    localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(updatedState.findings));
                  }
                  
                  window.dispatchEvent(new CustomEvent('research_state_update', {
                    detail: {
                      sessionId,
                      researchId: updatedState.research_id,
                      timestamp: new Date().toISOString()
                    }
                  }));
                }
              }).catch(err => {
                console.error("Error refreshing state after realtime update:", err);
              });
            }
          );
          
          console.log(`[${new Date().toISOString()}] 🔄 Set up realtime subscription for session:`, sessionId);
        } catch (e) {
          console.error("Error setting up realtime subscription:", e);
        }
      } else {
        console.warn(`[${new Date().toISOString()}] ⚠️ Could not find state for session:`, sessionId);
        
        const fallbackAnswer = {
          query: item.query,
          answer: "Loading research data...",
          sources: [],
          reasoning_path: [],
          findings: [],
          syntheses: {},
          confidence: 0.5,
          session_id: sessionId
        };
        
        localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(fallbackAnswer));
        const sessionAnswerKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, sessionId);
        localStorage.setItem(sessionAnswerKey, JSON.stringify(fallbackAnswer));
        
        toast.error("Could not load complete session data. Trying with partial data.");
      }
      
      window.dispatchEvent(new CustomEvent('session-selected', { 
        detail: { 
          sessionId: sessionId,
          query: item.query,
          isNew: false,
          historyItem: item,
          timestamp: new Date().toISOString()
        }
      }));
      
      onHistoryItemClick?.(item);
      onSelectItem?.(item);
      
      onToggle();
      
      toast.success(`Loading "${item.query.substring(0, 30)}${item.query.length > 30 ? '...' : ''}"`);
    } catch (error) {
      console.error("Error selecting history session:", error);
      toast.error("Failed to load session. Please try again.");
    }
  };

  const handleRefreshHistory = () => {
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
                      data-session-id={item.session_id}
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
