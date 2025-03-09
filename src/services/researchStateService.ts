
import { supabase } from "@/integrations/supabase/client";

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
  
  return data?.[0] || null;
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
  
  return data?.[0] || null;
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
  
  return data;
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
  
  return data || [];
}
