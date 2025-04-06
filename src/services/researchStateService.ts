
import { supabase, getClientId } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey } from "@/lib/constants";

export interface Finding {
  source: string;
  content?: string;
  finding?: {
    title?: string;
    summary?: string;
    confidence_score?: number;
  };
  node_id?: string;
}

export interface ResearchState {
  id?: string;
  research_id: string;
  session_id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'error' | 'awaiting_human_input';
  query: string;
  answer?: string;
  sources?: string[];
  findings?: Finding[];
  reasoning_path?: string[];
  created_at?: string;
  updated_at?: string;
  user_model?: string | Json;
  active_tab?: string;
  error?: string;
  client_id?: string;
  human_interaction_request?: string;
  custom_data?: string;
  human_interactions?: Array<{
    call_id: string;
    node_id: string;
    interaction_type: string;
    content: string;
    status: 'pending' | 'completed';
    response?: {
      approved: boolean;
      comment?: string;
      timestamp: string;
    };
  }>;
}

// Type for the raw data returned from the database
interface RawResearchStateData {
  id: string;
  research_id: string;
  session_id: string;
  user_id: string;
  status: string;
  query: string;
  answer?: string;
  sources?: string[];
  findings?: Json;
  reasoning_path?: string[];
  created_at?: string;
  updated_at?: string;
  user_model?: Json;
  active_tab?: string;
  error?: string;
  client_id?: string;
  human_interaction_request?: string;
  custom_data?: string;
  human_interactions?: string;
  active_nodes?: number;
  completed_nodes?: number;
  findings_count?: number;
  last_update?: string;
}

// Helper function to convert raw data to ResearchState
function convertToResearchState(raw: RawResearchStateData): ResearchState {
  // Parse findings from Json to Finding[] if present
  let findings: Finding[] | undefined;
  if (raw.findings) {
    try {
      if (typeof raw.findings === 'string') {
        findings = JSON.parse(raw.findings) as Finding[];
      } else if (Array.isArray(raw.findings)) {
        findings = raw.findings as unknown as Finding[];
      } else {
        console.warn('Unexpected findings format:', raw.findings);
      }
    } catch (e) {
      console.error('Error parsing findings:', e);
    }
  }

  // Parse human_interactions from string to object if needed
  let humanInteractions;
  if (raw.human_interactions) {
    try {
      if (typeof raw.human_interactions === 'string') {
        humanInteractions = JSON.parse(raw.human_interactions);
      } else {
        humanInteractions = raw.human_interactions;
      }
    } catch (e) {
      console.error('Error parsing human_interactions:', e);
      humanInteractions = [];
    }
  }

  return {
    id: raw.id,
    research_id: raw.research_id,
    session_id: raw.session_id,
    user_id: raw.user_id,
    status: raw.status as 'in_progress' | 'completed' | 'error' | 'awaiting_human_input',
    query: raw.query,
    answer: raw.answer,
    sources: raw.sources,
    findings: findings,
    reasoning_path: raw.reasoning_path,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    user_model: raw.user_model,
    active_tab: raw.active_tab,
    error: raw.error,
    client_id: raw.client_id,
    human_interaction_request: raw.human_interaction_request,
    custom_data: raw.custom_data,
    human_interactions: humanInteractions
  };
}

