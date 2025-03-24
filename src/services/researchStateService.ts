
import { supabase, getClientId } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface ResearchState {
  id?: string;
  research_id: string;
  session_id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'error';
  query: string;
  answer?: string;
  sources?: string[];
  findings?: Array<{ source: string; content?: string }>;
  reasoning_path?: string[];
  created_at?: string;
  updated_at?: string;
  user_model?: string | Json;
  active_tab?: string; // Added to persist active tab
  error?: string; // Added for error messages
  client_id?: string; // Added to track browser session
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
  
  // Associate this research state with the current browser client
  const clientId = getClientId();
  
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
    client_id: clientId
  };
  
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Attempting to insert research state with user_id:`, user.user.id);
    
    // Include the client_id in the insert operation
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
          if (result.status !== 'in_progress' && result.status !== 'completed' && result.status !== 'error') {
            result.status = 'in_progress'; // Default to 'in_progress' if invalid status
          }
          return result;
        }
      } else {
        throw error;
      }
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Successfully saved research state`);
    
    // Ensure the returned data has the correct status type
    if (data && data.length > 0) {
      const result = data[0] as ResearchState;
      if (result.status !== 'in_progress' && result.status !== 'completed' && result.status !== 'error') {
        result.status = 'in_progress'; // Default to 'in_progress' if invalid status
      }
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
  
  console.log("Updating research state:", { researchId, sessionId, updates });
  
  // Include the client_id in the match criteria to ensure we only update our own research state
  const clientId = getClientId();
  
  // Filter out active_tab if it exists in updates
  const { active_tab, ...otherUpdates } = updates;
  
  // Base updates without active_tab
  const validUpdates = { ...otherUpdates };
  
  // Try with active_tab first if it exists
  if (active_tab !== undefined) {
    try {
      const { data, error } = await supabase
        .from('research_states')
        .update({ ...validUpdates, active_tab })
        .match({ 
          research_id: researchId, 
          session_id: sessionId, 
          user_id: user.user.id,
          client_id: clientId  // Add client_id to match criteria
        })
        .select();
        
      if (error) {
        if (error.message.includes("active_tab")) {
          console.log("active_tab column doesn't exist, trying without it");
          // Fall through to try without active_tab
        } else {
          console.error("Error updating research state:", error);
          throw error;
        }
      } else {
        // If no error, return the result
        // Ensure the returned data has the correct status type
        if (data && data.length > 0) {
          const result = data[0] as ResearchState;
          if (result.status !== 'in_progress' && result.status !== 'completed' && result.status !== 'error') {
            result.status = 'in_progress'; // Default to 'in_progress' if invalid status
          }
          return result;
        }
        return null;
      }
    } catch (error) {
      console.error("Error in update attempt with active_tab:", error);
      // Fall through to try without active_tab
    }
  }
  
  // Try without active_tab if we got here
  const { data, error } = await supabase
    .from('research_states')
    .update(validUpdates)
    .match({ 
      research_id: researchId, 
      session_id: sessionId, 
      user_id: user.user.id,
      client_id: clientId  // Add client_id to match criteria
    })
    .select();
    
  if (error) {
    console.error("Error updating research state:", error);
    throw error;
  }
  
  // Ensure the returned data has the correct status type
  if (data && data.length > 0) {
    const result = data[0] as ResearchState;
    if (result.status !== 'in_progress' && result.status !== 'completed' && result.status !== 'error') {
      result.status = 'in_progress'; // Default to 'in_progress' if invalid status
    }
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
  
  // Include client_id in the match criteria
  const clientId = getClientId();
  
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
    console.error("Error fetching research state:", error);
    throw error;
  }
  
  // Ensure the returned data has the correct status type
  if (data) {
    const result = data as ResearchState;
    if (result.status !== 'in_progress' && result.status !== 'completed' && result.status !== 'error') {
      result.status = 'in_progress'; // Default to 'in_progress' if invalid status
    }
    return result;
  }
  
  return null;
}

// Get all research states for a session
export async function getSessionResearchStates(sessionId: string): Promise<ResearchState[]> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  // Include client_id in the match criteria
  const clientId = getClientId();
  
  const { data, error } = await supabase
    .from('research_states')
    .select('*')
    .match({ 
      session_id: sessionId, 
      user_id: user.user.id,
      client_id: clientId
    })
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching session research states:", error);
    throw error;
  }
  
  // Ensure all returned items have the correct status type
  const result = (data || []).map(item => {
    const typedItem = item as ResearchState;
    if (typedItem.status !== 'in_progress' && typedItem.status !== 'completed' && typedItem.status !== 'error') {
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
    
    // Include client_id in the match criteria
    const clientId = getClientId();
    
    console.log("Fetching latest session state for session:", sessionId, "and user:", user.user.id, "and client:", clientId);
    
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
      console.error("Error fetching latest session state:", error);
      throw error;
    }
    
    if (data) {
      const result = data as ResearchState;
      console.log("Found session state:", result);
      
      if (result.status !== 'in_progress' && result.status !== 'completed' && result.status !== 'error') {
        result.status = 'in_progress'; // Default to 'in_progress' if invalid status
      }
      return result;
    }
    
    console.log("No session state found for session:", sessionId);
    return null;
  } catch (error) {
    console.error("Error in getLatestSessionState:", error);
    return null;
  }
}
