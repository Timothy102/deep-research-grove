
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
}

export const saveResearchState = async (data: Partial<ResearchState>): Promise<void> => {
  try {
    // Create a storage key that combines session and research IDs
    const storageKey = `${data.session_id}_${data.research_id}_state`;
    
    // Save the state to localStorage
    const timestamp = new Date().toISOString();
    const stateData = { ...data, updated_at: timestamp };
    
    localStorage.setItem(storageKey, JSON.stringify(stateData));
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, storageKey);
    
    // Store report data separately for better performance
    if (data.report_data) {
      const reportStorageKey = `${data.session_id}_${data.research_id}_report_data`;
      localStorage.setItem(reportStorageKey, JSON.stringify(data.report_data));
    }
    
    // For current research/session tracking
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
    // Create a storage key that combines session and research IDs
    const storageKey = `${sessionId}_${researchId}_state`;
    
    // Retrieve existing state
    const existingStateStr = localStorage.getItem(storageKey);
    const existingState = existingStateStr ? JSON.parse(existingStateStr) : {};
    
    // Update the state with new values
    const timestamp = new Date().toISOString();
    const updatedState = { 
      ...existingState,
      ...updates,
      updated_at: timestamp
    };
    
    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(updatedState));
    
    // Also store report data separately for better performance
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
    
    // Create a storage key that combines session and research IDs
    const storageKey = `${sessionId}_${researchId}_state`;
    
    // Try to retrieve the state
    const stateStr = localStorage.getItem(storageKey);
    if (!stateStr) {
      return null;
    }
    
    // Parse the state
    const state = JSON.parse(stateStr);
    
    // Check for report data in the separate storage
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
    // Try to retrieve the latest state from localStorage
    // First, check if we have a current research ID for this session
    const storageKey = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_STATE);
    
    if (storageKey && storageKey.startsWith(`${sessionId}_`)) {
      const stateStr = localStorage.getItem(storageKey);
      if (stateStr) {
        const state = JSON.parse(stateStr);
        
        // Check for report data in the separate storage
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
    
    // If no current state, try to find any state for this session
    const allKeys = Object.keys(localStorage);
    const sessionKeys = allKeys.filter(key => key.startsWith(`${sessionId}_`) && key.endsWith('_state'));
    
    if (sessionKeys.length === 0) {
      return null;
    }
    
    // Sort by timestamp, get the latest
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
    
    // Check for report data in the separate storage for the latest state
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
