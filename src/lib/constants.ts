
export const LOCAL_STORAGE_KEYS = {
  CURRENT_RESEARCH_ID: "current_research_id",
  CURRENT_SESSION_ID: "current_session_id",
  CURRENT_STATE: "current_state",
  SOURCES_CACHE: "sources_cache",
  FINDINGS_CACHE: "findings_cache",
  REASONING_PATH_CACHE: "reasoning_path_cache",
  ANSWER_CACHE: "answer_cache",
  SESSION_DATA_CACHE: "session_data_cache",
  RESEARCH_HISTORY: "research_history",
  USER_PREFERENCES: "user_preferences",
  AUTH_STATE: "auth_state",
  USER_MODELS_CACHE: "user_models_cache",
  ACTIVE_MODEL_ID: "active_model_id",
  RESEARCH_SESSIONS: "research_sessions",
  ANSWERS_CACHE: "answers_cache",
  FINAL_REPORT_CACHE: "final_report_cache",
  SIDEBAR_STATE: "sidebar_state",
  SESSION_HISTORY: "session_history",
  SYNTHESIS_CACHE: "synthesis_cache",
  RAW_DATA_CACHE: "raw_data_cache"
};

export const getSessionStorageKey = (key: string, sessionId: string) => {
  return `${key}_${sessionId}`;
};

export const getSessionData = (sessionId: string) => {
  try {
    const sessionKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId);
    const sessionData = localStorage.getItem(sessionKey);
    
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    
    return null;
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Error loading session data:`, e);
    return null;
  }
};

export const saveSessionData = (sessionId: string, data: any) => {
  try {
    const sessionKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId);
    
    // Get existing data
    const existingData = getSessionData(sessionId) || {};
    
    // Merge with new data
    const updatedData = {
      ...existingData,
      ...data,
      updated_at: new Date().toISOString()
    };
    
    localStorage.setItem(sessionKey, JSON.stringify(updatedData));
    
    return updatedData;
  } catch (e) {
    console.error(`[${new Date().toISOString()}] Error saving session data:`, e);
    return null;
  }
};
