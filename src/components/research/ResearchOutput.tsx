
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
      <div className="flex flex-col items-center justify-center text-center h-full py-20">
        <div className="text-4xl mb-4">✨</div>
        <h2 className="text-2xl font-medium text-slate-700 mb-2">Welcome</h2>
        <p className="text-slate-500 max-w-md">
          Start a search to see research results here.
        </p>
      </div>
    );
  }

  return (
    <div className="prose prose-slate max-w-none">
      <div className="whitespace-pre-wrap">{output}</div>
    </div>
  );
};

export default ResearchOutput;
