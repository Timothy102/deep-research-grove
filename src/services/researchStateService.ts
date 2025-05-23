import { supabase, getClientId, subscribeToResearchState } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey } from "@/lib/constants";

export interface ResearchState {
  id?: string;
  research_id: string;
  session_id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'error' | 'awaiting_human_input';
  query: string;
  answer?: string;
  sources?: string[];
  findings?: Array<{ 
    source: string; 
    content?: string; 
    node_id?: string;
    query?: string;
    finding?: any;
    [key: string]: any;
  }>;
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
  active_nodes?: number;
  completed_nodes?: number;
  findings_count?: number;
  last_update?: string;
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
  
  if (state.findings) {
    state.findings = state.findings.map(finding => {
      if (!finding.source) {
        finding.source = "Unknown source";
      }
      return finding;
    });
  } else {
    state.findings = [];
  }
  
  const findingsCount = state.findings ? state.findings.length : 0;
  const completedNodes = state.reasoning_path ? state.reasoning_path.length : 0;
  
  const validState = {
    research_id: state.research_id,
    session_id: state.session_id,
    status: state.status,
    query: state.query,
    answer: state.answer,
    sources: state.sources,
    findings: state.findings,
    reasoning_path: state.reasoning_path,
    user_model: state.user_model,
    error: state.error,
    user_id: user.user.id,
    client_id: clientId,
    human_interaction_request: state.human_interaction_request,
    custom_data: state.custom_data,
    human_interactions: JSON.stringify(state.human_interactions),
    findings_count: findingsCount,
    completed_nodes: completedNodes,
    active_nodes: state.active_nodes || 1
  };
  
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Attempting to insert research state with user_id:`, user.user.id, "and client_id:", clientId);
    
    const { data, error } = await supabase
      .from('research_states')
      .insert({...validState, client_id: clientId})
      .select();
      
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error saving research state:`, error);
      
      if (error.message.includes("violates not-null constraint")) {
        console.log(`[${new Date().toISOString()}] 🔄 Trying with active_tab included`);
        const { data: dataWithTab, error: errorWithTab } = await supabase
          .from('research_states')
          .insert({
            ...validState,
            active_tab: state.active_tab,
            client_id: clientId
          })
          .select();
          
        if (errorWithTab) {
          console.error(`[${new Date().toISOString()}] ❌ Error saving research state with active_tab:`, errorWithTab);
          throw errorWithTab;
        }
        
        console.log(`[${new Date().toISOString()}] ✅ Successfully saved research state with active_tab`);
        
        if (dataWithTab && dataWithTab.length > 0) {
          const result = dataWithTab[0] as ResearchState;
          saveStateToLocalStorage(result);
          return result;
        }
      } else {
        throw error;
      }
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Successfully saved research state`);
    
    if (data && data.length > 0) {
      const result = data[0] as ResearchState;
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
  
  if (updates.findings) {
    updates.findings = updates.findings.map(finding => {
      if (!finding.source) {
        finding.source = "Unknown source";
      }
      return finding;
    });
    
    updates.findings_count = updates.findings.length;
    
    try {
      const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
      localStorage.setItem(sessionFindingsKey, JSON.stringify(updates.findings));
      localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(updates.findings));
    } catch (e) {
      console.error("Error caching findings:", e);
    }
  }
  
  if (updates.reasoning_path) {
    updates.completed_nodes = updates.reasoning_path.length;
  }
  
  updates.last_update = new Date().toISOString();
  
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
        
        updates.human_interactions = interactions;
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
            
            updates.human_interactions = interactions;
          }
        }
      } catch (e) {
        console.error("Error processing custom_data for human interaction", e);
      }
    }
    
    if (updates.human_interactions) {
      (updates as any).human_interactions = JSON.stringify(updates.human_interactions);
    }
    
    if (updates.sources) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(updates.sources));
      const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
      localStorage.setItem(sessionSourcesKey, JSON.stringify(updates.sources));
    }
  } catch (error) {
    console.error("Error getting current state for human interaction updates", error);
  }
  
  const { active_tab, ...otherUpdates } = updates;
  
  const validUpdates = { ...otherUpdates };
  
  if (active_tab !== undefined) {
    try {
      console.log(`[${new Date().toISOString()}] 🔄 Updating with active_tab and client_id:`, clientId);
      
      const { data, error } = await supabase
        .from('research_states')
        .update({ ...validUpdates, active_tab })
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
        } else {
          console.error(`[${new Date().toISOString()}] ❌ Error updating research state:`, error);
          throw error;
        }
      } else {
        if (data && data.length > 0) {
          const result = data[0] as ResearchState;
          saveStateToLocalStorage(result);
          return result;
        }
        return null;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in update attempt with active_tab:`, error);
    }
  }
  
  console.log(`[${new Date().toISOString()}] 🔄 Updating without active_tab but with client_id:`, clientId);
  
  const { data, error } = await supabase
    .from('research_states')
    .update(validUpdates)
    .match({ 
      research_id: researchId, 
      session_id: sessionId, 
      user_id: user.user.id,
      client_id: clientId
    })
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
    const result = data[0] as ResearchState;
    saveStateToLocalStorage(result);
    return result;
  }
  
  return null;
}

