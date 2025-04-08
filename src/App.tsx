import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './components/auth/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from 'sonner';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState } from 'react';
import { Plus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LOCAL_STORAGE_KEYS, getSessionStorageKey, saveSessionData } from '@/lib/constants';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import ResearchPage from './pages/ResearchPage';
import ProfilePage from './pages/ProfilePage';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import UserModelsPage from './pages/UserModelsPage';
import NotFound from './pages/NotFound';
import AnalyticsDebugger from './components/analytics/AnalyticsDebugger';
import './App.css';

// Configure CORS proxy for Modal API
const configureModalApiProxy = () => {
  // This is just setting up a configuration, the actual proxy would need
  // to be set up on the server where this app is hosted
  console.log(`[${new Date().toISOString()}] 🔄 Setting up CORS proxy configuration for Modal API`);
};

const queryClient = new QueryClient();

function SidebarButtons() {
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
}

function AppRoutes() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Configure CORS proxy
    configureModalApiProxy();
    
    // Enable PostHog autocapture for all interactions and clicks
    enableAutocapture();
    
    // Get the last path from local storage on initial load
    const savedPath = localStorage.getItem('lastPath');
    if (savedPath && window.location.pathname === '/') {
      setLastPath(savedPath);
      // Only redirect if explicitly coming from another page
      // Don't redirect if the user is intentionally visiting the root
      const referrer = document.referrer;
      if (referrer && referrer.includes(window.location.host)) {
        setShouldRedirect(true);
      }
    }
    setIsLoading(false);

    // Save current path to localStorage whenever it changes
    const saveCurrentPath = () => {
      const currentPath = window.location.pathname;
      // Only save paths that aren't the root or auth page
      if (currentPath !== '/' && !currentPath.includes('/auth')) {
        console.log(`[${new Date().toISOString()}] 📍 Saving current path:`, currentPath);
        localStorage.setItem('lastPath', currentPath);
        setLastPath(currentPath);
      }
    };

    // Listen for route changes to save the path
    window.addEventListener('beforeunload', saveCurrentPath);
    
    // Also save when routes change within the app
    const handleRouteChange = () => {
      saveCurrentPath();
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    // Manually call once to save the initial path
    saveCurrentPath();
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeunload', saveCurrentPath);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Show nothing while we're determining the redirect
  if (isLoading) {
    return null;
  }

  // Only redirect if we explicitly want to
  if (shouldRedirect && lastPath && lastPath !== '/' && window.location.pathname === '/') {
    console.log(`[${new Date().toISOString()}] 🔄 Redirecting to last path:`, lastPath);
    return <Navigate to={lastPath} replace />;
  }

  return (
    <>
      <SidebarButtons />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/research/:sessionId?" element={<ResearchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/models" element={<UserModelsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <AuthProvider>
          <TooltipProvider>
            <BrowserRouter>
              <AppRoutes />
              <Toaster />
              <SonnerToaster 
                position="top-center" 
                closeButton 
                richColors 
                toastOptions={{
                  duration: 5000,
                  className: "z-[100]"
                }}
              />
              <AnalyticsDebugger />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
