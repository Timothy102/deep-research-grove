
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
            
            <div className="flex items-center justify-between mb-2 max-w-4xl mx-auto">
              <span className="text-sm text-muted-foreground">Your user models</span>
              <Button 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => navigate('/models')}
              >
                <Plus className="h-4 w-4" />
                <span>Create New</span>
              </Button>
            </div>
            
            {userModels && userModels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-4xl mx-auto">
                {userModels.map((model) => (
                  <Card 
                    key={model?.id || Math.random().toString()} 
                    className="cursor-pointer hover:border-primary transition-colors duration-200"
                    onClick={() => onSelectModel && model?.id && onSelectModel(model.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{model?.name || "Unnamed Model"}</span>
                          {model?.is_default && (
                            <Badge variant="outline" className="text-xs px-1 py-0">Default</Badge>
                          )}
                        </div>
                        
                        {model?.domain && (
                          <span className="text-xs text-muted-foreground truncate">
                            Domain: {model.domain}
                          </span>
                        )}
                        
                        {model?.expertise_level && (
                          <span className="text-xs text-muted-foreground truncate">
                            Expertise: {model.expertise_level}
                          </span>
                        )}
                        
                        {model?.cognitive_style && (
                          <span className="text-xs text-muted-foreground truncate">
                            Style: {model.cognitive_style}
                          </span>
                        )}
                      </div>
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
