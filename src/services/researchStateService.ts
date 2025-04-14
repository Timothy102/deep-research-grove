
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface ResearchState {
  id?: string;
  research_id: string;
  session_id: string;
  status: 'in_progress' | 'completed' | 'error' | 'awaiting_human_input';
  query?: string;
  answer?: string;
  sources?: string[];
  findings?: any[];
  reasoning_path?: string[];
  user_model?: string;
  active_tab?: string;
  client_id?: string;
  error?: string;
  human_interactions?: any;
  report_data?: any;
  completed_nodes?: number; 
  created_at?: string;
  updated_at?: string;
  user_id?: string; // Added user_id as optional to match database requirements
}

export async function saveResearchState(state: Partial<ResearchState>): Promise<ResearchState> {
  try {
    console.log(`[${new Date().toISOString()}] 💾 Saving research state for session:`, state.session_id);
    
    // Make sure we have a user_id value, even if it's null
    // Also ensure query has a default value if not provided to satisfy the database requirement
    const stateWithRequiredFields = {
      ...state,
      user_id: state.user_id || null,
      query: state.query || 'No query provided' // Provide a default value for query
    };
    
    const { data, error } = await supabase
      .from('research_states')
      .insert(stateWithRequiredFields)
      .select()
      .single();
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error saving research state:`, error);
      throw new Error(`Failed to save research state: ${error.message}`);
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Research state saved successfully`);
    return data as ResearchState;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in saveResearchState:`, error);
    throw error;
  }
}

export async function updateResearchState(
  researchId: string, 
  sessionId: string, 
  updates: Partial<ResearchState>
): Promise<ResearchState> {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Updating research state:`, { 
      researchId, 
      sessionId, 
      updates: Object.keys(updates) 
    });
    
    const { data, error } = await supabase
      .from('research_states')
      .update(updates)
      .match({ research_id: researchId, session_id: sessionId })
      .select()
      .single();
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error updating research state:`, error);
      throw new Error(`Failed to update research state: ${error.message}`);
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Research state updated successfully`);
    return data as ResearchState;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in updateResearchState:`, error);
    throw error;
  }
}

export async function getResearchState(
  researchId: string, 
  sessionId: string
): Promise<ResearchState | null> {
  try {
    console.log(`[${new Date().toISOString()}] 🔍 Getting research state:`, { researchId, sessionId });
    
    const { data, error } = await supabase
      .from('research_states')
      .select('*')
      .match({ research_id: researchId, session_id: sessionId })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.log(`[${new Date().toISOString()}] ℹ️ No research state found for:`, { researchId, sessionId });
        return null;
      }
      
      console.error(`[${new Date().toISOString()}] ❌ Error getting research state:`, error);
      throw new Error(`Failed to get research state: ${error.message}`);
    }
    
    return data as ResearchState;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in getResearchState:`, error);
    throw error;
  }
}

export async function getLatestSessionState(sessionId: string): Promise<ResearchState | null> {
  try {
    console.log(`[${new Date().toISOString()}] 🔍 Getting latest session state for:`, sessionId);
    
    const { data, error } = await supabase
      .from('research_states')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error getting latest session state:`, error);
      throw new Error(`Failed to get latest session state: ${error.message}`);
    }
    
    if (!data) {
      console.log(`[${new Date().toISOString()}] ℹ️ No session state found for:`, sessionId);
      return null;
    }
    
    return data as ResearchState;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in getLatestSessionState:`, error);
    throw error;
  }
}

export function subscribeToResearchState(
  researchId: string, 
  sessionId: string,
  callback: (payload: any) => void
) {
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Setting up subscription for:`, { researchId, sessionId });
    
    const channel = supabase
      .channel(`research-${researchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'research_states',
        filter: `research_id=eq.${researchId}`,
      }, (payload) => {
        console.log(`[${new Date().toISOString()}] 📬 Received update for research:`, researchId);
        callback({
          eventType: payload.eventType,
          data: payload.new,
          timestamp: new Date().toISOString()
        });
      })
      .subscribe();
    
    console.log(`[${new Date().toISOString()}] ✅ Subscription set up successfully`);
    
    return channel;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error setting up subscription:`, error);
    throw error;
  }
}
