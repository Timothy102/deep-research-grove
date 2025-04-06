
import React, { useEffect, useState } from 'react';
import { ExternalLink, Search, FileText, Lightbulb } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LOCAL_STORAGE_KEYS, getSessionStorageKey, getSessionData, saveSessionData } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
  raw_data?: string;
  finding?: {
    title?: string;
    summary?: string;
    confidence_score?: number;
    url?: string;
  };
}

interface SourcesListProps {
  sources: string[];
  findings?: Finding[];
  className?: string;
  sessionId?: string;
}

const SourcesList: React.FC<SourcesListProps> = ({ 
  sources = [], 
  findings = [], 
  className, 
  sessionId 
}) => {
  const [displaySources, setDisplaySources] = useState<string[]>(sources);
  const [displayFindings, setDisplayFindings] = useState<Finding[]>(findings);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [sortedSources, setSortedSources] = useState<string[]>([]);

  const findingsBySource = displayFindings.reduce((acc: Record<string, Finding[]>, finding) => {
    if (!finding.source) return acc;
    
    if (!acc[finding.source]) {
      acc[finding.source] = [];
    }
    
    if (!acc[finding.source].some(f => 
      f.finding?.title === finding.finding?.title && 
      f.finding?.summary === finding.finding?.summary
    )) {
      acc[finding.source].push(finding);
    }
    
    return acc;
  }, {});

  useEffect(() => {
    const newExpandedState = { ...expandedSources };
    let hasChanges = false;
    
    displaySources.forEach(source => {
      if (expandedSources[source] === undefined) {
        newExpandedState[source] = true;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setExpandedSources(newExpandedState);
    }
  }, [displaySources, expandedSources]);

  // Sort sources with findings at the top
  useEffect(() => {
    const sourcesWithFindings = Object.keys(findingsBySource);
    const sourcesWithoutFindings = displaySources.filter(source => !sourcesWithFindings.includes(source));
    
    const newSortedSources = [...sourcesWithFindings, ...sourcesWithoutFindings];
    setSortedSources(newSortedSources);
  }, [displaySources, findingsBySource]);

  useEffect(() => {
    try {
      if (sessionId) {
        const sessionData = getSessionData(sessionId);
        
        if (sessionData) {
          if (sessionData.sources && Array.isArray(sessionData.sources) && sessionData.sources.length > 0) {
            if (sources.length === 0 || sessionData.sources.length > sources.length) {
              console.log(`[${new Date().toISOString()}] 📂 Loaded ${sessionData.sources.length} sources from session data`);
              setDisplaySources(sessionData.sources);
            }
          }
          
          if (sessionData.findings && Array.isArray(sessionData.findings) && sessionData.findings.length > 0) {
            if (findings.length === 0 || sessionData.findings.length > findings.length) {
              console.log(`[${new Date().toISOString()}] 📂 Loaded ${sessionData.findings.length} findings from session data`);
              setDisplayFindings(sessionData.findings);
            }
          }
          
          return;
        }
        
        const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
        const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
        
        const sessionCachedSources = localStorage.getItem(sessionSourcesKey);
        const sessionCachedFindings = localStorage.getItem(sessionFindingsKey);
        
        if (sessionCachedSources) {
          const parsedSources = JSON.parse(sessionCachedSources);
          if (Array.isArray(parsedSources) && parsedSources.length > 0) {
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${parsedSources.length} sources from session cache for: ${sessionId}`);
            setDisplaySources(parsedSources);
          }
        }
        
        if (sessionCachedFindings) {
          const parsedFindings = JSON.parse(sessionCachedFindings);
          if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
            console.log(`[${new Date().toISOString()}] 📂 Loaded ${parsedFindings.length} findings from session cache for: ${sessionId}`);
            setDisplayFindings(parsedFindings);
          }
        }
        
        return;
      }
      
      const cachedSources = localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
      const cachedFindings = localStorage.getItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE);
      
      if (cachedSources) {
        const parsedSources = JSON.parse(cachedSources);
        if (Array.isArray(parsedSources) && parsedSources.length > 0) {
          if (sources.length === 0) {
            setDisplaySources(parsedSources);
          } else if (sources.length !== parsedSources.length) {
            setDisplaySources(sources.length > parsedSources.length ? sources : parsedSources);
          }
        }
      }
      
      if (cachedFindings) {
        const parsedFindings = JSON.parse(cachedFindings);
        if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
          if (findings.length === 0) {
            setDisplayFindings(parsedFindings);
          } else if (findings.length !== parsedFindings.length) {
            setDisplayFindings(findings.length > parsedFindings.length ? findings : parsedFindings);
          }
        }
      }
    } catch (e) {
      console.error("Error loading sources or findings from cache:", e);
    }
  }, [sources, findings, sessionId]);

  useEffect(() => {
    if (sources.length > 0) {
      setDisplaySources(sources);
      
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE, JSON.stringify(sources));
        
        if (sessionId) {
          saveSessionData(sessionId, { sources });
          
          const sessionCacheKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
          localStorage.setItem(sessionCacheKey, JSON.stringify(sources));
          console.log(`[${new Date().toISOString()}] 💾 Saved ${sources.length} sources to session cache for: ${sessionId}`);
        }
      } catch (e) {
        console.error("Error saving sources to cache:", e);
      }
    }
  }, [sources, sessionId]);

  useEffect(() => {
    if (findings.length > 0) {
      setDisplayFindings(findings);
      
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, JSON.stringify(findings));
        
        if (sessionId) {
          saveSessionData(sessionId, { findings });
          
          const sessionCacheKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
          localStorage.setItem(sessionCacheKey, JSON.stringify(findings));
          console.log(`[${new Date().toISOString()}] 💾 Saved ${findings.length} findings to session cache for: ${sessionId}`);
        }
      } catch (e) {
        console.error("Error saving findings to cache:", e);
      }
    }
  }, [findings, sessionId]);

  const toggleSourceExpanded = (source: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [source]: !prev[source]
    }));
  };

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
      <h3 className="font-medium mb-4 flex items-center justify-between">
        <span>Sources ({displaySources.length})</span>
          <Badge variant="outline" className="text-xs">
            {displayFindings.length} finding{displayFindings.length !== 1 ? 's' : ''}
          </Badge>
      </h3>
      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-3">
          {sortedSources.map((source, index) => {
            const sourceFindings = findingsBySource[source] || [];
            const isExpanded = expandedSources[source] !== false;
            
            return (
              <Collapsible 
                key={`${source}-${index}`} 
                open={isExpanded}
                onOpenChange={() => toggleSourceExpanded(source)}
                className="border border-muted-foreground/10 rounded-md overflow-hidden"
              >
                <div className="flex items-center justify-between p-3 bg-background hover:bg-muted/50 transition-colors">
                  <div className="flex items-center flex-1 min-w-0">
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-0 h-5 w-5 mr-2 hover:bg-transparent"
                      >
                        {isExpanded ? 
                          <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                      </Button>
                    </CollapsibleTrigger>
                    <span className="text-sm truncate">{source}</span>
                  </div>
                  
                  <div className="flex items-center ml-2 space-x-2">
                    {sourceFindings.length > 0 && (
                      <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                        {sourceFindings.length} 
                      </Badge>
                    )}
                    <a 
                      href={source} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:text-primary/80 transition-colors" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
                
                <CollapsibleContent>
                  {sourceFindings.length > 0 ? (
                    <div className="p-3 pt-0 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                      {sourceFindings.map((finding, i) => (
                        <div key={`finding-${i}`} className="mt-3 p-3 rounded-md border border-muted bg-background/90">
                          {finding.finding?.title && (
                            <h4 className="text-sm font-medium mb-1">{finding.finding.title}</h4>
                          )}
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {finding.finding?.summary || finding.content || "No content available"}
                          </p>
                          {finding.finding?.confidence_score && (
                            <Badge variant="outline" className="mt-2 text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                              Confidence: {Math.round(finding.finding.confidence_score * 100)}%
                            </Badge>
                          )}
                          {finding.node_id && (
                            <div className="mt-2 flex items-center">
                              <Lightbulb className="h-3 w-3 text-amber-500 mr-1" />
                              <span className="text-xs text-muted-foreground">Step {finding.node_id}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 pt-0 bg-slate-50/50 dark:bg-slate-900/50">
                      <p className="text-xs text-muted-foreground italic">No findings yet for this source</p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SourcesList;
