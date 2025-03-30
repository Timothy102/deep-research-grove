
// Local storage keys for better state persistence
export const LOCAL_STORAGE_KEYS = {
  CURRENT_RESEARCH_ID: "deepresearch.current_research_id",
  CURRENT_SESSION_ID: "deepresearch.current_session_id",
  CURRENT_STATE: "deepresearch.current_state",
  SOURCES_CACHE: "deepresearch.sources_cache",
  FINDINGS_CACHE: "deepresearch.findings_cache",
  REASONING_PATH_CACHE: "deepresearch.reasoning_path_cache",
  ANSWER_CACHE: "deepresearch.answer_cache",
  SESSION_DATA_CACHE: "deepresearch.session_data_cache",
  SIDEBAR_STATE: "deepresearch.sidebar_state",
  RESEARCH_OBJECTIVE: "deepresearch.research_objective",
  STEPS_CACHE: "deepresearch.steps_cache",
  RAW_DATA_CACHE: "deepresearch.raw_data_cache",
  SESSION_HISTORY: "deepresearch.session_history"
};

// Session-specific keys
export const getSessionStorageKey = (baseKey: string, sessionId: string) => {
  return `${baseKey}.${sessionId}`;
};

// Get all session storage keys for caching all state elements
export const getAllSessionKeys = (sessionId: string) => {
  if (!sessionId) return {};
  
  return {
    stateKey: getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId),
    sourcesKey: getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId),
    findingsKey: getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId),
    reasoningPathKey: getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId),
    answerKey: getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, sessionId),
    stepsKey: getSessionStorageKey(LOCAL_STORAGE_KEYS.STEPS_CACHE, sessionId),
    rawDataKey: getSessionStorageKey(LOCAL_STORAGE_KEYS.RAW_DATA_CACHE, sessionId),
    objectiveKey: getSessionStorageKey(LOCAL_STORAGE_KEYS.RESEARCH_OBJECTIVE, sessionId)
  };
};

// Get all session data at once
export const getSessionData = (sessionId: string) => {
  if (!sessionId) return null;
  
  try {
    const keys = getAllSessionKeys(sessionId);
    const data: Record<string, any> = {};
    
    // Try to get each piece of data with fallbacks
    Object.entries(keys).forEach(([keyType, storageKey]) => {
      const value = localStorage.getItem(storageKey);
      if (value) {
        try {
          data[keyType] = JSON.parse(value);
        } catch (e) {
          data[keyType] = value;
        }
      }
    });
    
    // Also try to get general objective if exists
    const objective = localStorage.getItem(LOCAL_STORAGE_KEYS.RESEARCH_OBJECTIVE);
    if (objective && !data.objectiveKey) {
      data.objective = objective;
    }
    
    return Object.keys(data).length > 0 ? data : null;
  } catch (e) {
    console.error(`Error retrieving session data for ${sessionId}:`, e);
    return null;
  }
};

// Save complete session data at once
export const saveSessionData = (sessionId: string, data: Record<string, any>) => {
  if (!sessionId || !data) return;
  
  try {
    const keys = getAllSessionKeys(sessionId);
    
    // Map data to corresponding storage keys
    if (data.state) {
      localStorage.setItem(keys.stateKey, JSON.stringify(data.state));
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, JSON.stringify(data.state));
    }
    
    if (data.sources) {
      localStorage.setItem(keys.sourcesKey, JSON.stringify(data.sources));
      localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(data.sources));
    }
    
    if (data.findings) {
      localStorage.setItem(keys.findingsKey, JSON.stringify(data.findings));
      localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(data.findings));
    }
    
    if (data.reasoningPath) {
      localStorage.setItem(keys.reasoningPathKey, JSON.stringify(data.reasoningPath));
      localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(data.reasoningPath));
    }
    
    if (data.answer) {
      localStorage.setItem(keys.answerKey, JSON.stringify(data.answer));
      localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(data.answer));
    }
    
    if (data.steps) {
      localStorage.setItem(keys.stepsKey, JSON.stringify(data.steps));
      localStorage.setItem(LOCAL_STORAGE_KEYS.STEPS_CACHE, JSON.stringify(data.steps));
    }
    
    if (data.rawData) {
      localStorage.setItem(keys.rawDataKey, JSON.stringify(data.rawData));
      localStorage.setItem(LOCAL_STORAGE_KEYS.RAW_DATA_CACHE, JSON.stringify(data.rawData));
    }
    
    if (data.objective) {
      localStorage.setItem(keys.objectiveKey, data.objective);
      localStorage.setItem(LOCAL_STORAGE_KEYS.RESEARCH_OBJECTIVE, data.objective);
    }
    
    // Save current session ID
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, sessionId);
    
    // If there's a research ID, save that too
    if (data.researchId) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID, data.researchId);
    }
    
    // Create a history entry if needed
    try {
      const history = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION_HISTORY) || '[]');
      
      // Check if this session already exists in history
      const existingEntryIndex = history.findIndex((entry: any) => entry.session_id === sessionId);
      
      const historyEntry = {
        session_id: sessionId,
        research_id: data.researchId || data.state?.research_id,
        query: data.state?.query || data.answer?.query || "Unknown query",
        created_at: data.state?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (existingEntryIndex >= 0) {
        history[existingEntryIndex] = {...history[existingEntryIndex], ...historyEntry};
      } else {
        history.push(historyEntry);
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error("Error updating session history:", e);
    }
  } catch (e) {
    console.error(`Error saving session data for ${sessionId}:`, e);
  }
};
