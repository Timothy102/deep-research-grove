
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, MessageCircleQuestion } from 'lucide-react';

interface ResearchAnswerProps {
  result: string | null;
  isLoading: boolean;
  errorMessage: string;
  sources: string[];
  activeSessionId: string | null;
  currentSessionStatus: string;
  onFeedbackFormToggle?: () => void;
}

export const ResearchAnswer: React.FC<ResearchAnswerProps> = ({
  result,
  isLoading,
  errorMessage,
  sources,
  activeSessionId,
  currentSessionStatus,
  onFeedbackFormToggle
}) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-8 w-8 mb-4 animate-spin text-primary" />
            <h3 className="text-lg font-medium mb-2">Researching...</h3>
            <p className="text-muted-foreground max-w-md">
              I'm searching and analyzing sources to provide a comprehensive answer.
              This might take a moment.
            </p>
          </div>
        </div>
      );
    }
    
    if (errorMessage) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="h-8 w-8 mb-4 text-destructive" />
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p className="text-muted-foreground max-w-md">{errorMessage}</p>
          </div>
        </div>
      );
    }
    
    if (!result) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center text-center">
            <MessageCircleQuestion className="h-8 w-8 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Research Yet</h3>
            <p className="text-muted-foreground max-w-md">
              Enter your research objective and click "Start Research" to begin exploring.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="py-4">
        <div className="prose dark:prose-invert max-w-none">
          {result}
        </div>
      </div>
    );
  };
  
  return <div className="overflow-auto">{renderContent()}</div>;
};
