
import { supabase } from "@/integrations/supabase/client";

export type UserModelSourcePriority = {
  url: string;
  priority: number;
};

export interface UserModel {
  id?: string;
  user_id?: string;
  name: string;
  domain: string;
  expertise_level: string;
  cognitive_style: string;
  included_sources?: string[];
  source_priorities?: UserModelSourcePriority[];
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function createUserModel(model: Omit<UserModel, 'user_id'>): Promise<UserModel | null> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error("User not authenticated");
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
  
  return data && data.length > 0 ? data[0] : null;
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
  
  return data || [];
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
  
  return data;
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
  
  return data && data.length > 0 ? data[0] : null;
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
  
  return data;
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
