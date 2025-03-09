
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './components/auth/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from 'sonner';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState } from 'react';

import ResearchPage from './pages/ResearchPage';
import ProfilePage from './pages/ProfilePage';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import NotFound from './pages/NotFound';
import './App.css';

const queryClient = new QueryClient();

function AppRoutes() {
  const [lastPath, setLastPath] = useState<string | null>(null);

  useEffect(() => {
    // Get the last path from local storage on initial load
    const savedPath = localStorage.getItem('lastPath');
    if (savedPath) {
      setLastPath(savedPath);
    }

    // Save current path to localStorage whenever it changes
    const saveCurrentPath = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && !currentPath.includes('/auth')) {
        console.log(`[${new Date().toISOString()}] 📍 Saving current path:`, currentPath);
        localStorage.setItem('lastPath', currentPath);
      }
    };

    // Listen for route changes to save the path
    window.addEventListener('beforeunload', saveCurrentPath);
    
    // Also save when routes change within the app
    const handleRouteChange = () => {
      saveCurrentPath();
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeunload', saveCurrentPath);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Redirect to saved path if we're at the root and have a saved path
  if (window.location.pathname === '/' && lastPath && lastPath !== '/') {
    console.log(`[${new Date().toISOString()}] 🔄 Redirecting to last path:`, lastPath);
    return <Navigate to={lastPath} replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/research/:sessionId?" element={<ResearchPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
