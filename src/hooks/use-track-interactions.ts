
import { useEffect, useRef } from 'react';

/**
 * This hook is now deprecated since we're using PostHog's built-in autocapture functionality.
 * It's kept for backward compatibility but doesn't add event listeners anymore.
 */
export const useTrackInteractions = () => {
  useEffect(() => {
    // No longer manually attaching event listeners as PostHog autocapture takes care of this
    console.log(`[${new Date().toISOString()}] ℹ️ Using PostHog autocapture for interaction tracking`);
    
    return () => {
      // No cleanup needed
    };
  }, []);
};
