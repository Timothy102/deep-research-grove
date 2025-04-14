
import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_HL1rRjEDBAiRhkPvGSlPYwl7hC522nhPQVvl2NiS1Gd';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

export const initPostHog = () => {
  if (initialized) return;
  
  if (typeof window !== 'undefined' && POSTHOG_KEY) {
    // Using the recommended initialization pattern
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true, // Enable autocapture by default
      capture_pageview: true, // Enable automatic pageview tracking
      persistence: 'localStorage', // Use localStorage for better persistence
      capture_pageleave: true, // Track when users leave the page
      loaded: (posthog) => {
        console.log(`[${new Date().toISOString()}] 📊 PostHog initialized with autocapture enabled`);
        // Set global properties that should be included with all events
        posthog.register({
          app_version: import.meta.env.VITE_APP_VERSION || 'development',
          platform: 'web'
        });
      }
    });
    initialized = true;
  }
};

export const capturePageView = (url: string, properties?: Record<string, any>) => {
  if (!initialized) initPostHog();
  
  try {
    posthog.capture('$pageview', {
      current_url: url,
      ...(properties || {})
    });
    console.log(`[${new Date().toISOString()}] 📊 Tracked page view:`, url);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error tracking page view:`, error);
  }
};

export const captureEvent = (eventName: string, properties?: Record<string, any>) => {
  if (!initialized) initPostHog();
  
  try {
    // Ensure timestamp is added to all events
    const eventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    posthog.capture(eventName, eventProperties);
    console.log(`[${new Date().toISOString()}] 📊 Tracked event:`, eventName, eventProperties);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error tracking event:`, error);
  }
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (!initialized) initPostHog();
  
  try {
    posthog.identify(userId, properties);
    console.log(`[${new Date().toISOString()}] 📊 Identified user:`, userId);
    
    // Set super properties after identification
    posthog.register({
      user_id: userId,
      email_domain: properties?.email ? properties.email.split('@')[1] : undefined,
      account_type: properties?.account_type || 'standard',
      user_name: properties?.name
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error identifying user:`, error);
  }
};

export const resetUser = () => {
  if (!initialized) return;
  
  try {
    posthog.reset();
    console.log(`[${new Date().toISOString()}] 📊 Reset user identity`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error resetting user:`, error);
  }
};

// Track feature usage
export const trackFeatureUsage = (featureName: string, properties?: Record<string, any>) => {
  captureEvent('feature_used', {
    feature_name: featureName,
    ...(properties || {})
  });
};

// Track research session with duration
export const trackResearchSession = (sessionId: string, durationMs: number, status: string, properties?: Record<string, any>) => {
  captureEvent('research_session', {
    session_id: sessionId,
    duration_ms: durationMs,
    status,
    ...(properties || {})
  });
};

// Simplified function to enable autocapture if it wasn't enabled initially
export const enableAutocapture = () => {
  if (!initialized) {
    // If not initialized, initialize with autocapture enabled
    initPostHog();
    return;
  }
  
  try {
    // For already initialized instances, we can't enable autocapture after the fact
    // Just log a message to inform that it would need a reinstantiation
    console.log(`[${new Date().toISOString()}] 📊 Note: PostHog is already initialized. Autocapture can only be enabled at initialization.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error with PostHog autocapture:`, error);
  }
};

export default posthog;
