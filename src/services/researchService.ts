
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isToday, isYesterday, parseISO } from "date-fns";

export interface ResearchHistoryEntry {
  id?: string;
  user_id?: string;
  query: string;
  user_model: string;
  use_case: string;
  created_at?: string;
  user_model_id?: string;
}

export async function saveResearchHistory(
  entry: Omit<ResearchHistoryEntry, "user_id">
): Promise<ResearchHistoryEntry | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      throw new Error("User not authenticated");
    }
    
    const { data, error } = await supabase
      .from("research_history")
      .insert({
        ...entry,
        user_id: userData.user.id
      })
      .select();
    
    if (error) {
      console.error("Error saving research history:", error);
      throw error;
    }
    
    return data && data.length > 0 ? data[0] as ResearchHistoryEntry : null;
  } catch (error) {
    console.error("Error in saveResearchHistory:", error);
    throw error;
  }
}

export async function getResearchHistory(): Promise<ResearchHistoryEntry[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      throw new Error("User not authenticated");
    }
    
    const { data, error } = await supabase
      .from("research_history")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching research history:", error);
      throw error;
    }
    
    return data as ResearchHistoryEntry[];
  } catch (error) {
    console.error("Error in getResearchHistory:", error);
    throw error;
  }
}

export function formatHistoryDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return "Today";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMMM d, yyyy");
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Unknown date";
  }
}

export function groupResearchHistoryByDate(history: ResearchHistoryEntry[]): any[] {
  const groupedHistory = history.reduce((groups: any, item) => {
    if (!item.created_at) return groups;
    
    const dateString = formatHistoryDate(item.created_at);
    
    if (!groups[dateString]) {
      groups[dateString] = [];
    }
    
    groups[dateString].push(item);
    return groups;
  }, {});
  
  return Object.keys(groupedHistory).map(date => ({
    date,
    items: groupedHistory[date]
  }));
}
