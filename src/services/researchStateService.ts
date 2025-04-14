import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { ReportData } from "@/components/research/ResearchOutput";

export interface ResearchState {
  id?: string;
  research_id: string;
  session_id: string;
  status: 'in_progress' | 'completed' | 'error' | 'awaiting_human_input';
  query?: string;
  answer?: string;
  sources?: string[];
  reasoning_path?: string[];
  active_tab?: string;
  updated_at?: string;
  error?: string;
  human_interactions?: any[];
  client_id?: string;
  custom_data?: string;
  findings?: any[];
  report_data?: ReportData;
  user_model?: string;
  completed_nodes?: number;
}

export const saveResearchState = async (data: Partial<ResearchState>): Promise<void> => {
  try {
    const storageKey = `${data.session_id}_${data.research_id}_state`;
    
    const timestamp = new Date().toISOString();
    const stateData = { ...data, updated_at: timestamp };
    
    localStorage.setItem(storageKey, JSON.stringify(stateData));
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, storageKey);
    
    if (data.report_data) {
      const reportStorageKey = `${data.session_id}_${data.research_id}_report_data`;
      localStorage.setItem(reportStorageKey, JSON.stringify(data.report_data));
    }
    
    if (data.research_id) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID, data.research_id);
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error("Error saving research state:", error);
    return Promise.reject(error);
  }
};

export const updateResearchState = async (
  researchId: string,
  sessionId: string,
  updates: Partial<ResearchState>
): Promise<void> => {
  try {
    const storageKey = `${sessionId}_${researchId}_state`;
    
    const existingStateStr = localStorage.getItem(storageKey);
    const existingState = existingStateStr ? JSON.parse(existingStateStr) : {};
    
    const timestamp = new Date().toISOString();
    const updatedState = { 
      ...existingState,
      ...updates,
      updated_at: timestamp
    };
    
    localStorage.setItem(storageKey, JSON.stringify(updatedState));
    
    if (updates.report_data) {
      const reportStorageKey = `${sessionId}_${researchId}_report_data`;
      localStorage.setItem(reportStorageKey, JSON.stringify(updates.report_data));
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error("Error updating research state:", error);
    return Promise.reject(error);
  }
};

export const getResearchState = (
  researchId?: string | null,
  sessionId?: string | null
): ResearchState | null => {
  try {
    if (!researchId || !sessionId) {
      return null;
    }
    
    const storageKey = `${sessionId}_${researchId}_state`;
    
    const stateStr = localStorage.getItem(storageKey);
    if (!stateStr) {
      return null;
    }
    
    const state = JSON.parse(stateStr);
    
    const reportStorageKey = `${sessionId}_${researchId}_report_data`;
    const reportDataStr = localStorage.getItem(reportStorageKey);
    
    if (reportDataStr) {
      try {
        state.report_data = JSON.parse(reportDataStr);
      } catch (e) {
        console.error("Error parsing report data:", e);
      }
    }
    
    return state;
  } catch (error) {
    console.error("Error getting research state:", error);
    return null;
  }
};

export const getLatestSessionState = async (sessionId: string): Promise<ResearchState | null> => {
  try {
    const storageKey = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_STATE);
    
    if (storageKey && storageKey.startsWith(`${sessionId}_`)) {
      const stateStr = localStorage.getItem(storageKey);
      if (stateStr) {
        const state = JSON.parse(stateStr);
        
        if (state.research_id) {
          const reportStorageKey = `${sessionId}_${state.research_id}_report_data`;
          const reportDataStr = localStorage.getItem(reportStorageKey);
          
          if (reportDataStr) {
            try {
              state.report_data = JSON.parse(reportDataStr);
            } catch (e) {
              console.error("Error parsing report data:", e);
            }
          }
        }
        
        return state;
      }
    }
    
    const allKeys = Object.keys(localStorage);
    const sessionKeys = allKeys.filter(key => key.startsWith(`${sessionId}_`) && key.endsWith('_state'));
    
    if (sessionKeys.length === 0) {
      return null;
    }
    
    let latestState: ResearchState | null = null;
    let latestTimestamp = '';
    
    for (const key of sessionKeys) {
      const stateStr = localStorage.getItem(key);
      if (stateStr) {
        const state = JSON.parse(stateStr);
        if (state.updated_at && (!latestTimestamp || state.updated_at > latestTimestamp)) {
          latestTimestamp = state.updated_at;
          latestState = state;
        }
      }
    }
    
    if (latestState && latestState.research_id) {
      const reportStorageKey = `${sessionId}_${latestState.research_id}_report_data`;
      const reportDataStr = localStorage.getItem(reportStorageKey);
      
      if (reportDataStr) {
        try {
          latestState.report_data = JSON.parse(reportDataStr);
        } catch (e) {
          console.error("Error parsing report data:", e);
        }
      }
    }
    
    return latestState;
  } catch (error) {
    console.error("Error getting latest session state:", error);
    return null;
  }
};

export const subscribeToResearchState = (researchId: string, sessionId: string, callback: (payload: any) => void) => {
  console.log(`[${new Date().toISOString()}] 🔄 Setting up realtime subscription for research state:`, { researchId, sessionId });
  
  try {
    const { supabase } = require('@/integrations/supabase/client');
    
    const channel = supabase
      .channel('research_state_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_states',
          filter: `research_id=eq.${researchId}`
        },
        (payload: any) => {
          console.log(`[${new Date().toISOString()}] 📊 Received realtime update for research state:`, {
            event: payload.eventType,
            researchId,
            sessionId
          });
          
          if (callback && typeof callback === 'function') {
            callback(payload);
          }
        }
      )
      .subscribe();
      
    return channel;
  } catch (error) {
    console.error("Error setting up realtime subscription:", error);
    return null;
  }
};
