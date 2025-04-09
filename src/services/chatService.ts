
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  session_id: string;
  research_id?: string;
  content: string;
  sender: 'user' | 'ai';
  created_at: string;
}

/**
 * Process a user message and generate an AI response
 * This is a simplified local implementation
 */
export async function processUserMessage(
  message: string,
  sessionId: string,
  researchId?: string,
  context?: string
): Promise<string> {
  console.log(`[${new Date().toISOString()}] 💬 Processing chat message:`, {
    message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
    sessionId,
    researchId
  });
  
  // Store the user message (this is disabled since we're using localStorage for now)
  // await storeChatMessage({
  //   id: uuidv4(),
  //   session_id: sessionId,
  //   research_id: researchId,
  //   content: message,
  //   sender: 'user',
  //   created_at: new Date().toISOString()
  // });
  
  // Basic response generation logic - this would be replaced with a real AI API call
  let response = '';

  // Simple pattern matching for demonstration
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    response = "Hello! I'm your research assistant. How can I help you today?";
  } else if (message.toLowerCase().includes('source') || message.toLowerCase().includes('reference')) {
    response = "I can help you analyze your sources. Would you like me to summarize them or explain how they support your research?";
  } else if (message.toLowerCase().includes('find') || message.toLowerCase().includes('search')) {
    response = "I can help you find information on your topic. What specific details are you looking for?";
  } else if (message.toLowerCase().includes('summary') || message.toLowerCase().includes('summarize')) {
    response = "I'd be happy to summarize your research findings. Which aspect would you like me to focus on?";
  } else if (message.toLowerCase().includes('explain') || message.toLowerCase().includes('clarify')) {
    response = "I'll explain that for you. Could you specify which part of the research you'd like me to clarify?";
  } else {
    response = "I understand you're interested in this topic. To help you better, could you provide more details about what you're looking for?";
  }
  
  // Add a short delay to simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Store the AI response (this is disabled since we're using localStorage for now)
  // await storeChatMessage({
  //   id: uuidv4(),
  //   session_id: sessionId,
  //   research_id: researchId,
  //   content: response,
  //   sender: 'ai',
  //   created_at: new Date().toISOString()
  // });
  
  return response;
}

/**
 * Store a chat message in the database (this function is not used yet)
 */
export async function storeChatMessage(message: ChatMessage): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message);
      
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error storing chat message:`, error);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in storeChatMessage:`, error);
  }
}

/**
 * Get chat messages for a session
 */
export async function getChatMessagesForSession(sessionId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error getting chat messages:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in getChatMessagesForSession:`, error);
    return [];
  }
}
