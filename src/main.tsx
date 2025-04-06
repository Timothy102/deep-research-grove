
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { toast } from "sonner";
import { supabase } from './integrations/supabase/client';

// Enable realtime subscriptions with improved logging
supabase.channel('research_states_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'research_states' }, 
    (payload) => {
      console.log(`[${new Date().toISOString()}] 📊 Realtime update received:`, payload);
      
      // Dispatch a custom event so components can react to it immediately
      const eventDetail = { 
        payload,
        timestamp: new Date().toISOString()
      };
      
      // Dispatch the event
      window.dispatchEvent(new CustomEvent('research_state_update', { detail: eventDetail }));
      
      // Also dispatch a more urgent "new-event" notification that can be used 
      // to trigger immediate UI updates regardless of the payload content
      window.dispatchEvent(new CustomEvent('research-new-event', { 
        detail: { 
          type: 'realtime',
          timestamp: new Date().toISOString(),
          sessionId: payload.new && typeof payload.new === 'object' && 'session_id' in payload.new 
            ? payload.new.session_id 
            : undefined
        }
      }));
    }
  )
  .subscribe((status) => {
    console.log(`[${new Date().toISOString()}] 🔌 Realtime connection status:`, status);
    
    // Notify when connection is established or reconnected
    if (status === 'SUBSCRIBED') {
      console.log(`[${new Date().toISOString()}] ✅ Realtime subscription active`);
    }
  });

// Add a heartbeat to ensure components are updating regularly
setInterval(() => {
  window.dispatchEvent(new CustomEvent('research-heartbeat', { 
    detail: { timestamp: new Date().toISOString() }
  }));
}, 5000);

createRoot(document.getElementById("root")!).render(<App />);
