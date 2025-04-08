
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

// Only show in development
const isDev = process.env.NODE_ENV === 'development';

interface AnalyticsEvent {
  timestamp: string;
  name: string;
  properties: Record<string, any>;
}

export const AnalyticsDebugger = () => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isDev) return;

    // Listen for PostHog events
    const handlePostHogEvent = (e: any) => {
      if (e.detail && e.detail.name) {
        setEvents(prev => [
          {
            timestamp: new Date().toISOString(),
            name: e.detail.name,
            properties: e.detail.properties || {}
          },
          ...prev.slice(0, 49) // Keep last 50
        ]);
      }
    };

    window.addEventListener('ph_event', handlePostHogEvent);
    
    // Toggle with Ctrl+Alt+A
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'a') {
        setIsVisible(v => !v);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('ph_event', handlePostHogEvent);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isDev || !isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-96 z-50 shadow-xl overflow-hidden">
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Analytics Debugger</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsVisible(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <div className="p-3 space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet. Actions will appear here.</p>
            ) : (
              events.map((event, i) => (
                <div key={i} className="border rounded-md p-2 text-xs">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="mb-1">
                      {event.name}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1">
                    <pre className="text-xs bg-muted p-1 rounded overflow-auto max-h-32">
                      {JSON.stringify(event.properties, null, 2)}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AnalyticsDebugger;