// Save initial research state
export async function saveResearchState(state: Omit<ResearchState, 'user_id'>): Promise<ResearchState | null> {
  console.log(`[${new Date().toISOString()}] 📝 Saving research state:`, { 
    research_id: state.research_id,
    session_id: state.session_id,
    status: state.status
  });
  
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    console.error(`[${new Date().toISOString()}] 🚫 User not authenticated`);
    throw new Error("User not authenticated");
  }
  
  // If there's no reasoning_path, initialize with first step
  if (!state.reasoning_path || state.reasoning_path.length === 0) {
    state.reasoning_path = ["Analyzing research objective..."];
  }
  
  // Create a guaranteed unique client ID for this browser session/tab
  const clientId = getClientId();
  console.log(`[${new Date().toISOString()}] 🔑 Using client ID for research state:`, clientId);
  
  // Initialize human_interactions if not present
  if (!state.human_interactions) {
    state.human_interactions = [];
  }
  
  // Convert specific types to match what Supabase expects
  const validState: Record<string, unknown> = {
    research_id: state.research_id,
    session_id: state.session_id,
    status: state.status,
    query: state.query,
    answer: state.answer,
    sources: state.sources,
    findings: state.findings ? JSON.stringify(state.findings) as unknown as Json : undefined,
    reasoning_path: state.reasoning_path,
    user_model: state.user_model,
    error: state.error,
    user_id: user.user.id,
    client_id: clientId,
    human_interaction_request: state.human_interaction_request,
    custom_data: state.custom_data,
    human_interactions: JSON.stringify(state.human_interactions)
  };
  
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Attempting to insert research state with user_id:`, user.user.id, "and client_id:", clientId);
    
    // Always include the client_id in every operation
    const { data, error } = await supabase
      .from('research_states')
      .insert(validState)
      .select();
      
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error saving research state:`, error);
      
      // Try with active_tab if it exists in state
      if (state.active_tab && error.message.includes("violates not-null constraint")) {
        console.log(`[${new Date().toISOString()}] 🔄 Trying with active_tab included`);
        
        // Add active_tab to our validState object for the retry
        const validStateWithTab = {
          ...validState,
          active_tab: state.active_tab
        };
        
        const { data: dataWithTab, error: errorWithTab } = await supabase
          .from('research_states')
          .insert(validStateWithTab)
          .select();
          
        if (errorWithTab) {
          console.error(`[${new Date().toISOString()}] ❌ Error saving research state with active_tab:`, errorWithTab);
          throw errorWithTab;
        }
        
        console.log(`[${new Date().toISOString()}] ✅ Successfully saved research state with active_tab`);
        
        if (dataWithTab && dataWithTab.length > 0) {
          const result = convertToResearchState(dataWithTab[0] as RawResearchStateData);
          // Save to localStorage for persistence
          saveStateToLocalStorage(result);
          return result;
        }
      } else {
        throw error;
      }
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Successfully saved research state`);
    
    if (data && data.length > 0) {
      const result = convertToResearchState(data[0] as RawResearchStateData);
      // Save to localStorage for persistence
      saveStateToLocalStorage(result);
      return result;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 🔥 Critical error saving research state:`, error);
    
    try {
      // Save to localStorage anyway as fallback
      const fallbackState = {
        ...state,
        user_id: user.user.id,
        client_id: clientId,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error saving research state'
      };
      saveStateToLocalStorage(fallbackState);
    } catch (e) {
      console.error("Failed to save fallback state to localStorage:", e);
    }
    
    // Return a minimal valid research state so the UI doesn't break
    return {
      research_id: state.research_id,
      session_id: state.session_id,
      user_id: user.user.id,
      status: 'error',
      query: state.query,
      error: error instanceof Error ? error.message : 'Unknown error saving research state'
    };
  }
  
  return null;
}

