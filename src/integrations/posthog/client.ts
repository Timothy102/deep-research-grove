
import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_HL1rRjEDBAiRhkPvGSlPYwl7hC522nhPQVvl2NiS1Gd';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

export const initPostHog = () => {
  if (initialized) return;
  
  if (typeof window !== 'undefined' && POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // We'll handle pageviews manually
      autocapture: false, // We'll set up our own events
      loaded: (posthog) => {
        console.log(`[${new Date().toISOString()}] 📊 PostHog initialized`);
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
    posthog.capture(eventName, properties);
    console.log(`[${new Date().toISOString()}] 📊 Tracked event:`, eventName, properties);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error tracking event:`, error);
  }
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (!initialized) initPostHog();
  
  try {
    posthog.identify(userId, properties);
    console.log(`[${new Date().toISOString()}] 📊 Identified user:`, userId);
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

export const enableAutocapture = () => {
  if (!initialized) initPostHog();
  
  try {
    posthog.config({ autocapture: true });
    console.log(`[${new Date().toISOString()}] 📊 Enabled autocapture`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error enabling autocapture:`, error);
  }
};

export default posthog;
