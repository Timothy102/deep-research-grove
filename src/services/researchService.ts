
import { supabase } from "@/integrations/supabase/client";

export interface ResearchHistoryEntry {
  id?: string;
  user_id: string;
  query: string;
  user_model?: string;
  use_case?: string;
  model?: string;
  created_at?: string;
}

export async function saveResearchHistory(researchData: Omit<ResearchHistoryEntry, 'user_id'>) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from('research_history')
    .insert({
      user_id: user.user.id,
      ...researchData
    })
    .select();
    
  if (error) {
    console.error("Error saving research history:", error);
    throw error;
  }
  
  return data;
}

export async function getResearchHistory() {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from('research_history')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching research history:", error);
    throw error;
  }
  
  return data || [];
}
