
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ResearchChatProps {
  sessionId: string;
  researchId?: string;
  onSendMessage?: (message: string) => Promise<string>;
  className?: string;
}

const ResearchChat: React.FC<ResearchChatProps> = ({
  sessionId,
  researchId,
  onSendMessage,
  className
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Load previous messages from localStorage
  useEffect(() => {
    if (sessionId) {
      try {
        const savedMessages = localStorage.getItem(`chat_messages_${sessionId}`);
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          // Convert string timestamps back to Date objects
          const formattedMessages = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(formattedMessages);
        } else {
          // Add welcome message for new chats
          const welcomeMessage: ChatMessage = {
            id: 'welcome',
            content: 'How can I help with your research today?',
            sender: 'ai',
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
          localStorage.setItem(`chat_messages_${sessionId}`, JSON.stringify([welcomeMessage]));
        }
      } catch (error) {
        console.error('Error loading chat messages:', error);
      }
    }
  }, [sessionId]);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem(`chat_messages_${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let aiResponse = 'I\'m processing your request...';
      
      if (onSendMessage) {
        aiResponse = await onSendMessage(inputValue);
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: 'Sorry, there was an error processing your message. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn('flex flex-col h-full rounded-lg border', className)}>
      <div className="p-3 border-b bg-muted/20">
        <h3 className="font-medium">Research Assistant</h3>
        <p className="text-xs text-muted-foreground">
          Ask questions about your research or get help analyzing results
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-4 max-h-[calc(100vh-300px)]" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex flex-col max-w-[80%] rounded-lg p-3 animate-in slide-in-from-bottom-2',
                message.sender === 'user' 
                  ? 'ml-auto bg-primary text-primary-foreground' 
                  : 'bg-muted'
              )}
            >
              <div className="flex items-center space-x-2 mb-1">
                {message.sender === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                <span className="text-xs font-medium">
                  {message.sender === 'user' ? 'You' : 'Assistant'}
                </span>
                <span className="text-xs opacity-70">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce delay-100">●</span>
                <span className="animate-bounce delay-200">●</span>
              </div>
              <span>Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t mt-auto">
        <div className="flex space-x-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="resize-none min-h-[60px]"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={!inputValue.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResearchChat;
