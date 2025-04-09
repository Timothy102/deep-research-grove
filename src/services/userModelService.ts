
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface UserModelSourcePriority {
  url: string;
  priority: number;
  source_type?: string; // Made optional with ?
}

export interface UserModel {
  id?: string;
  user_id: string;
  name: string;
  research_depth: string;
  cognitive_style: string;
  included_sources?: string[];
  source_priorities?: UserModelSourcePriority[] | null;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
  session_id?: string;
}

export const getUserModels = async (): Promise<UserModel[]> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('user_models')
      .select('*')
      .eq('user_id', user.data.user.id);
    
    if (error) {
      console.error('Error fetching user models:', error);
      return [];
    }
    
    return data.map(model => ({
      ...model,
      source_priorities: model.source_priorities ? JSON.parse(model.source_priorities as string) : null
    })) as UserModel[];
  } catch (error) {
    console.error('Error in getUserModels:', error);
    return [];
  }
};

export const createUserModel = async (model: Partial<UserModel>): Promise<UserModel | null> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      toast.error("You must be logged in to create a user model");
      return null;
    }
    
    // Ensure all required fields are present
    const userModelData = {
      user_id: user.data.user.id,
      name: model.name || 'New Research Model',
      research_depth: model.research_depth || 'moderate',
      cognitive_style: model.cognitive_style || 'balanced',
      included_sources: model.included_sources || [],
      is_default: model.is_default || false,
      source_priorities: model.source_priorities ? JSON.stringify(model.source_priorities) : null,
    };
    
    const { data, error } = await supabase
      .from('user_models')
      .insert(userModelData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user model:', error);
      toast.error("Failed to create user model");
      return null;
    }
    
    toast.success("User model created successfully");
    
    return {
      ...data,
      source_priorities: data.source_priorities ? JSON.parse(data.source_priorities as string) : null
    } as UserModel;
  } catch (error) {
    console.error('Error in createUserModel:', error);
    toast.error("An unexpected error occurred while creating the user model");
    return null;
  }
};

export const markOnboardingCompleted = async (): Promise<boolean> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      toast.error("You must be logged in to update your profile");
      return false;
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.data.user.id);
    
    if (error) {
      console.error('Error updating onboarding status:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in markOnboardingCompleted:', error);
    return false;
  }
};

export const getDefaultUserModel = async (): Promise<UserModel | null> => {
  try {
    const models = await getUserModels();
    
    const defaultModel = models.find(model => model.is_default);
    
    if (defaultModel) {
      return defaultModel;
    }
    
    if (models.length > 0) {
      return models[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error in getDefaultUserModel:', error);
    return null;
  }
};

export const getUserModelById = async (id: string): Promise<UserModel | null> => {
  try {
    const { data, error } = await supabase
      .from('user_models')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching user model by id:', error);
      return null;
    }
    
    return {
      ...data,
      source_priorities: data.source_priorities ? JSON.parse(data.source_priorities as string) : null
    } as UserModel;
  } catch (error) {
    console.error('Error in getUserModelById:', error);
    return null;
  }
};

export const updateUserModel = async (model: UserModel): Promise<UserModel | null> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      toast.error("You must be logged in to update a user model");
      return null;
    }
    
    // Prepare the model data for update, making sure to properly handle source_priorities
    const userModelData = {
      name: model.name,
      research_depth: model.research_depth,
      cognitive_style: model.cognitive_style,
      included_sources: model.included_sources || [],
      is_default: model.is_default || false,
      source_priorities: model.source_priorities ? JSON.stringify(model.source_priorities) : null,
      updated_at: new Date().toISOString()
    };
    
    // Make sure we have the ID
    if (!model.id) {
      toast.error("Model ID is required for update");
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_models')
      .update(userModelData)
      .eq('id', model.id)
      .eq('user_id', user.data.user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user model:', error);
      toast.error("Failed to update user model");
      return null;
    }
    
    toast.success("User model updated successfully");
    
    return {
      ...data,
      source_priorities: data.source_priorities ? JSON.parse(data.source_priorities as string) : null
    } as UserModel;
  } catch (error) {
    console.error('Error in updateUserModel:', error);
    toast.error("An unexpected error occurred while updating the user model");
    return null;
  }
};

export const deleteUserModel = async (id: string): Promise<boolean> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      toast.error("You must be logged in to delete a user model");
      return false;
    }
    
    const { error } = await supabase
      .from('user_models')
      .delete()
      .eq('id', id)
      .eq('user_id', user.data.user.id);
    
    if (error) {
      console.error('Error deleting user model:', error);
      toast.error("Failed to delete user model");
      return false;
    }
    
    toast.success("User model deleted successfully");
    return true;
  } catch (error) {
    console.error('Error in deleteUserModel:', error);
    toast.error("An unexpected error occurred while deleting the user model");
    return false;
  }
};

export const setDefaultUserModel = async (id: string): Promise<boolean> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      toast.error("You must be logged in to set a default user model");
      return false;
    }
    
    // First, unset default from all models
    const { error: resetError } = await supabase
      .from('user_models')
      .update({ is_default: false })
      .eq('user_id', user.data.user.id);
    
    if (resetError) {
      console.error('Error resetting default user models:', resetError);
      toast.error("Failed to set default user model");
      return false;
    }
    
    // Then set the new default
    const { error } = await supabase
      .from('user_models')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', user.data.user.id);
    
    if (error) {
      console.error('Error setting default user model:', error);
      toast.error("Failed to set default user model");
      return false;
    }
    
    toast.success("Default user model set successfully");
    return true;
  } catch (error) {
    console.error('Error in setDefaultUserModel:', error);
    toast.error("An unexpected error occurred while setting the default user model");
    return false;
  }
};

export const generateUserModel = async (prompt: string): Promise<UserModel | null> => {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      toast.error("You must be logged in to generate a user model");
      return null;
    }
    
    const modelId = uuidv4();
    
    // TODO: Implement AI generation of user model based on prompt
    // For now, create a basic model
    
    const userModelData: UserModel = {
      id: modelId,
      user_id: user.data.user.id,
      name: `Model from prompt: ${prompt.substring(0, 20)}...`,
      research_depth: 'moderate',
      cognitive_style: prompt,
      included_sources: [],
      source_priorities: [],
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return await createUserModel(userModelData);
  } catch (error) {
    console.error('Error in generateUserModel:', error);
    toast.error("An unexpected error occurred while generating the user model");
    return null;
  }
};
