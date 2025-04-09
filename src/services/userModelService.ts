import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export interface UserModelSourcePriority {
  url: string;
  priority: number;
}

export interface UserModel {
  user_id: string;
  id?: string;
  name: string;
  research_depth: string;
  cognitive_style: string;
  included_sources?: string[];
  source_priorities?: UserModelSourcePriority[];
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
  session_id?: string;
}

export const defaultUserModel: UserModel = {
  user_id: '',
  name: 'Default Research Assistant',
  research_depth: 'moderate',
  cognitive_style: 'balanced',
  included_sources: [],
  source_priorities: [],
  is_default: true
};

export async function createUserModel(model: Partial<UserModel>): Promise<UserModel | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      toast.error('You need to be signed in to create a user model');
      return null;
    }
    
    const userModelData = {
      ...model,
      user_id: user.user.id,
      source_priorities: model.source_priorities ? JSON.stringify(model.source_priorities) : null
    };
    
    if ('session_id' in userModelData) {
      delete userModelData.session_id;
    }
    
    const { data, error } = await supabase
      .from('user_models')
      .insert(userModelData)
      .select();
      
    if (error) {
      console.error('Error creating user model:', error);
      toast.error(`Failed to create user model: ${error.message}`);
      return null;
    }
    
    if (data && data.length > 0) {
      toast.success('User model created successfully');
      return transformUserModel(data[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Error in createUserModel:', error);
    toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function getUserModels(): Promise<UserModel[]> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      console.warn('User not authenticated when getting user models');
      return [defaultUserModel];
    }
    
    const { data, error } = await supabase
      .from('user_models')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching user models:', error);
      toast.error(`Failed to fetch user models: ${error.message}`);
      return [defaultUserModel];
    }
    
    if (!data || data.length === 0) {
      return [defaultUserModel];
    }
    
    return data.map(transformUserModel);
  } catch (error) {
    console.error('Error in getUserModels:', error);
    toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
    return [defaultUserModel];
  }
}

export async function getUserModelById(id: string): Promise<UserModel | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      console.warn('User not authenticated when getting user model by ID');
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_models')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.user.id)
      .maybeSingle();
      
    if (error) {
      console.error(`Error fetching user model with ID ${id}:`, error);
      toast.error(`Failed to fetch user model: ${error.message}`);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    return transformUserModel(data);
  } catch (error) {
    console.error('Error in getUserModelById:', error);
    toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function updateUserModel(model: UserModel): Promise<UserModel | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      toast.error('You need to be signed in to update a user model');
      return null;
    }
    
    if (!model.id) {
      toast.error('Cannot update user model without an ID');
      return null;
    }
    
    const userModelData = {
      ...model,
      user_id: user.user.id,
      source_priorities: model.source_priorities ? JSON.stringify(model.source_priorities) : null,
      updated_at: new Date().toISOString()
    };
    
    if ('session_id' in userModelData) {
      delete userModelData.session_id;
    }
    
    const { data, error } = await supabase
      .from('user_models')
      .update(userModelData)
      .eq('id', model.id)
      .eq('user_id', user.user.id)
      .select();
      
    if (error) {
      console.error('Error updating user model:', error);
      toast.error(`Failed to update user model: ${error.message}`);
      return null;
    }
    
    if (data && data.length > 0) {
      toast.success('User model updated successfully');
      return transformUserModel(data[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Error in updateUserModel:', error);
    toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function deleteUserModel(id: string): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      toast.error('You need to be signed in to delete a user model');
      return false;
    }
    
    const { error } = await supabase
      .from('user_models')
      .delete()
      .eq('id', id)
      .eq('user_id', user.user.id);
      
    if (error) {
      console.error(`Error deleting user model with ID ${id}:`, error);
      toast.error(`Failed to delete user model: ${error.message}`);
      return false;
    }
    
    toast.success('User model deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteUserModel:', error);
    toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

export async function setDefaultUserModel(id: string): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      toast.error('You need to be signed in to set a default user model');
      return false;
    }
    
    const { error: resetError } = await supabase
      .from('user_models')
      .update({ is_default: false })
      .eq('user_id', user.user.id);
      
    if (resetError) {
      console.error('Error resetting default user models:', resetError);
      toast.error(`Failed to update default user model: ${resetError.message}`);
      return false;
    }
    
    const { error } = await supabase
      .from('user_models')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', user.user.id);
      
    if (error) {
      console.error(`Error setting default user model with ID ${id}:`, error);
      toast.error(`Failed to set default user model: ${error.message}`);
      return false;
    }
    
    toast.success('Default user model updated successfully');
    return true;
  } catch (error) {
    console.error('Error in setDefaultUserModel:', error);
    toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

export async function markOnboardingCompleted(): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      toast.error('You need to be signed in to update onboarding status');
      return false;
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.user.id);
      
    if (error) {
      console.error('Error updating onboarding status:', error);
      toast.error(`Failed to update onboarding status: ${error.message}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in markOnboardingCompleted:', error);
    toast.error(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function transformUserModel(dbModel: any): UserModel {
  let sourcePriorities: UserModelSourcePriority[] | undefined;
  
  if (dbModel.source_priorities) {
    try {
      if (typeof dbModel.source_priorities === 'string') {
        sourcePriorities = JSON.parse(dbModel.source_priorities);
      } else {
        sourcePriorities = dbModel.source_priorities as UserModelSourcePriority[];
      }
    } catch (e) {
      console.error('Error parsing source_priorities:', e);
      sourcePriorities = [];
    }
  }
  
  return {
    id: dbModel.id,
    user_id: dbModel.user_id,
    name: dbModel.name,
    research_depth: dbModel.research_depth,
    cognitive_style: dbModel.cognitive_style,
    included_sources: dbModel.included_sources || [],
    source_priorities: sourcePriorities || [],
    is_default: dbModel.is_default || false,
    created_at: dbModel.created_at,
    updated_at: dbModel.updated_at
  };
}
