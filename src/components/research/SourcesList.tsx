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

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <h3 className="text-lg font-semibold mb-2">Sources ({displaySources.length})</h3>
      
      {displaySources.length === 0 ? (
        <div className="text-muted-foreground text-sm">
          No sources available yet
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-4">
            {displaySources.map((source, index) => (
              <Collapsible 
                key={`${source}-${index}`}
                open={expandedSources[source]}
                onOpenChange={(isOpen) => {
                  setExpandedSources(prev => ({
                    ...prev,
                    [source]: isOpen
                  }));
                }}
                className="border rounded-md"
              >
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-start justify-between w-full p-3 text-left hover:bg-muted"
                  >
                    <div className="flex items-start space-x-2">
                      <div className="mt-1">
                        {expandedSources[source] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm break-all">
                          {source}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {findingsBySource[source]?.length 
                            ? `${findingsBySource[source]?.length} findings` 
                            : "No findings"}
                        </div>
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 py-3 border-t space-y-3">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>Source: {source}</span>
                    </div>
                    
                    {findingsBySource[source]?.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium flex items-center space-x-1">
                          <Lightbulb className="h-3 w-3" />
                          <span>Findings</span>
                        </h4>
                        
                        <div className="space-y-2">
                          {findingsBySource[source]?.map((finding, i) => (
                            <div key={i} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                              {finding.finding?.title && (
                                <div className="font-medium mb-1">{finding.finding.title}</div>
                              )}
                              <div className="text-sm text-muted-foreground">
                                {finding.content || finding.finding?.summary || "No content available"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        No findings extracted from this source
                      </div>
                    )}
                    
                    <div className="flex justify-end mt-2">
                      <a 
                        href={source} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <span>View source</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default SourcesList;
