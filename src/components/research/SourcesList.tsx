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
  [key: string]: any;
}

interface SourcesListProps {
  sources: string[];
  findings?: Finding[];
  className?: string;
  sessionId?: string;
  isLoading?: boolean;
}

const SourcesList: React.FC<SourcesListProps> = ({ 
  sources = [], 
  findings = [], 
  className, 
  sessionId, 
  isLoading 
}) => {
  const [displaySources, setDisplaySources] = useState<string[]>(sources);
  const [displayFindings, setDisplayFindings] = useState<Finding[]>(findings || []);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const findingsBySource = displayFindings.reduce((acc: Record<string, Finding[]>, finding) => {
    if (!finding || !finding.source) return acc;
    
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
    if (sources.length > 0 && sources.length !== displaySources.length) {
      setDisplaySources(sources);
    }
    
    if (findings && findings.length > 0 && findings.length !== displayFindings.length) {
      setDisplayFindings(findings);
    }
  }, [sources, findings]);

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
            
            // Also update the cached data if it's not already there
            const sessionData = getSessionData(sessionId) || {};
            if (!sessionData.findings || sessionData.findings.length < parsedFindings.length) {
              sessionData.findings = parsedFindings;
              saveSessionData(sessionId, sessionData);
            }
          }
        }
        
        return;
      }
      
      const cachedSources = localStorage.getItem(LOCAL_STORAGE_KEYS.SOURCES_CACHE);
      const cachedFindings = localStorage.getItem(LOCAL_STORAGE_KEYS.FINDINGS_CACHE);
      
      if (cachedSources) {
        const parsedSources = JSON.parse(cachedSources);
        if (Array.isArray(parsedSources) && parsedSources.length > 0) {
          console.log(`[${new Date().toISOString()}] 📂 Loaded ${parsedSources.length} sources from global cache`);
          setDisplaySources(parsedSources);
        }
      }
      
      if (cachedFindings) {
        const parsedFindings = JSON.parse(cachedFindings);
        if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
          console.log(`[${new Date().toISOString()}] 📂 Loaded ${parsedFindings.length} findings from global cache`);
          setDisplayFindings(parsedFindings);
        }
      }
    } catch (e) {
      console.error("Error loading sources and findings:", e);
    }
  }, [sessionId]);

  // Listen for research state updates
  useEffect(() => {
    const handleStateUpdate = (event: any) => {
      if (event.detail && event.detail.sessionId === sessionId) {
        console.log(`[${new Date().toISOString()}] 🔄 State update received for session:`, sessionId);
        
        try {
          const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
          const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
          
          const sessionCachedSources = localStorage.getItem(sessionSourcesKey);
          const sessionCachedFindings = localStorage.getItem(sessionFindingsKey);
          
          if (sessionCachedSources) {
            const parsedSources = JSON.parse(sessionCachedSources);
            if (Array.isArray(parsedSources) && parsedSources.length > 0) {
              setDisplaySources(parsedSources);
            }
          }
          
          if (sessionCachedFindings) {
            const parsedFindings = JSON.parse(sessionCachedFindings);
            if (Array.isArray(parsedFindings) && parsedFindings.length > 0) {
              setDisplayFindings(parsedFindings);
            }
          }
        } catch (e) {
          console.error("Error updating sources and findings after state update:", e);
        }
      }
    };
    
    window.addEventListener('research_state_update', handleStateUpdate);
    
    return () => {
      window.removeEventListener('research_state_update', handleStateUpdate);
    };
  }, [sessionId]);

  const toggleSourceExpanded = (source: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [source]: !prev[source]
    }));
  };

  const isSourceUrl = (source: string) => {
    return source.startsWith('http') || source.startsWith('www.');
  };

  const getSourceDomain = (source: string) => {
    try {
      if (isSourceUrl(source)) {
        const url = new URL(source.startsWith('www.') ? `https://${source}` : source);
        return url.hostname.replace('www.', '');
      }
    } catch (e) {}
    
    return source;
  };

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <h2 className="text-xl font-semibold mb-4">Sources</h2>
      
      {displaySources.length === 0 ? (
        <div className="text-muted-foreground text-center py-6">
          <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>No sources available yet.</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="space-y-3">
            {displaySources.map((source, index) => (
              <Collapsible 
                key={index} 
                open={expandedSources[source]} 
                onOpenChange={() => toggleSourceExpanded(source)}
                className="border rounded-lg p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 flex-1">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6 rounded-full">
                        {expandedSources[source] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {isSourceUrl(source) ? (
                          <a 
                            href={source.startsWith('http') ? source : `https://${source}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:underline truncate"
                          >
                            <span className="truncate">{getSourceDomain(source)}</span>
                            <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-sm font-medium truncate">
                            {source}
                          </span>
                        )}
                        
                        <Badge variant="outline" className="text-xs">
                          {findingsBySource[source]?.length || 0} findings
                        </Badge>
                      </div>
                      
                      {isSourceUrl(source) && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {source}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <CollapsibleContent className="mt-3 space-y-2">
                  {findingsBySource[source] && findingsBySource[source].length > 0 ? (
                    findingsBySource[source].map((finding, findingIndex) => (
                      <div key={findingIndex} className="pl-6 border-l-2 border-gray-200">
                        <div className="p-2 bg-gray-50 rounded">
                          {finding.finding?.title && (
                            <div className="text-sm font-medium mb-1 flex items-center">
                              <Lightbulb className="h-4 w-4 mr-1 text-amber-500" />
                              {finding.finding.title}
                            </div>
                          )}
                          
                          {finding.finding?.summary && (
                            <p className="text-sm text-gray-700">
                              {finding.finding.summary}
                            </p>
                          )}
                          
                          {!finding.finding?.summary && finding.content && (
                            <p className="text-sm text-gray-700">
                              {finding.content}
                            </p>
                          )}
                          
                          {finding.finding?.confidence_score !== undefined && (
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-gray-500">Confidence:</span>
                              <div className="w-16 h-2 bg-gray-200 rounded ml-2">
                                <div 
                                  className="h-full bg-green-500 rounded" 
                                  style={{ width: `${Math.min(100, Math.max(0, finding.finding.confidence_score * 100))}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="pl-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Source referenced, but no specific findings extracted.
                      </div>
                    </div>
                  )}
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
