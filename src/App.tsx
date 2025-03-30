
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './components/auth/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from 'sonner';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState } from 'react';
import { PanelLeftOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import ResearchPage from './pages/ResearchPage';
import ProfilePage from './pages/ProfilePage';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import UserModelsPage from './pages/UserModelsPage';
import NotFound from './pages/NotFound';
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

  // Only show on research pages with session ID
  const isResearchPage = location.pathname.includes('/research/');
  
  if (!isResearchPage) {
    return null;
  }

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

  // Hide buttons completely when sidebar is open
  if (sidebarOpen) {
    return null;
  }

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 flex flex-col items-center z-50 p-2 space-y-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="rounded-full bg-background border shadow-sm"
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <PanelLeftOpen className="h-5 w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/profile")}
        className="rounded-full bg-background border shadow-sm"
        aria-label="Profile settings"
      >
        <Settings className="h-5 w-5" />
      </Button>
    </div>
  );
}

function AppRoutes() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);

  useEffect(() => {
    // Configure CORS proxy
    configureModalApiProxy();
    
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
        <Route path="/research" element={<Navigate to={`/research/${uuidv4()}`} replace />} />
        <Route path="/research/:sessionId" element={<ResearchPage />} />
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
