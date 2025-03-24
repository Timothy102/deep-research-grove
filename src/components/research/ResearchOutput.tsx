
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export interface ResearchOutputProps {
  output: string;
  isLoading?: boolean;
}

const ResearchOutput: React.FC<ResearchOutputProps> = ({ output, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!output.trim()) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <p>No research output yet. Start a search to see results here.</p>
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <div className="whitespace-pre-wrap">{output}</div>
    </div>
  );
};

export default ResearchOutput;
