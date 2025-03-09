
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SourcesList = ({ sources }: { sources: string[] }) => {
  if (!sources.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No sources available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((source, index) => (
        <div 
          key={index} 
          className="flex items-center gap-2 p-3 rounded-md border transition-all hover:shadow-sm"
        >
          <Badge 
            className="h-6 w-6 p-0 flex items-center justify-center shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
          >
            {index + 1}
          </Badge>
          <div className="flex-1 overflow-hidden">
            <a 
              href={source} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
            >
              {source}
            </a>
          </div>
          <a
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ))}
    </div>
  );
};

export default SourcesList;
