
import { supabase } from "@/integrations/supabase/client";
import { isSameDay, isSameWeek, isSameMonth, isSameYear, format, subDays } from "date-fns";

export interface ResearchHistoryEntry {
  id?: string;
  user_id: string;
  query: string;
  user_model?: string;
  use_case?: string;
  model?: string;
  user_model_id?: string;
  created_at?: string;
}

export type ResearchHistoryGroup = {
  label: string;
  items: ResearchHistoryEntry[];
};

export async function saveResearchHistory(researchData: Omit<ResearchHistoryEntry, 'user_id'>) {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  // Ensure user_model has session_id if it exists as a JSON string
  if (researchData.user_model && typeof researchData.user_model === 'string') {
    try {
      const userModel = JSON.parse(researchData.user_model);
      if (!userModel.session_id && userModel.session_id !== null) {
        // If there's no session_id, add a default one
        console.warn("No session_id found in user_model, will be added by server");
      }
      // No need to modify, it will be handled by the server
    } catch (e) {
      console.error("Error parsing user_model:", e);
    }
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

// Get research history for a specific session
export async function getSessionResearchHistory(sessionId: string) {
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
  
  // Filter to only include items from the specified session
  return (data || []).filter(item => {
    try {
      if (item.user_model) {
        const userModel = JSON.parse(item.user_model);
        return userModel.session_id === sessionId;
      }
    } catch (e) {
      console.error("Error parsing user_model:", e);
    }
    return false;
  });
}

export function groupResearchHistoryByDate(historyItems: ResearchHistoryEntry[]): ResearchHistoryGroup[] {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const oneWeekAgo = subDays(today, 7);
  const oneMonthAgo = subDays(today, 30);
  
  // Initialize groups
  const groups: ResearchHistoryGroup[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 Days", items: [] },
    { label: "Previous 30 Days", items: [] },
    { label: "Older", items: [] }
  ];
  
  // Sort items into groups
  historyItems.forEach(item => {
    if (!item.created_at) return;
    
    const itemDate = new Date(item.created_at);
    
    if (isSameDay(itemDate, today)) {
      groups[0].items.push(item);
    } else if (isSameDay(itemDate, yesterday)) {
      groups[1].items.push(item);
    } else if (itemDate >= oneWeekAgo && itemDate < yesterday) {
      groups[2].items.push(item);
    } else if (itemDate >= oneMonthAgo && itemDate < oneWeekAgo) {
      groups[3].items.push(item);
    } else {
      groups[4].items.push(item);
    }
  });
  
  // Filter out empty groups
  return groups.filter(group => group.items.length > 0);
}

// Additional helper to group history by months/years
export function groupResearchHistoryByMonthYear(historyItems: ResearchHistoryEntry[]): ResearchHistoryGroup[] {
  const groups: Record<string, ResearchHistoryEntry[]> = {};
  
  historyItems.forEach(item => {
    if (!item.created_at) return;
    
    const itemDate = new Date(item.created_at);
    const monthYear = format(itemDate, 'MMMM yyyy');
    
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    
    groups[monthYear].push(item);
  });
  
  return Object.entries(groups).map(([label, items]) => ({
    label,
    items
  }));
}
