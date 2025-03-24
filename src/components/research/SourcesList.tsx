import { useState } from "react";
import { ExternalLink, Globe, Search, BookOpen, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Finding {
  source: string;
  content?: string;
  finding?: any;
}

interface SourcesListProps {
  sources: string[];
  findings?: Finding[];
  rawData?: Record<string, string>;
}

// Function to extract domain name from URL
const extractDomain = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (e) {
    return url;
  }
};

// Function to get more readable domain display
const getPrettyDomain = (url: string): string => {
  try {
    const domain = extractDomain(url);
    // Get the main part of the domain (e.g., "wikipedia" from "en.wikipedia.org")
    const parts = domain.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      // If it has a subdomain like en.wikipedia.org, return that subdomain + main domain
      return `${parts[0]}.${parts[1]}`;
    }
    // Otherwise return just the main domain part
    return parts[parts.length - 2];
  } catch (e) {
    return extractDomain(url);
  }
};

// Function to get icon based on domain
const getDomainIcon = (url: string) => {
  const domain = extractDomain(url).toLowerCase();
  
  if (domain.includes('wikipedia')) return <Globe className="h-4 w-4" />;
  if (domain.includes('stackexchange') || domain.includes('stackoverflow')) return <Search className="h-4 w-4" />;
  if (domain.includes('academic') || domain.includes('science') || domain.includes('research')) return <BookOpen className="h-4 w-4" />;
  
  return <FileText className="h-4 w-4" />;
};

// Expandable source item component
const SourceItem = ({ url, content, isFinding, index, finding }: { 
  url: string; 
  content?: string; 
  isFinding: boolean;
  index: number;
  finding?: any;
}) => {
  const [expanded, setExpanded] = useState(isFinding);
  
  // Determine display content - either directly from content or from finding object
  const displayContent = content || (finding && `Title: ${finding.title || ''}\nSummary: ${finding.summary || ''}\nConfidence: ${finding.confidence_score?.toFixed(2) || 'N/A'}`);
  
  // Show a compact preview of finding when not expanded
  const showPreview = isFinding && finding && !expanded;
  
  return (
    <div 
      className={cn(
        "flex flex-col p-3 rounded-md border transition-all hover:shadow-sm",
        isFinding && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900"
      )}
    >
      <div 
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Badge 
          className={cn(
            "h-6 w-6 p-0 flex items-center justify-center shrink-0",
            isFinding 
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" 
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          )}
        >
          {index + 1}
        </Badge>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5">
            {isFinding && (
              <Badge variant="outline" className="h-5 py-0 px-1.5 text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                finding
              </Badge>
            )}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs">
                {getDomainIcon(url)}
                <span>{getPrettyDomain(url)}</span>
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400 truncate">
                {url.replace(/https?:\/\/(www\.)?/, '')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted"
            onClick={(e) => { 
              e.stopPropagation(); 
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
      
      {/* Show finding preview when not expanded but only for findings */}
      {showPreview && (
        <div className="mt-2 ml-8">
          <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20 p-1.5 rounded border border-blue-100 dark:border-blue-900">
            <div className="font-medium text-xs">{finding.title || 'Finding'}</div>
            <div className="line-clamp-1 text-xs opacity-80">
              {finding.summary || 'No summary available'}
            </div>
          </div>
        </div>
      )}
      
      {/* Full content display when expanded */}
      {expanded && (
        <div className="mt-2 ml-8 animate-accordion-down">
          {displayContent ? (
            <div className="text-sm text-muted-foreground bg-muted-foreground/5 p-3 rounded border border-muted-foreground/10">
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 whitespace-pre-wrap">
                {displayContent}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Visit source
              </a>
              <span>·</span>
              <span className="text-xs truncate">{url}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Group sources by domain
const groupSourcesByDomain = (allSources: Array<{ url: string; content?: string; isFinding: boolean; finding?: any }>) => {
  const domains = new Map<string, Array<{ url: string; content?: string; isFinding: boolean; finding?: any; index: number }>>();
  
  allSources.forEach((source, index) => {
    try {
      const domain = extractDomain(source.url);
      if (!domains.has(domain)) {
        domains.set(domain, []);
      }
      domains.get(domain)?.push({...source, index});
    } catch (e) {
      // Handle invalid URLs
      if (!domains.has('other')) {
        domains.set('other', []);
      }
      domains.get('other')?.push({...source, index});
    }
  });
  
  return Array.from(domains.entries()).sort((a, b) => b[1].length - a[1].length);
};

const SourcesList = ({ sources, findings = [], rawData = {} }: SourcesListProps) => {
  const [groupByDomain, setGroupByDomain] = useState(false);
  
  // Combine sources and findings, prioritizing findings
  const allSources: Array<{ url: string; content?: string; isFinding: boolean; finding?: any }> = [];
  
  // Add findings first
  findings.forEach(finding => {
    allSources.push({
      url: finding.source,
      content: finding.content,
      isFinding: true,
      finding: finding.finding
    });
  });
  
  // Add remaining sources that aren't already in findings
  sources.forEach(source => {
    if (!allSources.some(item => item.url === source)) {
      allSources.push({ url: source, isFinding: false });
    }
  });
  
  if (allSources.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No sources available yet.</p>
      </div>
    );
  }

  const domainGroups = groupByDomain ? groupSourcesByDomain(allSources) : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {allSources.length} sources found
          {findings.length > 0 && ` (including ${findings.length} findings)`}
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setGroupByDomain(!groupByDomain)}
          className="text-xs"
        >
          {groupByDomain ? "List view" : "Group by domain"}
        </Button>
      </div>
      
      {groupByDomain ? (
        // Grouped by domain view
        <div className="space-y-6">
          {domainGroups?.map(([domain, items]) => (
            <div key={domain} className="space-y-2">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                {getDomainIcon(`https://${domain}`)}
                <span>{domain}</span>
                <Badge variant="outline" className="ml-1">{items.length}</Badge>
              </h4>
              <div className="space-y-2 ml-1">
                {items.map((item, idx) => (
                  <SourceItem 
                    key={idx} 
                    url={item.url} 
                    content={item.content} 
                    isFinding={item.isFinding}
                    index={item.index}
                    finding={item.finding}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List view
        <div className="space-y-3">
          {allSources.map((source, index) => (
            <SourceItem 
              key={index} 
              url={source.url} 
              content={source.content} 
              isFinding={source.isFinding}
              index={index}
              finding={source.finding}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SourcesList;
