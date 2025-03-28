
import React, { useEffect, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

interface SourcesListProps {
  sources: string[];
  className?: string;
}

const SourcesList: React.FC<SourcesListProps> = ({ sources = [], className }) => {
  // Use state to handle sources with proper persistence
  const [displaySources, setDisplaySources] = useState<string[]>(sources);
  
  // Load sources from localStorage if available to ensure persistence across refreshes
  useEffect(() => {
    try {
      const cachedSources = localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
      if (cachedSources) {
        const parsedSources = JSON.parse(cachedSources);
        if (Array.isArray(parsedSources) && parsedSources.length > 0) {
          // Only use cached sources if we don't have any already
          if (sources.length === 0) {
            setDisplaySources(parsedSources);
          } else if (sources.length !== parsedSources.length) {
            // If source counts don't match, use the larger set
            setDisplaySources(sources.length > parsedSources.length ? sources : parsedSources);
          }
        }
      }
    } catch (e) {
      console.error("Error loading sources from cache:", e);
    }
  }, [sources]);

  // Update display sources whenever props sources change
  useEffect(() => {
    if (sources.length > 0) {
      setDisplaySources(sources);
      // Also update localStorage for persistence
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(sources));
      } catch (e) {
        console.error("Error saving sources to cache:", e);
      }
    }
  }, [sources]);

  if (displaySources.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No sources yet</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="font-medium mb-4">Sources ({displaySources.length})</h3>
      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-2">
          {displaySources.map((source, index) => (
            <div 
              key={`${source}-${index}`} 
              className="flex items-center justify-between p-3 rounded-md bg-background border border-muted-foreground/10 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm truncate flex-1">{source}</span>
              <a 
                href={source} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-2 text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SourcesList;