// Update existing research state
export async function updateResearchState(
  researchId: string, 
  sessionId: string, 
  updates: Partial<ResearchState>
): Promise<ResearchState | null> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  // Client ID is crucial for isolating sessions
  const clientId = getClientId();
  
  console.log(`[${new Date().toISOString()}] 🔄 Updating research state:`, { 
    researchId, 
    sessionId,
    clientId,
    updates: JSON.stringify(updates).substring(0, 100) + "..." 
  });
  
  // Handle human_interaction_result by using custom_data instead
  if ('human_interaction_result' in updates) {
    const humanInteractionResult = (updates as any).human_interaction_result;
    updates.custom_data = humanInteractionResult;
    delete (updates as any).human_interaction_result;
  }
  
  // Get current state to access human_interactions array
  try {
    const currentState = await getResearchState(researchId, sessionId);
    
    // Update local storage with merged state for persistence
    if (currentState) {
      const updatedState = {...currentState, ...updates};
      saveStateToLocalStorage(updatedState);
      
      // Also make individual caches for specific state components to improve resilience
      if (updates.reasoning_path) {
        try {
          const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
          localStorage.setItem(sessionPathKey, JSON.stringify(updates.reasoning_path));
          localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(updates.reasoning_path));
        } catch (e) {
          console.error("Error caching reasoning path:", e);
        }
      }
      
      if (updates.findings) {
        try {
          const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
          localStorage.setItem(sessionFindingsKey, JSON.stringify(updates.findings));
          localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(updates.findings));
        } catch (e) {
          console.error("Error caching findings:", e);
        }
      }
    }
    
    // Handle human interaction updates
    if (updates.human_interaction_request && currentState) {
      try {
        const requestData = JSON.parse(updates.human_interaction_request);
        let interactions = currentState.human_interactions || [];
        
        // Add the new interaction request
        interactions.push({
          call_id: requestData.call_id,
          node_id: requestData.node_id,
          interaction_type: requestData.interaction_type,
          content: requestData.content,
          status: 'pending'
        });
        
        updates.human_interactions = interactions;
      } catch (e) {
        console.error("Error parsing human_interaction_request", e);
      }
    }
    
    // Update an existing human interaction with response data
    if (updates.custom_data && currentState) {
      try {
        const responseData = JSON.parse(updates.custom_data);
        
        if (responseData.call_id) {
          let interactions = currentState.human_interactions || [];
          const interactionIndex = interactions.findIndex(i => i.call_id === responseData.call_id);
          
          if (interactionIndex >= 0) {
            interactions[interactionIndex].status = 'completed';
            interactions[interactionIndex].response = {
              approved: responseData.approved,
              comment: responseData.comment,
              timestamp: new Date().toISOString()
            };
            
            updates.human_interactions = interactions;
          }
        }
      } catch (e) {
        console.error("Error processing custom_data for human interaction", e);
      }
    }
    
    // Convert specific types to match what Supabase expects
    const validUpdates: Record<string, unknown> = {};
    
    // Copy properties that don't need conversion
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'findings' && value) {
        validUpdates[key] = JSON.stringify(value) as unknown as Json;
      } else if (key === 'human_interactions' && value) {
        validUpdates[key] = JSON.stringify(value);
      } else if (key !== 'active_tab') { // Handle active_tab separately
        validUpdates[key] = value;
      }
    });
    
    // Special handling for sources to address the incorrect source count issue
    if (updates.sources) {
      // Store actual sources in local storage for better persistence
      localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(updates.sources));
      
      // Also store in session-specific cache
      const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
      localStorage.setItem(sessionSourcesKey, JSON.stringify(updates.sources));
    }
  } catch (error) {
    console.error("Error getting current state for human interaction updates", error);
  }
  
  // Filter out active_tab if it exists in updates
  const { active_tab, ...otherUpdates } = updates;
  
  // Base updates without active_tab
  const validUpdates: Record<string, unknown> = {};
  
  // Copy properties, converting types where needed
  Object.entries(otherUpdates).forEach(([key, value]) => {
    if (key === 'findings' && value) {
      validUpdates[key] = JSON.stringify(value) as unknown as Json;
    } else if (key === 'human_interactions' && value) {
      validUpdates[key] = JSON.stringify(value);
    } else {
      validUpdates[key] = value;
    }
  });
  
  // Try with active_tab first if it exists
  if (active_tab !== undefined) {
    try {
      console.log(`[${new Date().toISOString()}] 🔄 Updating with active_tab and client_id:`, clientId);
      
      const updateWithActiveTab = {
        ...validUpdates,
        active_tab
      };
      
      const { data, error } = await supabase
        .from('research_states')
        .update(updateWithActiveTab)
        .match({ 
          research_id: researchId, 
          session_id: sessionId, 
          user_id: user.user.id,
          client_id: clientId
        })
        .select();
        
      if (error) {
        if (error.message.includes("active_tab")) {
          console.log(`[${new Date().toISOString()}] ℹ️ active_tab column doesn't exist, trying without it`);
          // Fall through to try without active_tab
        } else {
          console.error(`[${new Date().toISOString()}] ❌ Error updating research state:`, error);
          throw error;
        }
      } else {
        // If no error, return the result
        if (data && data.length > 0) {
          const result = convertToResearchState(data[0] as RawResearchStateData);
          // Update localStorage
          saveStateToLocalStorage(result);
          return result;
        }
        return null;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in update attempt with active_tab:`, error);
      // Fall through to try without active_tab
    }
  }
  
  // Try without active_tab if we got here
  console.log(`[${new Date().toISOString()}] 🔄 Updating without active_tab but with client_id:`, clientId);
  
  const { data, error } = await supabase
    .from('research_states')
    .update(validUpdates)
    .match({ 
      research_id: researchId, 
      session_id: sessionId, 
      user_id: user.user.id,
      client_id: clientId  // Always use client_id to ensure isolation
    })
    .select();
    
  if (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating research state:`, error);
    
    // Despite error, try to update local storage with the changes to maintain some state
    try {
      // Get the current cached state
      const cachedState = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_STATE);
      if (cachedState) {
        const parsedCachedState = JSON.parse(cachedState);
        // Merge the updates with the cached state
        const updatedCachedState = { ...parsedCachedState, ...updates };
        // Save back to localStorage
        saveStateToLocalStorage(updatedCachedState);
      }
    } catch (e) {
      console.error("Failed to update localStorage after Supabase error:", e);
    }
    
    throw error;
  }
  
  if (data && data.length > 0) {
    const result = convertToResearchState(data[0] as RawResearchStateData);
    // Update localStorage
    saveStateToLocalStorage(result);
    return result;
  }
  
  return null;
}

