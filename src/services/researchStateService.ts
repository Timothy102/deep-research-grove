import { supabase, getClientId } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";

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

export interface HumanInteraction {
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
  human_interactions?: HumanInteraction[];
  active_nodes?: number | null;
  completed_nodes?: number | null;
  findings_count?: number | null;
  last_update?: string | null;
}

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

interface ResearchStateInsert {
  research_id: string;
  session_id: string;
  user_id: string;
  status: string;
  query: string;
  answer?: string;
  sources?: string[];
  reasoning_path?: string[];
  client_id?: string;
  findings?: Json;
  findings_count?: number;
  active_nodes?: number;
  completed_nodes?: number;
  custom_data?: string;
  human_interaction_request?: string;
  human_interactions?: Json;
  user_model?: Json;
  error?: string;
  last_update?: string;
}

function convertToResearchState(raw: RawResearchStateData): ResearchState {
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

  let humanInteractions: HumanInteraction[] = [];
  if (raw.human_interactions) {
    try {
      if (typeof raw.human_interactions === 'string') {
        humanInteractions = JSON.parse(raw.human_interactions) as HumanInteraction[];
      } else if (Array.isArray(raw.human_interactions)) {
        humanInteractions = raw.human_interactions as unknown as HumanInteraction[];
      } else {
        console.warn('Unexpected human_interactions format:', raw.human_interactions);
      }
    } catch (e) {
      console.error('Error parsing human_interactions:', e);
      humanInteractions = [];
    }
  }

  // Ensure status is a valid value
  let status = raw.status as 'in_progress' | 'completed' | 'error' | 'awaiting_human_input';
  if (!['in_progress', 'completed', 'error', 'awaiting_human_input'].includes(status)) {
    status = 'in_progress';
  }

  return {
    id: raw.id,
    research_id: raw.research_id,
    session_id: raw.session_id,
    user_id: raw.user_id,
    status: status,
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
    human_interactions: humanInteractions,
    active_nodes: raw.active_nodes,
    completed_nodes: raw.completed_nodes,
    findings_count: raw.findings_count,
    last_update: raw.last_update
  };
}

