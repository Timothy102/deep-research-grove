
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ResearchOutputProps {
  output: string;
  isLoading?: boolean;
  userName?: string;
  userModels?: any[];
  onSelectModel?: (modelId: string) => void;
}

const ResearchOutput: React.FC<ResearchOutputProps> = ({ 
  output, 
  isLoading = false, 
  userName,
  userModels = [],
  onSelectModel
}) => {
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
      <div className="text-center space-y-6">
        {userName ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Hey, {userName}</h2>
            <p className="text-muted-foreground text-lg">Who are you today?</p>
            
            {userModels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-4xl mx-auto mt-4">
                {userModels.map((model) => (
                  <Card 
                    key={model.id} 
                    className="cursor-pointer hover:border-primary transition-colors duration-200"
                    onClick={() => onSelectModel && onSelectModel(model.id)}
                  >
                    <CardContent className="p-2 flex items-center justify-between">
                      <span className="text-sm truncate">{model.name}</span>
                      {model.is_default && (
                        <Badge variant="outline" className="text-xs ml-1 px-1 py-0">Default</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground mt-4">
                <p>No user models found. Create one to get started!</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No research output yet. Start a search to see results here.</p>
        )}
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
