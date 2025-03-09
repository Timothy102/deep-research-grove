
import { ExternalLink, Globe, Search, BookOpen, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Finding {
  source: string;
  content?: string;
}

interface SourcesListProps {
  sources: string[];
  findings?: Finding[];
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

// Function to get icon based on domain
const getDomainIcon = (url: string) => {
  const domain = extractDomain(url).toLowerCase();
  
  if (domain.includes('wikipedia')) return <Globe className="h-3 w-3" />;
  if (domain.includes('stackexchange') || domain.includes('stackoverflow')) return <Search className="h-3 w-3" />;
  if (domain.includes('academic') || domain.includes('science') || domain.includes('research')) return <BookOpen className="h-3 w-3" />;
  
  return <FileText className="h-3 w-3" />;
};

const SourcesList = ({ sources, findings = [] }: SourcesListProps) => {
  // Combine sources and findings, prioritizing findings
  const allSources: Array<{ url: string; content?: string; isFinding: boolean }> = [];
  
  // Add findings first
  findings.forEach(finding => {
    allSources.push({
      url: finding.source,
      content: finding.content,
      isFinding: true
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

  return (
    <div className="space-y-3">
      {allSources.map((source, index) => (
        <div 
          key={index} 
          className={cn(
            "flex flex-col p-3 rounded-md border transition-all hover:shadow-sm",
            source.isFinding && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900"
          )}
        >
          <div className="flex items-center gap-2">
            <Badge 
              className={cn(
                "h-6 w-6 p-0 flex items-center justify-center shrink-0",
                source.isFinding 
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" 
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
              )}
            >
              {index + 1}
            </Badge>
            
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5">
                {source.isFinding && (
                  <Badge variant="outline" className="h-5 py-0 px-1.5 text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    finding
                  </Badge>
                )}
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
                >
                  {source.url}
                </a>
              </div>
              
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                {getDomainIcon(source.url)}
                <span className="ml-1">{extractDomain(source.url)}</span>
              </div>
            </div>
            
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          
          {source.content && (
            <div className="mt-2 ml-8 text-sm text-muted-foreground bg-muted-foreground/5 p-3 rounded border border-muted-foreground/10">
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2">
                {source.content}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SourcesList;
