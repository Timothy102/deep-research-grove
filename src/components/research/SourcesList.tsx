
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Finding {
  source: string;
  content?: string;
}

interface SourcesListProps {
  sources: string[];
  findings?: Finding[];
}

const SourcesList = ({ sources, findings = [] }: SourcesListProps) => {
  // Combine sources and findings, prioritizing findings
  const allSources: Array<{ url: string; content?: string }> = [];
  
  // Add findings first
  findings.forEach(finding => {
    allSources.push({
      url: finding.source,
      content: finding.content
    });
  });
  
  // Add remaining sources that aren't already in findings
  sources.forEach(source => {
    if (!allSources.some(item => item.url === source)) {
      allSources.push({ url: source });
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
          className="flex flex-col p-3 rounded-md border transition-all hover:shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Badge 
              className="h-6 w-6 p-0 flex items-center justify-center shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
            >
              {index + 1}
            </Badge>
            <div className="flex-1 overflow-hidden">
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
              >
                {source.url}
              </a>
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
            <div className="mt-2 ml-8 text-sm text-muted-foreground bg-muted-foreground/5 p-2 rounded border border-muted-foreground/10">
              {source.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SourcesList;