function saveStateToLocalStorage(state: ResearchState) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_RESEARCH_ID, state.research_id);
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, state.session_id);
    
    let processedFindings = state.findings || [];
    if (typeof processedFindings === 'string') {
      try {
        processedFindings = JSON.parse(processedFindings);
      } catch (e) {
        console.error("Error parsing findings string:", e);
        processedFindings = [];
      }
    }
    
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, JSON.stringify({
      id: state.id,
      research_id: state.research_id,
      session_id: state.session_id,
      status: state.status,
      query: state.query,
      answer: state.answer,
      sources: state.sources,
      findings: processedFindings,
      reasoning_path: state.reasoning_path,
      active_tab: state.active_tab,
      client_id: state.client_id,
      updated_at: new Date().toISOString(),
      active_nodes: state.active_nodes || 1,
      completed_nodes: state.completed_nodes || (state.reasoning_path?.length || 0),
      findings_count: state.findings_count || (state.findings?.length || 0)
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
      const validFindings = Array.isArray(state.findings) 
        ? state.findings.map(f => ({
            source: f.source || "Unknown source",
            content: f.content || "",
            ...f
          }))
        : [];
      
      localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(validFindings));
      const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, state.session_id);
      localStorage.setItem(sessionFindingsKey, JSON.stringify(validFindings));
    }
    
    if (state.answer) {
      const answerCache = {
        query: state.query,
        answer: state.answer,
        sources: state.sources || [],
        reasoning_path: state.reasoning_path || [],
        findings: state.findings || [],
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
      const result = data as ResearchState;
      
      try {
        if (typeof result.findings === 'string') {
          try {
            result.findings = JSON.parse(result.findings);
          } catch (e) {
            console.error("Error parsing findings string from database:", e);
            result.findings = [];
          }
        }
        
        if (!Array.isArray(result.findings)) {
          console.warn("Findings is not an array, converting:", result.findings);
          if (result.findings && typeof result.findings === 'object') {
            result.findings = Object.values(result.findings);
          } else {
            result.findings = [];
          }
        }
        
        result.findings = result.findings.map(finding => {
          if (!finding) return { source: "Unknown source" };
          
          return {
            source: finding.source || "Unknown source",
            content: finding.content || "",
            ...finding
          };
        });
      } catch (e) {
        console.error("Error processing findings:", e);
        result.findings = [];
      }
      
      if (typeof result.human_interactions === 'string') {
        try {
          result.human_interactions = JSON.parse(result.human_interactions);
        } catch (e) {
          console.error("Error parsing human_interactions", e);
          result.human_interactions = [];
        }
      } else if (!result.human_interactions) {
        result.human_interactions = [];
      }
      
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
              result.findings = parsedFindings;
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
  
  return null;
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
        findings: cachedFindings ? JSON.parse(cachedFindings) : [],
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
    const typedItem = item as ResearchState;
    
    if (typeof typedItem.human_interactions === 'string') {
      try {
        typedItem.human_interactions = JSON.parse(typedItem.human_interactions);
      } catch (e) {
        console.error("Error parsing human_interactions", e);
        typedItem.human_interactions = [];
      }
    } else if (!typedItem.human_interactions) {
      typedItem.human_interactions = [];
    }
    
    try {
      const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
      const cachedSessionSources = localStorage.getItem(sessionSourcesKey);
      
      if (cachedSessionSources) {
        const parsedSources = JSON.parse(cachedSessionSources);
        if (Array.isArray(parsedSources) && parsedSources.length > 0) {
          typedItem.sources = parsedSources;
        }
      } else {
        const cachedSources = localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
        if (cachedSources) {
          const parsedSources = JSON.parse(cachedSources);
          if (Array.isArray(parsedSources) && parsedSources.length > 0) {
            typedItem.sources = parsedSources;
          }
        }
      }
    } catch (e) {
      console.error("Error fixing up sources from cache:", e);
    }
    
    if (typedItem.status !== 'in_progress' && 
        typedItem.status !== 'completed' && 
        typedItem.status !== 'error' && 
        typedItem.status !== 'awaiting_human_input') {
      typedItem.status = 'in_progress';
    }
    return typedItem;
  });
  
  return result;
}

