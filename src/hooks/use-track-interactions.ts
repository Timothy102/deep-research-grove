
import { useEffect, useRef } from 'react';
import { captureEvent } from '@/integrations/posthog/client';

/**
 * Hook to track button clicks, link clicks, and form submissions
 * Attaches event listeners to the document to track these interactions
 */
export const useTrackInteractions = () => {
  const initialized = useRef(false);

  useEffect(() => {
    // Only run once
    if (initialized.current) return;
    initialized.current = true;

    // Track button clicks
    const handleButtonClick = (event: MouseEvent) => {
      const button = event.target as HTMLElement;
      if (button.tagName === 'BUTTON' || 
          (button.closest('button') && button.closest('button') !== null)) {
        
        const buttonEl = button.tagName === 'BUTTON' ? button : button.closest('button');
        if (!buttonEl) return;
        
        // Get button text and attributes for better context
        const buttonText = buttonEl.textContent?.trim() || 'Unknown Button';
        const buttonType = (buttonEl as HTMLButtonElement).type || 'button';
        const buttonId = buttonEl.id || '';
        const buttonClass = buttonEl.className || '';
        
        captureEvent('button_clicked', {
          button_text: buttonText,
          button_type: buttonType,
          button_id: buttonId,
          button_class: buttonClass,
          path: window.location.pathname
        });
      }
    };

    // Track link clicks
    const handleLinkClick = (event: MouseEvent) => {
      const link = event.target as HTMLElement;
      if (link.tagName === 'A' || 
          (link.closest('a') && link.closest('a') !== null)) {
        
        const linkEl = link.tagName === 'A' ? link : link.closest('a');
        if (!linkEl) return;
        
        const href = (linkEl as HTMLAnchorElement).href || '';
        const linkText = linkEl.textContent?.trim() || 'Unknown Link';
        const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
        
        captureEvent('link_clicked', {
          link_text: linkText,
          link_url: href,
          is_external: isExternal,
          path: window.location.pathname
        });
      }
    };

    // Track form submissions
    const handleFormSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;
      
      const formId = form.id || '';
      const formAction = form.action || '';
      const formMethod = form.method || 'get';
      const formFields = Array.from(form.elements).length;
      
      captureEvent('form_submitted', {
        form_id: formId,
        form_action: formAction,
        form_method: formMethod,
        form_fields: formFields,
        path: window.location.pathname
      });
    };

    // Add event listeners
    document.addEventListener('click', handleButtonClick, { capture: true });
    document.addEventListener('click', handleLinkClick, { capture: true });
    document.addEventListener('submit', handleFormSubmit as EventListener, { capture: true });

    // Clean up
    return () => {
      document.removeEventListener('click', handleButtonClick, { capture: true });
      document.removeEventListener('click', handleLinkClick, { capture: true });
      document.removeEventListener('submit', handleFormSubmit as EventListener, { capture: true });
    };
  }, []);
};
