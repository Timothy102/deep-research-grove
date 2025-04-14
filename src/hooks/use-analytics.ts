
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';
import { 
  initPostHog, 
  capturePageView, 
  captureEvent, 
  identifyUser, 
  resetUser 
} from '@/integrations/posthog/client';

export const useAnalytics = () => {
  const location = useLocation();
  const { user } = useAuth();
  const sessionStartTimeRef = useRef<number>(Date.now());
  const pathRef = useRef<string>(location.pathname);
  
  // Initialize PostHog
  useEffect(() => {
    initPostHog();
  }, []);
  
  // Track page views
  useEffect(() => {
    const url = `${window.location.origin}${location.pathname}${location.search}`;
    capturePageView(url, {
      pathname: location.pathname,
      search_params: location.search,
      referrer: document.referrer,
      title: document.title
    });
    
    // If the path has changed, we consider it a new session
    if (pathRef.current !== location.pathname) {
      // Track page change as potential session boundary
      const previousPath = pathRef.current;
      const sessionDuration = Date.now() - sessionStartTimeRef.current;
      
      if (previousPath.includes('/research/')) {
        // End of a research session
        captureEvent('research_session_ended', {
          previous_path: previousPath,
          new_path: location.pathname,
          duration_ms: sessionDuration,
          end_reason: location.pathname.includes('/research/') ? 'new_research' : 'navigated_away'
        });
      }
      
      // Update for new potential session
      sessionStartTimeRef.current = Date.now();
      pathRef.current = location.pathname;
      
      // If entering a research page, track start
      if (location.pathname.includes('/research/')) {
        captureEvent('research_started', {
          session_id: location.pathname.split('/').pop(),
          path: location.pathname,
          start_time: Date.now()
        });
      }
    }
  }, [location.pathname, location.search]);
  
  // Identify users
  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, {
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name,
        signup_date: user.created_at
      });
    } else {
      resetUser();
    }
  }, [user]);
  
  // Track before unload to capture session end metrics
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionDuration = Date.now() - sessionStartTimeRef.current;
      
      if (location.pathname.includes('/research/')) {
        captureEvent('research_session_ended', {
          path: location.pathname,
          duration_ms: sessionDuration,
          end_reason: 'page_closed',
          session_id: location.pathname.split('/').pop()
        });
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname]);
  
  const trackResearchEvent = useCallback((eventName: string, properties: Record<string, any> = {}) => {
    captureEvent(eventName, {
      ...properties,
      path: location.pathname,
      session_id: location.pathname.includes('/research/') ? location.pathname.split('/').pop() : undefined
    });
  }, [location.pathname]);
  
  return {
    trackEvent: captureEvent,
    trackResearchEvent
  };
};
