
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';
import { 
  initPostHog, 
  capturePageView, 
  captureEvent, 
  identifyUser, 
  resetUser 
} from '@/integrations/posthog/client';
import { useTrackInteractions } from './use-track-interactions';

export const useAnalytics = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Enable interaction tracking (buttons, links, forms)
  useTrackInteractions();
  
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
  
  return {
    trackEvent: captureEvent
  };
};