// Helper to save state to localStorage for better persistence
function saveStateToLocalStorage(state: ResearchState) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID, state.research_id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, state.session_id);
    
    // Save the current complete state
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, JSON.stringify({
      id: state.id,
      research_id: state.research_id,
      session_id: state.session_id,
      status: state.status,
      query: state.query,
      answer: state.answer,
      sources: state.sources,
      findings: state.findings,
      reasoning_path: state.reasoning_path,
      active_tab: state.active_tab,
      client_id: state.client_id,
      updated_at: new Date().toISOString()
    }));
    
    // Also save session-specific state
    const sessionStateKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, state.session_id);
    localStorage.setItem(sessionStateKey, localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_STATE)!);
    
    // Ensure all components are cached separately for resilience
    if (state.sources) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(state.sources));
      const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, state.session_id);
      localStorage.setItem(sessionSourcesKey, JSON.stringify(state.sources));
    }
    
    if (state.reasoning_path) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(state.reasoning_path));
      const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, state.session_id);
      localStorage.setItem(sessionPathKey, JSON.stringify(state.reasoning_path));
    }
    
    if (state.findings) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(state.findings));
      const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, state.session_id);
      localStorage.setItem(sessionFindingsKey, JSON.stringify(state.findings));
    }
    
    if (state.answer) {
      const answerCache = {
        query: state.query,
        answer: state.answer,
        sources: state.sources || [],
        reasoning_path: state.reasoning_path || [],
        confidence: 0.8,
        session_id: state.session_id
      };
      localStorage.setItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE, JSON.stringify(answerCache));
      const sessionAnswerKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, state.session_id);
      localStorage.setItem(sessionAnswerKey, JSON.stringify(answerCache));
    }
  } catch (e) {
    console.error("Failed to save state to localStorage:", e);
  }
}

