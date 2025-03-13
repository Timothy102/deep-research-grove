
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

export interface ResearchSession {
  id: string;
  query: string;
  output?: string;
  reasoning_path?: string[];
  sources?: any[];
  human_approval_requested?: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  created_at?: string;
  updated_at?: string;
}

export interface ResearchOptions {
  userModel: string;
  useCase: string;
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

/**
 * Get a research session by ID
 */
export async function getResearchSession(id: string): Promise<ResearchSession> {
  // This is a placeholder implementation - replace with actual API call
  console.log(`Getting research session ${id}`);
  
  // Simulating API response
  return {
    id,
    query: "Sample research query",
    output: "Sample research output",
    reasoning_path: ["Initial research", "Finding sources", "Analyzing data", "Drawing conclusions"],
    sources: ["https://example.com/source1", "https://example.com/source2"],
    human_approval_requested: false,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Start a new research session
 */
export async function startResearch(query: string, options?: Partial<ResearchOptions>): Promise<ResearchSession>;
export async function startResearch(id: string, query: string, options?: Partial<ResearchOptions>): Promise<ResearchSession>;
export async function startResearch(...args: any[]): Promise<ResearchSession> {
  let id: string;
  let query: string;
  let options: Partial<ResearchOptions> = {};
  
  // Handle different argument patterns
  if (args.length === 1) {
    // Only query provided, generate ID
    id = crypto.randomUUID();
    query = args[0];
  } else if (args.length === 2) {
    if (typeof args[1] === 'string') {
      // ID and query provided
      id = args[0];
      query = args[1];
    } else {
      // Query and options provided
      id = crypto.randomUUID();
      query = args[0];
      options = args[1] || {};
    }
  } else if (args.length >= 3) {
    // ID, query, and options provided
    id = args[0];
    query = args[1];
    options = args[2] || {};
  } else {
    throw new Error("Invalid arguments for startResearch");
  }
  
  // This is a placeholder implementation - replace with actual API call
  console.log(`Starting research session ${id} with query: ${query}`);
  console.log('Options:', options);
  
  // Simulating API response
  return {
    id,
    query,
    status: 'in_progress',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
