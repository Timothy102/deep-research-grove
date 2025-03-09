
import { supabase } from "@/integrations/supabase/client";
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
}

// Save initial research state
export async function saveResearchState(state: Omit<ResearchState, 'user_id'>): Promise<ResearchState | null> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from('research_states')
    .insert({
      ...state,
      user_id: user.user.id
    })
    .select();
    
  if (error) {
    console.error("Error saving research state:", error);
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
  
  const { data, error } = await supabase
    .from('research_states')
    .update(updates)
    .match({ research_id: researchId, session_id: sessionId, user_id: user.user.id })
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
  
  const { data, error } = await supabase
    .from('research_states')
    .select('*')
    .match({ research_id: researchId, session_id: sessionId, user_id: user.user.id })
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
  
  const { data, error } = await supabase
    .from('research_states')
    .select('*')
    .match({ session_id: sessionId, user_id: user.user.id })
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

// Get the latest research state for a session (this is a new function)
export async function getLatestSessionState(sessionId: string): Promise<ResearchState | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      throw new Error("User not authenticated");
    }
    
    console.log("Fetching latest session state for session:", sessionId, "and user:", user.user.id);
    
    const { data, error } = await supabase
      .from('research_states')
      .select('*')
      .match({ session_id: sessionId, user_id: user.user.id })
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