// Get research state by research_id and session_id
export async function getResearchState(researchId: string, sessionId: string): Promise<ResearchState | null> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  // Include client_id in the match criteria for strict isolation
  const clientId = getClientId();
  
  console.log(`[${new Date().toISOString()}] 🔍 Fetching research state:`, { 
    researchId, 
    sessionId,
    clientId
  });
  
  try {
    const { data, error } = await supabase
      .from('research_states')
      .select('*')
      .match({ 
        research_id: researchId, 
        session_id: sessionId, 
        user_id: user.user.id,
        client_id: clientId
      })
      .maybeSingle();
      
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error fetching research state:`, error);
      
      // Try to get from localStorage as fallback
      const fallbackState = getStateFromLocalStorage(researchId, sessionId, user.user.id);
      if (fallbackState) {
        return fallbackState;
      }
      
      throw error;
    }
    
    // Ensure the returned data has the correct status type
    if (data) {
      const result = convertToResearchState(data as RawResearchStateData);
      
      // Fix up sources from local cache if available
      try {
        // First try session-specific cache
        const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
        const cachedSessionSources = localStorage.getItem(sessionSourcesKey);
        
        if (cachedSessionSources) {
          const parsedSources = JSON.parse(cachedSessionSources);
          if (Array.isArray(parsedSources) && parsedSources.length > 0) {
            result.sources = parsedSources;
          }
        } else {
          // Fall back to general cache
          const cachedSources = localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
          if (cachedSources) {
            const parsedSources = JSON.parse(cachedSources);
            if (Array.isArray(parsedSources) && parsedSources.length > 0) {
              result.sources = parsedSources;
            }
          }
        }
      } catch (e) {
        console.error("Error retrieving cached sources:", e);
      }
      
      // Apply the same logic for findings and reasoning_path
      try {
        const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
        const cachedSessionPath = localStorage.getItem(sessionPathKey);
        
        if (cachedSessionPath) {
          const parsedPath = JSON.parse(cachedSessionPath);
          if (Array.isArray(parsedPath) && parsedPath.length > 0) {
            if (!result.reasoning_path || parsedPath.length > result.reasoning_path.length) {
              result.reasoning_path = parsedPath;
            }
          }
        }
      } catch (e) {
        console.error("Error retrieving cached reasoning path:", e);
      }
      
      try {
        const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
        const cachedSessionFindings = localStorage.getItem(sessionFindingsKey);
        
        if (cachedSessionFindings) {
          const parsedFindings = JSON.parse(cachedSessionFindings);
          if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
            if (!result.findings || parsedFindings.length > result.findings.length) {
              result.findings = parsedFindings as Finding[];
            }
          }
        }
      } catch (e) {
        console.error("Error retrieving cached findings:", e);
      }
      
      if (result.status !== 'in_progress' && 
          result.status !== 'completed' && 
          result.status !== 'error' && 
          result.status !== 'awaiting_human_input') {
        result.status = 'in_progress'; // Default to 'in_progress' if invalid status
      }
      
      // Save to localStorage for better persistence
      saveStateToLocalStorage(result);
      
      return result;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in getResearchState:`, error);
  }
  
  // If we got here, try to get from localStorage
  return getStateFromLocalStorage(researchId, sessionId, user.user.id);
}

