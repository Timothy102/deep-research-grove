
import React, { useState } from "react";
import { ExternalLink, ChevronDown, ChevronRight, Search, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
  finding?: any;
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

const SourceItem: React.FC<SourceItemProps> = ({ source, content, finding }) => {
  const [expanded, setExpanded] = useState(false);
  
  const displayContent = content || (finding && 
    `Title: ${finding.title || ''}\nSummary: ${finding.summary || ''}\nConfidence: ${finding.confidence_score?.toFixed(2) || 'N/A'}`
  );
  
  return (
    <div className="border border-muted-foreground/10 rounded-md mb-2">
      <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => displayContent && setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          <a 
            href={source} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 dark:text-blue-400 hover:underline truncate text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {extractDomain(source)}
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
          <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border">
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
  
  const toggleDomain = (domain: string) => {
    setExpanded(prev => ({
      ...prev,
      [domain]: !prev[domain]
    }));
  };
  
  const groupedSources = groupSourcesByDomain(sources);
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Sources
          <Badge variant="outline" className="ml-2">
            {sources.length}
          </Badge>
        </h3>
        
        <div className="space-y-4">
          {Object.entries(groupedSources).map(([domain, domainSources]) => (
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
                </div>
              </div>
              
              {expanded[domain] && (
                <div className="p-3 pt-1 space-y-2 animate-accordion-down">
                  {domainSources.map((source, idx) => (
                    <SourceItem 
                      key={idx} 
                      source={source} 
                      content={findings.find(f => f.source === source)?.content}
                      finding={findings.find(f => f.source === source)?.finding}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {findings.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Findings
            <Badge variant="outline" className="ml-2">
              {findings.length}
            </Badge>
          </h3>
          
          <div className="space-y-2">
            {findings.map((finding, idx) => (
              <SourceItem 
                key={idx}
                source={finding.source}
                content={finding.content}
                finding={finding.finding}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SourcesList;
