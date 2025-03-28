
import { supabase, getClientId } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface ResearchState {
  id?: string;
  research_id: string;
  session_id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'error' | 'awaiting_human_input';
  query: string;
  answer?: string;
  sources?: string[];
  findings?: Array<{ source: string; content?: string }>;
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
  
  // Filter out properties that might not exist in the table schema
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
    human_interactions: JSON.stringify(state.human_interactions)
  };
  
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Attempting to insert research state with user_id:`, user.user.id, "and client_id:", clientId);
    
    // Always include the client_id in every operation
    const { data, error } = await supabase
      .from('research_states')
      .insert({...validState, client_id: clientId})
      .select();
      
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error saving research state:`, error);
      
      // Try with active_tab if it exists in state
      if (state.active_tab && error.message.includes("violates not-null constraint")) {
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
          return result;
        }
      } else {
        throw error;
      }
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Successfully saved research state`);
    
    if (data && data.length > 0) {
      const result = data[0] as ResearchState;
      return result;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 🔥 Critical error saving research state:`, error);
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
    
    // Convert human_interactions array to JSON string for storage
    if (updates.human_interactions) {
      (updates as any).human_interactions = JSON.stringify(updates.human_interactions);
    }
  } catch (error) {
    console.error("Error getting current state for human interaction updates", error);
  }
  
  // Filter out active_tab if it exists in updates
  const { active_tab, ...otherUpdates } = updates;
  
  // Base updates without active_tab
  const validUpdates = { ...otherUpdates };
  
  // Try with active_tab first if it exists
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
          // Fall through to try without active_tab
        } else {
          console.error(`[${new Date().toISOString()}] ❌ Error updating research state:`, error);
          throw error;
        }
      } else {
        // If no error, return the result
        if (data && data.length > 0) {
          const result = data[0] as ResearchState;
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
    throw error;
  }
  
  if (data && data.length > 0) {
    const result = data[0] as ResearchState;
    return result;
  }
  
  return null;
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
    throw error;
  }
  
  // Ensure the returned data has the correct status type
  if (data) {
    const result = data as ResearchState;
    
    // Convert human_interactions back from JSON string
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
    
    if (result.status !== 'in_progress' && 
        result.status !== 'completed' && 
        result.status !== 'error' && 
        result.status !== 'awaiting_human_input') {
      result.status = 'in_progress'; // Default to 'in_progress' if invalid status
    }
    return result;
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
    const typedItem = item as ResearchState;
    
    // Convert human_interactions back from JSON string
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
    
    if (typedItem.status !== 'in_progress' && 
        typedItem.status !== 'completed' && 
        typedItem.status !== 'error' && 
        typedItem.status !== 'awaiting_human_input') {
      typedItem.status = 'in_progress'; // Default to 'in_progress' if invalid status
    }
    return typedItem;
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
      throw error;
    }
    
    if (data) {
      const result = data as ResearchState;
      console.log(`[${new Date().toISOString()}] ✅ Found session state:`, {
        id: result.id,
        research_id: result.research_id,
        status: result.status,
        clientId: result.client_id
      });
      
      // Convert human_interactions back from JSON string
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
      
      if (result.status !== 'in_progress' && 
          result.status !== 'completed' && 
          result.status !== 'error' && 
          result.status !== 'awaiting_human_input') {
        result.status = 'in_progress'; // Default to 'in_progress' if invalid status
      }
      return result;
    }
    
    console.log(`[${new Date().toISOString()}] ℹ️ No session state found for session:`, sessionId);
    return null;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 🔥 Error in getLatestSessionState:`, error);
    return null;
  }
}