// Helper function to get state from localStorage
function getStateFromLocalStorage(researchId: string, sessionId: string, userId: string): ResearchState | null {
  try {
    // First try session-specific cache
    const sessionStateKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId);
    let cachedState = localStorage.getItem(sessionStateKey);
    
    // If no session-specific cache, try the general cache
    if (!cachedState) {
      cachedState = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_STATE);
    }
    
    const cachedResearchId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID);
    const cachedSessionId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID);
    
    // Check if the cached state matches the requested ids
    if (cachedState && 
        ((cachedResearchId === researchId && cachedSessionId === sessionId) || 
         JSON.parse(cachedState).research_id === researchId && JSON.parse(cachedState).session_id === sessionId)) {
      console.log(`[${new Date().toISOString()}] 🔄 Found research state in localStorage`);
      const localState = JSON.parse(cachedState);
      
      // Ensure we have the right user_id
      const clientId = getClientId();
      return { 
        ...localState, 
        user_id: userId,
        client_id: clientId
      } as ResearchState;
    }
    
    // Try to build a state from individual caches
    const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
    const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
    const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
    const sessionAnswerKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, sessionId);
    
    const cachedSources = localStorage.getItem(sessionSourcesKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
    const cachedPath = localStorage.getItem(sessionPathKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE);
    const cachedFindings = localStorage.getItem(sessionFindingsKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE);
    const cachedAnswer = localStorage.getItem(sessionAnswerKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE);
    
    // If we have some cached components, build a state
    if (cachedSources || cachedPath || cachedFindings || cachedAnswer) {
      const clientId = getClientId();
      
      const answerData = cachedAnswer ? JSON.parse(cachedAnswer) : null;
      
      const syntheticState: ResearchState = {
        research_id: researchId,
        session_id: sessionId,
        user_id: userId,
        client_id: clientId,
        status: 'in_progress',
        query: answerData?.query || "Unknown query",
        answer: answerData?.answer,
        sources: cachedSources ? JSON.parse(cachedSources) : [],
        reasoning_path: cachedPath ? JSON.parse(cachedPath) : [],
        findings: cachedFindings ? JSON.parse(cachedFindings) as Finding[] : [],
      };
      
      console.log(`[${new Date().toISOString()}] 🔄 Built synthetic state from cached components`);
      
      return syntheticState;
    }
  } catch (e) {
    console.error("Error retrieving state from localStorage:", e);
  }
  
  return null;
}

