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
import { LOCAL_STORAGE_KEYS, getSessionStorageKey, saveSessionData, getSessionData } from '@/lib/constants';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

const configureModalApiProxy = () => {
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
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { open: newState } }));
  };

  const handleNewChat = () => {
    try {
      const newSessionId = crypto.randomUUID();
      
      Object.keys(LOCAL_STORAGE_KEYS).forEach(key => {
        const fullKey = LOCAL_STORAGE_KEYS[key as keyof typeof LOCAL_STORAGE_KEYS];
        if (fullKey !== LOCAL_STORAGE_KEYS.SESSION_HISTORY && fullKey !== LOCAL_STORAGE_KEYS.SIDEBAR_STATE) {
          localStorage.removeItem(fullKey);
        }
      });
      
      localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, newSessionId);
      
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
      
      window.dispatchEvent(new CustomEvent('new-chat-requested', { 
        detail: { 
          sessionId: newSessionId,
          isNew: true,
          reset: true
        }
      }));
      
      toast.success("Created new research session");
      
      navigate(`/research/${newSessionId}`);
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast.error("Failed to create new chat. Please try again.");
    }
  };

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
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    configureModalApiProxy();
    
    const currentPath = window.location.pathname;
    const isResearchPathWithSession = currentPath.match(/^\/research\/[a-zA-Z0-9-]+$/);
    
    if (isResearchPathWithSession) {
      console.log(`[${new Date().toISOString()}] 📍 Already on a research path with session:`, currentPath);
      setIsLoading(false);
      
      const pathSessionId = currentPath.split('/').pop();
      if (pathSessionId) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, pathSessionId);
        console.log(`[${new Date().toISOString()}] 🔄 Setting current session from URL:`, pathSessionId);
        
        const sessionData = getSessionData(pathSessionId);
        if (sessionData) {
          console.log(`[${new Date().toISOString()}] 📂 Found cached session data for ${pathSessionId}`);
          
          if (sessionData.sourcesKey) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(sessionData.sourcesKey));
          }
          
          if (sessionData.reasoningPathKey) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.REASONING_PATH_CACHE, JSON.stringify(sessionData.reasoningPathKey));
          }
          
          if (sessionData.findingsKey) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(sessionData.findingsKey));
          }
          
          if (sessionData.stateKey) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_STATE, JSON.stringify(sessionData.stateKey));
          }
        }
      }
      return;
    }
    
    if (currentPath !== '/' && currentPath !== '/auth') {
      console.log(`[${new Date().toISOString()}] 📍 Already on a specific path:`, currentPath);
      setIsLoading(false);
      return;
    }
    
    const currentSessionId = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID);
    
    if (currentSessionId && currentPath === '/') {
      console.log(`[${new Date().toISOString()}] 🔄 Found active session:`, currentSessionId);
      setActiveSession(currentSessionId);
      setShouldRedirect(true);
    } else {
      const savedPath = localStorage.getItem('lastPath');
      if (savedPath && currentPath === '/') {
        setLastPath(savedPath);
        const referrer = document.referrer;
        if (referrer && referrer.includes(window.location.host)) {
          setShouldRedirect(true);
        }
      }
    }
    
    setIsLoading(false);

    const saveCurrentPath = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && !currentPath.includes('/auth')) {
        console.log(`[${new Date().toISOString()}] 📍 Saving current path:`, currentPath);
        localStorage.setItem('lastPath', currentPath);
        setLastPath(currentPath);
      }
    };

    window.addEventListener('beforeunload', saveCurrentPath);
    
    const handleRouteChange = () => {
      saveCurrentPath();
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    saveCurrentPath();
    
    return () => {
      window.removeEventListener('beforeunload', saveCurrentPath);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath !== '/' && !currentPath.includes('/auth')) {
      console.log(`[${new Date().toISOString()}] 📍 Saving location path:`, currentPath);
      localStorage.setItem('lastPath', currentPath);
    }
    
    const isResearchPathWithSession = currentPath.match(/^\/research\/[a-zA-Z0-9-]+$/);
    if (isResearchPathWithSession) {
      const pathSessionId = currentPath.split('/').pop();
      if (pathSessionId) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION_ID, pathSessionId);
        console.log(`[${new Date().toISOString()}] 🔄 Setting current session from location change:`, pathSessionId);
        
        const sessionData = getSessionData(pathSessionId);
        if (sessionData) {
          console.log(`[${new Date().toISOString()}] 📂 Restoring session data on location change for ${pathSessionId}`);
          
          window.dispatchEvent(new CustomEvent('session-selected', { 
            detail: { 
              sessionId: pathSessionId,
              isNew: false,
              forceRestore: true,
              state: sessionData.stateKey
            }
          }));
        }
      }
    }
  }, [location]);

  if (isLoading) {
    return null;
  }

  if (activeSession && shouldRedirect && window.location.pathname === '/') {
    console.log(`[${new Date().toISOString()}] 🔄 Redirecting to active session:`, activeSession);
    return <Navigate to={`/research/${activeSession}`} replace />;
  }
  
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
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