export async function saveResearchState(state: Omit<ResearchState, 'user_id'>): Promise<ResearchState | null> {
  console.log(`[${new Date().toISOString()}] 📝 Saving research state:`, { 
    research_id: state.research_id,
    session_id: state.session_id,
    status: state.status
  });
  
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    console.error(`[${new Date().toISOString()}] 🚫 User not authenticated`);
    toast({
      title: "Authentication Error",
      description: "User not authenticated. Please sign in again.",
      variant: "destructive"
    });
    throw new Error("User not authenticated");
  }
  
  if (!state.reasoning_path || state.reasoning_path.length === 0) {
    state.reasoning_path = ["Analyzing research objective..."];
  }
  
  const clientId = getClientId();
  console.log(`[${new Date().toISOString()}] 🔑 Using client ID for research state:`, clientId);
  
  if (!state.human_interactions) {
    state.human_interactions = [];
  }
  
  const activeTab = state.active_tab;
  
  const insertData: ResearchStateInsert = {
    research_id: state.research_id,
    session_id: state.session_id,
    status: state.status,
    query: state.query,
    user_id: user.user.id,
    client_id: clientId,
    reasoning_path: state.reasoning_path
  };
  
  if (state.answer) insertData.answer = state.answer;
  if (state.sources) insertData.sources = state.sources;
  
  if (state.user_model) {
    if (typeof state.user_model === 'object') {
      insertData.user_model = state.user_model as Json;
    } else {
      insertData.user_model = state.user_model as unknown as Json;
    }
  }
  
  if (state.error) {
    insertData.error = state.error;
  }
  
  if (state.human_interaction_request) {
    insertData.human_interaction_request = state.human_interaction_request;
  }
  
  if (state.custom_data) {
    insertData.custom_data = state.custom_data;
  }
  
  if (state.findings) {
    insertData.findings = JSON.stringify(state.findings) as unknown as Json;
  }
  
  if (state.human_interactions) {
    insertData.human_interactions = JSON.stringify(state.human_interactions) as unknown as Json;
  }
  
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Attempting to insert research state with user_id:`, user.user.id, "and client_id:", clientId);
    
    const { data, error } = await supabase
      .from('research_states')
      .insert(insertData)
      .select();
      
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error saving research state:`, error);
      toast({
        title: "Error Saving Research",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Successfully saved research state`);
    
    if (data && data.length > 0) {
      const result = convertToResearchState(data[0] as RawResearchStateData);
      
      if (activeTab) {
        result.active_tab = activeTab;
      }
      
      saveStateToLocalStorage(result);
      return result;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 🔥 Critical error saving research state:`, error);
    
    try {
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

export async function updateResearchState(
  researchId: string, 
  sessionId: string, 
  updates: Partial<ResearchState>
): Promise<ResearchState | null> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const clientId = getClientId();
  
  console.log(`[${new Date().toISOString()}] 🔄 Updating research state:`, { 
    researchId, 
    sessionId,
    clientId,
    updates: JSON.stringify(updates).substring(0, 100) + "..." 
  });
  
  if ('human_interaction_result' in updates) {
    const humanInteractionResult = (updates as any).human_interaction_result;
    updates.custom_data = humanInteractionResult;
    delete (updates as any).human_interaction_result;
  }
  
  const { active_tab, ...otherUpdates } = updates;
  
  try {
    const currentState = await getResearchState(researchId, sessionId);
    
    if (currentState) {
      const updatedState = {...currentState, ...updates};
      saveStateToLocalStorage(updatedState);
      
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
    
    if (updates.human_interaction_request && currentState) {
      try {
        const requestData = JSON.parse(updates.human_interaction_request);
        let interactions = currentState.human_interactions || [];
        
        interactions.push({
          call_id: requestData.call_id,
          node_id: requestData.node_id,
          interaction_type: requestData.interaction_type,
          content: requestData.content,
          status: 'pending'
        });
        
        otherUpdates.human_interactions = interactions;
      } catch (e) {
        console.error("Error parsing human_interaction_request", e);
      }
    }
    
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
            
            otherUpdates.human_interactions = interactions;
          }
        }
      } catch (e) {
        console.error("Error processing custom_data for human interaction", e);
      }
    }
  } catch (error) {
    console.error("Error getting current state for human interaction updates", error);
  }
  
  const updateData: Record<string, any> = {};
  
  Object.entries(otherUpdates).forEach(([key, value]) => {
    if (key === 'findings' && value) {
      updateData[key] = JSON.stringify(value);
    } else if (key === 'human_interactions' && value) {
      updateData[key] = JSON.stringify(value);
    } else {
      updateData[key] = value;
    }
  });
  
  if (Object.keys(updateData).length === 0 && active_tab !== undefined) {
    try {
      const currentState = await getResearchState(researchId, sessionId);
      if (currentState) {
        currentState.active_tab = active_tab;
        saveStateToLocalStorage(currentState);
        return currentState;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error updating active_tab in localStorage:`, error);
    }
  }
  
  if (Object.keys(updateData).length === 0) {
    console.log(`[${new Date().toISOString()}] ℹ️ No updates to apply, retrieving current state`);
    return getResearchState(researchId, sessionId);
  }
  
  console.log(`[${new Date().toISOString()}] 🔄 Updating without active_tab but with client_id:`, clientId);
  
  const { data, error } = await supabase
    .from('research_states')
    .update(updateData)
    .eq('research_id', researchId)
    .eq('session_id', sessionId)
    .eq('user_id', user.user.id)
    .eq('client_id', clientId)
    .select();
    
  if (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating research state:`, error);
    
    try {
      const cachedState = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_STATE);
      if (cachedState) {
        const parsedCachedState = JSON.parse(cachedState);
        const updatedCachedState = { ...parsedCachedState, ...updates };
        saveStateToLocalStorage(updatedCachedState);
      }
    } catch (e) {
      console.error("Failed to update localStorage after Supabase error:", e);
    }
    
    throw error;
  }
  
  if (data && data.length > 0) {
    const result = convertToResearchState(data[0] as RawResearchStateData);
    
    if (active_tab !== undefined) {
      result.active_tab = active_tab;
    }
    
    saveStateToLocalStorage(result);
    return result;
  }
  
  return null;
}

function saveStateToLocalStorage(state: ResearchState) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID, state.research_id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, state.session_id);
    
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
    
    const sessionStateKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, state.session_id);
    localStorage.setItem(sessionStateKey, localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_STATE)!);
    
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

