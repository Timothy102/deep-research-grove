
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import ResearchPage from '@/pages/ResearchPage';
import ProfilePage from '@/pages/ProfilePage';
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import UserModelsPage from '@/pages/UserModelsPage';
import NotFound from '@/pages/NotFound';
import SidebarButtons from './SidebarButtons';
import { configureModalApi } from '@/utils/apiConfig';
import { useAuth } from '@/components/auth/AuthContext';

export const AppRoutes = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Configure CORS proxy
    configureModalApi();
    
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
  if (isLoading || loading) {
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
};

export default AppRoutes;