export async function getLatestSessionState(sessionId: string): Promise<ResearchState | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      console.error(`[${new Date().toISOString()}] ⚠️ User not authenticated when getting latest session state`);
      throw new Error("User not authenticated");
    }
    
    console.log(`[${new Date().toISOString()}] 🔍 Fetching latest session state for session:`, sessionId, 
      "user:", user.user.id.substring(0, 8));
    
    const { data: sessionData, error: sessionError } = await supabase
      .from('research_states')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (sessionError) {
      console.error(`[${new Date().toISOString()}] ❌ Error fetching latest session state:`, sessionError);
      
      const cachedState = getStateFromLocalStorage("", sessionId, user.user.id);
      if (cachedState) {
        console.log(`[${new Date().toISOString()}] ✅ Found cached state for session:`, sessionId);
        return enhanceStateWithCachedData(cachedState, sessionId);
      }
      
      throw sessionError;
    }
    
    if (sessionData) {
      const result = sessionData as ResearchState;
      
      console.log(`[${new Date().toISOString()}] ✅ Found session state in database:`, {
        id: result.id,
        research_id: result.research_id,
        session_id: result.session_id,
        query: result.query,
        status: result.status
      });
      
      return enhanceStateWithCachedData(result, sessionId);
    } else {
      console.log(`[${new Date().toISOString()}] ⚠️ No database state found for session:`, sessionId);
      
      const cachedState = getStateFromLocalStorage("", sessionId, user.user.id);
      if (cachedState) {
        console.log(`[${new Date().toISOString()}] ✅ Found cached state for session:`, sessionId);
        return enhanceStateWithCachedData(cachedState, sessionId);
      }
      
      console.log(`[${new Date().toISOString()}] ⚠️ Creating minimal fallback state for session:`, sessionId);
      return {
        research_id: "",
        session_id: sessionId,
        user_id: user.user.id,
        status: 'in_progress',
        query: "Unknown query",
        sources: [],
        reasoning_path: [],
        findings: []
      };
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 🔥 Critical error in getLatestSessionState:`, error);
    
    try {
      const sessionAnswerKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.ANSWER_CACHE, sessionId);
      const cachedAnswer = localStorage.getItem(sessionAnswerKey);
      
      if (cachedAnswer) {
        const answerData = JSON.parse(cachedAnswer);
        console.log(`[${new Date().toISOString()}] ✅ Created fallback state from answerCache:`, sessionId);
        return {
          research_id: answerData.research_id || "",
          session_id: sessionId,
          user_id: "unknown",
          status: 'completed',
          query: answerData.query || "Unknown query",
          answer: answerData.answer || "",
          sources: answerData.sources || [],
          reasoning_path: answerData.reasoning_path || [],
          findings: answerData.findings || []
        };
      }
    } catch (e) {
      console.error(`[${new Date().toISOString()}] 💥 Failed to create fallback state:`, e);
    }
    
    return null;
  }
}

function enhanceStateWithCachedData(state: ResearchState, sessionId: string): ResearchState {
  const enhancedState = { ...state };
  
  try {
    if (typeof enhancedState.human_interactions === 'string') {
      enhancedState.human_interactions = JSON.parse(enhancedState.human_interactions as unknown as string);
    } else if (!enhancedState.human_interactions) {
      enhancedState.human_interactions = [];
    }
    
    if (!enhancedState.sources || enhancedState.sources.length === 0) {
      const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
      const cachedSessionSources = localStorage.getItem(sessionSourcesKey) || 
                                  localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
      
      if (cachedSessionSources) {
        const parsedSources = JSON.parse(cachedSessionSources);
        if (Array.isArray(parsedSources) && parsedSources.length > 0) {
          enhancedState.sources = parsedSources;
          console.log(`[${new Date().toISOString()}] 📊 Enhanced state with ${parsedSources.length} cached sources`);
        }
      }
    }
    
    if (!enhancedState.findings || enhancedState.findings.length === 0) {
      const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
      const cachedSessionFindings = localStorage.getItem(sessionFindingsKey) || 
                                    localStorage.getItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE);
      
      if (cachedSessionFindings) {
        const parsedFindings = JSON.parse(cachedSessionFindings);
        if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
          enhancedState.findings = parsedFindings;
          console.log(`[${new Date().toISOString()}] 📊 Enhanced state with ${parsedFindings.length} cached findings`);
        }
      }
    }
    
    if (!enhancedState.reasoning_path || enhancedState.reasoning_path.length === 0) {
      const sessionPathKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, sessionId);
      const cachedSessionPath = localStorage.getItem(sessionPathKey) ||
                               localStorage.getItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE);
      
      if (cachedSessionPath) {
        const parsedPath = JSON.parse(cachedSessionPath);
        if (Array.isArray(parsedPath) && parsedPath.length > 0) {
          enhancedState.reasoning_path = parsedPath;
          console.log(`[${new Date().toISOString()}] 📊 Enhanced state with ${parsedPath.length} cached reasoning steps`);
        }
      }
    }
    
    if (!enhancedState.user_model) {
      const sessionSynthesisKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SYNTHESIS_CACHE, sessionId);
      const cachedSynthesis = localStorage.getItem(sessionSynthesisKey);
      
      if (cachedSynthesis) {
        enhancedState.user_model = JSON.parse(cachedSynthesis);
        console.log(`[${new Date().toISOString()}] 📊 Enhanced state with cached synthesis data`);
      }
    }
    
    if (enhancedState.status !== 'in_progress' && 
        enhancedState.status !== 'completed' && 
        enhancedState.status !== 'error' && 
        enhancedState.status !== 'awaiting_human_input') {
      enhancedState.status = 'completed';
    }
  } catch (e) {
    console.error(`[${new Date().toISOString()}] ⚠️ Error enhancing state with cached data:`, e);
  }
  
  return enhancedState;
}

export { subscribeToResearchState };
