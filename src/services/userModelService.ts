import { supabase } from "@/integrations/supabase/client";

export type UserModelSourcePriority = {
  url: string;
  priority: number;
  source_type?: string;
};

export interface UserModel {
  id?: string;
  user_id?: string;
  name: string;
  domain: string;  // Making domain required to match Supabase's requirements
  expertise_level: string;
  research_depth: string; // shallow, moderate, deep
  cognitive_style: string;
  included_sources?: string[];
  source_priorities?: UserModelSourcePriority[];
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Helper function to parse JSON safely
const parseJson = <T>(jsonString: string | null | undefined, fallback: T): T => {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error("Error parsing JSON:", e);
    return fallback;
  }
};

// Helper function to parse a UserModel from the database
const parseUserModel = (data: any): UserModel => {
  if (!data) return {} as UserModel;
  
  return {
    ...data,
    // Ensure source_priorities is properly parsed from JSON if it's a string
    source_priorities: typeof data.source_priorities === 'string' 
      ? parseJson<UserModelSourcePriority[]>(data.source_priorities, [])
      : data.source_priorities || [],
    // Ensure included_sources is always an array
    included_sources: data.included_sources || []
  };
};

export async function createUserModel(model: Omit<UserModel, 'user_id'>): Promise<UserModel | null> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  // Ensure all required fields are present
  if (!model.domain) {
    throw new Error("Domain is required");
  }
  
  const { data, error } = await supabase
    .from('user_models')
    .insert({
      ...model,
      user_id: user.user.id
    })
    .select();
    
  if (error) {
    console.error("Error creating user model:", error);
    throw error;
  }
  
  return data && data.length > 0 ? parseUserModel(data[0]) : null;
}

export async function getUserModels(): Promise<UserModel[]> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from('user_models')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching user models:", error);
    throw error;
  }
  
  return (data || []).map(model => parseUserModel(model));
}

export async function getUserModelById(id: string): Promise<UserModel | null> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from('user_models')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.user.id)
    .maybeSingle();
    
  if (error) {
    console.error("Error fetching user model:", error);
    throw error;
  }
  
  return data ? parseUserModel(data) : null;
}

export async function updateUserModel(id: string, updates: Partial<UserModel>): Promise<UserModel | null> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from('user_models')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.user.id)
    .select();
    
  if (error) {
    console.error("Error updating user model:", error);
    throw error;
  }
  
  return data && data.length > 0 ? parseUserModel(data[0]) : null;
}

export async function deleteUserModel(id: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const { error } = await supabase
    .from('user_models')
    .delete()
    .eq('id', id)
    .eq('user_id', user.user.id);
    
  if (error) {
    console.error("Error deleting user model:", error);
    throw error;
  }
}

export async function setDefaultUserModel(id: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  // First remove default status from all models
  const { error: clearError } = await supabase
    .from('user_models')
    .update({ is_default: false })
    .eq('user_id', user.user.id);
    
  if (clearError) {
    console.error("Error clearing default status:", clearError);
    throw clearError;
  }
  
  // Set the new default model
  const { error } = await supabase
    .from('user_models')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', user.user.id);
    
  if (error) {
    console.error("Error setting default user model:", error);
    throw error;
  }
}

export async function getDefaultUserModel(): Promise<UserModel | null> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from('user_models')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('is_default', true)
    .maybeSingle();
    
  if (error) {
    console.error("Error fetching default user model:", error);
    throw error;
  }
  
  return data ? parseUserModel(data) : null;
}

export async function updateUserOnboardingStatus(completed: boolean): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: completed })
    .eq('id', user.user.id);
    
  if (error) {
    console.error("Error updating onboarding status:", error);
    throw error;
  }
}

export async function getUserOnboardingStatus(): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.user.id)
    .maybeSingle();
    
  if (error) {
    console.error("Error fetching onboarding status:", error);
    throw error;
  }
  
  return data?.onboarding_completed || false;
}

// Add new function to mark onboarding as completed
export const markOnboardingCompleted = async (): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      throw new Error("No authenticated user found");
    }
    
    // Update the onboarding_completed field in the profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userData.user.id);
      
    if (error) {
      throw error;
    }
      
    console.log("Onboarding marked as completed");
  } catch (error) {
    console.error("Error marking onboarding as completed:", error);
    throw error;
  }
};
