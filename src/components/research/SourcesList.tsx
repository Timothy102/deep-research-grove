
import React, { useState } from "react";
import { ExternalLink, ChevronDown, ChevronRight, Search, Database, Book, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
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
  rawData?: Record<string, string>;
}

interface SourceItemProps {
  source: string;
  content?: string;
  finding?: any;
  index?: number;
  isFinding?: boolean;
}

const extractDomain = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (e) {
    return url;
  }
};

const groupSourcesByDomain = (sources: string[]): Record<string, string[]> => {
  const grouped: Record<string, string[]> = {};
  
  sources.forEach(source => {
    try {
      const url = new URL(source);
      const domain = url.hostname.replace('www.', '');
      
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      
      grouped[domain].push(source);
    } catch {
      // If not a valid URL, group under "Other"
      if (!grouped["Other"]) {
        grouped["Other"] = [];
      }
      grouped["Other"].push(source);
    }
  });
  
  return grouped;
};

const getDomainIcon = (domain: string) => {
  return <Search className="h-4 w-4" />;
};

const SourceItem: React.FC<SourceItemProps> = ({ source, content, finding, index, isFinding = false }) => {
  const [expanded, setExpanded] = useState(finding && (finding.title || finding.summary));
  
  const displayContent = finding ? 
    `Title: ${finding.title || ''}\nSummary: ${finding.summary || ''}\nConfidence: ${finding.confidence_score?.toFixed(2) || 'N/A'}${finding.url ? `\nURL: ${finding.url}` : ''}` 
    : content;
  
  return (
    <div className={cn(
      "border rounded-md mb-2",
      isFinding ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" 
                : "border-muted-foreground/10"
    )}>
      <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => displayContent && setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          {index !== undefined && (
            <span className={cn(
              "inline-block w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0",
              isFinding
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
            )}>
              {index + 1}
            </span>
          )}
          
          {isFinding && (
            <Badge variant="outline" className="h-5 py-0.5 text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              <Book className="h-3 w-3 mr-1" />
              finding
            </Badge>
          )}
          
          <a 
            href={source} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 dark:text-blue-400 hover:underline truncate text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {finding?.title || extractDomain(source)}
          </a>
        </div>
        
        <div className="flex items-center gap-1">
          {displayContent && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          )}
          
          <a
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
      
      {expanded && displayContent && (
        <div className="px-2 pb-2 animate-accordion-down">
          <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border whitespace-pre-wrap">
            {displayContent}
          </div>
        </div>
      )}
    </div>
  );
};

const SourcesList: React.FC<SourcesListProps> = ({ sources, findings = [], rawData = {} }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  if (sources.length === 0 && findings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No sources found yet...</p>
      </div>
    );
  }
  
  // Create a mapping of source URLs to their findings
  const sourcesToFindings: Record<string, Finding> = {};
  findings.forEach(finding => {
    if (finding.source) {
      sourcesToFindings[finding.source] = finding;
    }
  });
  
  const toggleDomain = (domain: string) => {
    setExpanded(prev => ({
      ...prev,
      [domain]: !prev[domain]
    }));
  };
  
  // Get all unique sources from both sources array and findings
  const allSources = new Set([...sources]);
  findings.forEach(finding => {
    if (finding.source) {
      allSources.add(finding.source);
    }
  });
  
  const allSourcesGrouped = groupSourcesByDomain(Array.from(allSources));
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Sources & Findings
          <Badge variant="outline" className="ml-2">
            {sources.length}
          </Badge>
          {findings.length > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              <Book className="h-3 w-3 mr-1" />
              {findings.length} findings
            </Badge>
          )}
        </h3>
        
        <div className="space-y-4">
          {Object.entries(allSourcesGrouped).map(([domain, domainSources], domainIndex) => {
            // Count how many sources in this domain have findings
            const findingsCount = domainSources.filter(source => sourcesToFindings[source]).length;
            
            return (
              <div key={domain} className={cn(
                "border rounded-md overflow-hidden",
                expanded[domain] ? "shadow-sm" : ""
              )}>
                <div 
                  className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => toggleDomain(domain)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    {expanded[domain] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {getDomainIcon(domain)}
                    <span className="font-medium">{domain}</span>
                    <Badge variant="outline" className="ml-1 text-xs">
                      {domainSources.length}
                    </Badge>
                    
                    {findingsCount > 0 && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        <Book className="h-3 w-3 mr-1" />
                        {findingsCount} finding{findingsCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {expanded[domain] && (
                  <div className="p-3 pt-1 space-y-2 animate-accordion-down">
                    {domainSources.map((source, idx) => {
                      const sourceFinding = sourcesToFindings[source];
                      const isFinding = !!sourceFinding;
                      
                      return (
                        <SourceItem 
                          key={idx} 
                          source={source}
                          index={idx}
                          isFinding={isFinding}
                          content={isFinding ? undefined : ""}
                          finding={sourceFinding?.finding}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SourcesList;