// Get all research states for a session
export async function getSessionResearchStates(sessionId: string): Promise<ResearchState[]> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    throw new Error("User not authenticated");
  }
  
  // Include client_id in the match criteria for strict isolation
  const clientId = getClientId();
  
  console.log(`[${new Date().toISOString()}] 🔍 Fetching all research states for session:`, sessionId, "and client:", clientId);
  
  // First try with client_id filter
  let { data, error } = await supabase
    .from('research_states')
    .select('*')
    .match({ 
      session_id: sessionId, 
      user_id: user.user.id,
      client_id: clientId
    })
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error fetching session research states:`, error);
    throw error;
  }
  
  // If no data found with client_id, try without client_id filter
  // This ensures we get results from all tabs/sessions
  if (!data || data.length === 0) {
    console.log(`[${new Date().toISOString()}] ℹ️ No states found with client_id filter, trying without client_id`);
    
    const { data: allClientData, error: allClientError } = await supabase
      .from('research_states')
      .select('*')
      .match({ 
        session_id: sessionId, 
        user_id: user.user.id
      })
      .order('created_at', { ascending: false });
      
    if (allClientError) {
      console.error(`[${new Date().toISOString()}] ❌ Error fetching session research states (all clients):`, allClientError);
      throw allClientError;
    }
    
    data = allClientData;
  }
  
  // Ensure all returned items have the correct status type
  const result = (data || []).map(item => {
    return convertToResearchState(item as RawResearchStateData);
  });
  
  // Special handling for sources from local cache
  result.forEach(state => {
    try {
      // For states that match the current session and research ID
      const cachedSessionId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID);
      const cachedResearchId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID);
      
      if (cachedSessionId === sessionId && cachedResearchId === state.research_id) {
        const cachedSources = localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
        if (cachedSources) {
          const parsedSources = JSON.parse(cachedSources);
          if (Array.isArray(parsedSources) && parsedSources.length > 0) {
            state.sources = parsedSources;
          }
        }
      }
    } catch (e) {
      console.error("Error fixing up sources from cache:", e);
    }
  });
  
  return result;
}

// Get the latest research state for a session
export async function getLatestSessionState(sessionId: string): Promise<ResearchState | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error("User not authenticated");
    }
    
    // Include client_id in the match criteria for strict isolation
    const clientId = getClientId();
    
    console.log(`[${new Date().toISOString()}] 🔍 Fetching latest session state for session:`, sessionId, 
      "user:", user.user.id.substring(0, 8), "client:", clientId.substring(0, 15));
    
    const { data, error } = await supabase
      .from('research_states')
      .select('*')
      .match({ 
        session_id: sessionId, 
        user_id: user.user.id,
        client_id: clientId
      })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error fetching latest session state:`, error);
      
      // Try to get from localStorage as fallback
      const cachedSessionId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID);
      if (cachedSessionId === sessionId) {
        const fallbackState = getStateFromLocalStorage("", sessionId, user.user.id);
        if (fallbackState) {
          return fallbackState;
        }
      }
      
      throw error;
    }
    
    if (data) {
      const result = convertToResearchState(data as RawResearchStateData);
      console.log(`[${new Date().toISOString()}] ✅ Found session state:`, {
        id: result.id,
        research_id: result.research_id,
        status: result.status,
        clientId: result.client_id
      });
      
      // Fix up sources from local cache
      try {
        // First try session-specific cache
        const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
        const cachedSessionSources = localStorage.getItem(sessionSourcesKey);
        
        if (cachedSessionSources) {
          const parsedSources = JSON.parse(cachedSessionSources);
          if (Array.isArray(parsedSources) && parsedSources.length > 0) {
            result.sources = parsedSources;
          }
        } else {
          // Fall back to general cache
          const cachedSources = localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
          if (cachedSources) {
            const parsedSources = JSON.parse(cachedSources);
            if (Array.isArray(parsedSources) && parsedSources.length > 0) {
              result.sources = parsedSources;
            }
          }
        }
      } catch (e) {
        console.error("Error retrieving cached sources:", e);
      }
      
      // Apply the same logic for findings and reasoning_path
      try {
        const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
        const cachedSessionPath = localStorage.getItem(sessionPathKey);
        
        if (cachedSessionPath) {
          const parsedPath = JSON.parse(cachedSessionPath);
          if (Array.isArray(parsedPath) && parsedPath.length > 0) {
            if (!result.reasoning_path || parsedPath.length > result.reasoning_path.length) {
              result.reasoning_path = parsedPath;
            }
          }
        }
      } catch (e) {
        console.error("Error retrieving cached reasoning path:", e);
      }
      
      try {
        const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
        const cachedSessionFindings = localStorage.getItem(sessionFindingsKey);
        
        if (cachedSessionFindings) {
          const parsedFindings = JSON.parse(cachedSessionFindings);
          if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
            if (!result.findings || parsedFindings.length > result.findings.length) {
              result.findings = parsedFindings as Finding[];
            }
          }
        }
      } catch (e) {
        console.error("Error retrieving cached findings:", e);
      }
      
      if (result.status !== 'in_progress' && 
          result.status !== 'completed' && 
          result.status !== 'error' && 
          result.status !== 'awaiting_human_input') {
        result.status = 'in_progress'; // Default to 'in_progress' if invalid status
      }
      
      // Save to localStorage for better persistence
      saveStateToLocalStorage(result);
      
      return result;
    }
    
    console.log(`[${new Date().toISOString()}] ℹ️ No session state found for session:`, sessionId);
    
    // Try to get from localStorage as fallback
    return getStateFromLocalStorage("", sessionId, user.user.id);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 🔥 Error in getLatestSessionState:`, error);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        return getStateFromLocalStorage("", sessionId, user.user.id);
      }
    } catch (e) {
      console.error("Error getting user for localStorage fallback:", e);
    }
    
    return null;
  }
}
