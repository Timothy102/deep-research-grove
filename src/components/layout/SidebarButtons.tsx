
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LOCAL_STORAGE_KEYS, saveSessionData } from '@/lib/constants';

export const SidebarButtons = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE);
    return savedState !== null ? savedState === 'true' : false;
  });

  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent) => {
      setSidebarOpen(event.detail.open);
    };
    
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE, String(newState));
    // Dispatch a custom event that ResearchPage can listen for
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { open: newState } }));
  };

  const handleNewChat = () => {
    try {
      const newSessionId = crypto.randomUUID();
      
      // Clear the current session state from localStorage
      Object.keys(LOCAL_STORAGE_KEYS).forEach(key => {
        const fullKey = LOCAL_STORAGE_KEYS[key as keyof typeof LOCAL_STORAGE_KEYS];
        if (fullKey !== LOCAL_STORAGE_KEYS.SESSION_HISTORY && fullKey !== LOCAL_STORAGE_KEYS.SIDEBAR_STATE) {
          localStorage.removeItem(fullKey);
        }
      });
      
      // Set new session ID
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, newSessionId);
      
      // Create an empty session data structure
      saveSessionData(newSessionId, {
        state: {
          session_id: newSessionId,
          status: 'in_progress',
          query: '',
          created_at: new Date().toISOString()
        },
        sources: [],
        reasoningPath: [],
        findings: []
      });
      
      // Dispatch a custom event that the ResearchPage component can listen for
      window.dispatchEvent(new CustomEvent('new-chat-requested', { 
        detail: { 
          sessionId: newSessionId,
          isNew: true,
          reset: true
        }
      }));
      
      // Show a toast
      toast.success("Created new research session");
      
      // Navigate to the new session
      navigate(`/research/${newSessionId}`);
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast.error("Failed to create new chat. Please try again.");
    }
  };

  // Only show buttons on research page
  if (!location.pathname.includes('/research')) {
    return null;
  }

  return (
    <div className="fixed left-3 bottom-4 flex flex-row items-center z-40 p-2 space-x-3 bg-background/80 backdrop-blur-sm rounded-full shadow-md border">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNewChat}
        className="rounded-full bg-background hover:bg-secondary"
        aria-label="New chat"
      >
        <Plus className="h-5 w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="rounded-full bg-background hover:bg-secondary"
        aria-label="Research history"
      >
        <History className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default SidebarButtons;
