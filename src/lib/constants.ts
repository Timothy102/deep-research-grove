
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
  SIDEBAR_STATE: "deepresearch.sidebar_state"
};

// Session-specific keys
export const getSessionStorageKey = (baseKey: string, sessionId: string) => {
  return `${baseKey}.${sessionId}`;
};