export async function getResearchState(researchId: string, sessionId: string): Promise<ResearchState | null> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
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
      
      const fallbackState = getStateFromLocalStorage(researchId, sessionId, user.user.id);
      if (fallbackState) {
        return fallbackState;
      }
      
      throw error;
    }
    
    if (data) {
      const result = convertToResearchState(data as RawResearchStateData);
      
      try {
        const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
        const cachedSessionSources = localStorage.getItem(sessionSourcesKey);
        
        if (cachedSessionSources) {
          const parsedSources = JSON.parse(cachedSessionSources);
          if (Array.isArray(parsedSources) && parsedSources.length > 0) {
            result.sources = parsedSources;
          }
        } else {
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
        result.status = 'in_progress';
      }
      
      saveStateToLocalStorage(result);
      
      return result;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in getResearchState:`, error);
  }
  
  return getStateFromLocalStorage(researchId, sessionId, user.user.id);
}

function getStateFromLocalStorage(researchId: string, sessionId: string, userId: string): ResearchState | null {
  try {
    const sessionStateKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SESSION_DATA_CACHE, sessionId);
    let cachedState = localStorage.getItem(sessionStateKey);
    
    if (!cachedState) {
      cachedState = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_STATE);
    }
    
    const cachedResearchId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID);
    const cachedSessionId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID);
    
    if (cachedState && 
        ((cachedResearchId === researchId && cachedSessionId === sessionId) || 
         JSON.parse(cachedState).research_id === researchId && JSON.parse(cachedState).session_id === sessionId)) {
      console.log(`[${new Date().toISOString()}] 🔄 Found research state in localStorage`);
      const localState = JSON.parse(cachedState);
      
      const clientId = getClientId();
      return { 
        ...localState, 
        user_id: userId,
        client_id: clientId
      } as ResearchState;
    }
    
    const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
    const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
    const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
    const sessionAnswerKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, sessionId);
    
    const cachedSources = localStorage.getItem(sessionSourcesKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
    const cachedPath = localStorage.getItem(sessionPathKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE);
    const cachedFindings = localStorage.getItem(sessionFindingsKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE);
    const cachedAnswer = localStorage.getItem(sessionAnswerKey) || localStorage.getItem(LOCAL_STORAGE_KEYS.ANSWER_CACHE);
    
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

export async function getSessionResearchStates(sessionId: string): Promise<ResearchState[]> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    throw new Error("User not authenticated");
  }
  
  const clientId = getClientId();
  
  console.log(`[${new Date().toISOString()}] 🔍 Fetching all research states for session:`, sessionId, "and client:", clientId);
  
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
  
  const result = (data || []).map(item => {
    return convertToResearchState(item as RawResearchStateData);
  });
  
  result.forEach(state => {
    try {
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

export async function getLatestSessionState(sessionId: string): Promise<ResearchState | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error("User not authenticated");
    }
    
    const clientId = getClientId();
    
    console.log(`[${new Date().toISOString()}] 🔍 Fetching latest session state for session:`, sessionId, 
      "user:", user.user.id.substring(0, 8), "client:", clientId.substring(0, 15));
    
    // First query: try with the current client ID
    const { data: clientData, error: clientError } = await supabase
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
      
    if (clientData) {
      console.log(`[${new Date().toISOString()}] ✅ Found session state with current client:`, clientData.id);
      return convertToResearchState(clientData as RawResearchStateData);
    }
    
    if (clientError) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Error fetching with client ID, trying without:`, clientError.message);
    }
    
    // Second query: try without client ID restriction
    const { data, error } = await supabase
      .from('research_states')
      .select('*')
      .match({ 
        session_id: sessionId, 
        user_id: user.user.id
      })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error fetching latest session state:`, error);
      
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
      
      try {
        const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
        const cachedSessionSources = localStorage.getItem(sessionSourcesKey);
        
        if (cachedSessionSources) {
          const parsedSources = JSON.parse(cachedSessionSources);
          if (Array.isArray(parsedSources) && parsedSources.length > 0) {
            result.sources = parsedSources;
          }
        } else {
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
        result.status = 'in_progress';
      }
      
      saveStateToLocalStorage(result);
      
      return result;
    }
    
    console.log(`[${new Date().toISOString()}] ℹ️ No session state found for session:`, sessionId);
    
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
