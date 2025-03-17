
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday, parseISO, subDays, isThisWeek, isThisYear } from "date-fns";

export interface ResearchHistoryEntry {
  id?: string;
  user_id?: string;
  query: string;
  user_model: string;
  use_case: string;
  created_at?: string;
  user_model_id?: string;
}

export interface ResearchHistoryGroup {
  date: string;
  label: string;
  items: ResearchHistoryEntry[];
}

export interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
}

export async function saveResearchHistory(
  entry: Omit<ResearchHistoryEntry, "user_id">
): Promise<ResearchHistoryEntry | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user?.id) {
      console.log("User not authenticated or ID not available");
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

export async function getResearchHistory(limit = 20): Promise<ResearchHistoryEntry[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user?.id) {
      console.log("User not authenticated or ID not available");
      throw new Error("User not authenticated");
    }
    
    const { data, error } = await supabase
      .from("research_history")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    
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

export function groupResearchHistoryByDate(history: ResearchHistoryEntry[]): ResearchHistoryGroup[] {
  // Initialize groups
  const groups: Record<string, ResearchHistoryEntry[]> = {
    "Today": [],
    "This Week": [],
    "This Year": [],
    "Older": []
  };
  
  // Sort history items into groups
  history.forEach(item => {
    if (!item.created_at) return;
    
    const date = parseISO(item.created_at);
    
    if (isToday(date)) {
      groups["Today"].push(item);
    } else if (isThisWeek(date, { weekStartsOn: 1 }) && !isToday(date)) {
      groups["This Week"].push(item);
    } else if (isThisYear(date) && !isThisWeek(date, { weekStartsOn: 1 })) {
      groups["This Year"].push(item);
    } else {
      groups["Older"].push(item);
    }
  });
  
  // Convert to array format and filter out empty groups
  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([label, items]) => ({
      date: label.toLowerCase(),
      label,
      items
    }));
}
