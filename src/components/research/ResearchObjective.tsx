
import React, { useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';

interface ResearchObjectiveProps {
  objective: string;
  onObjectiveChange: (objective: string) => void;
  onValidityChange: (isValid: boolean) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isActive: boolean;
  isObjectiveValid: boolean;
  researchObjectiveRef: React.RefObject<HTMLTextAreaElement>;
}

export const ResearchObjective: React.FC<ResearchObjectiveProps> = ({
  objective,
  onObjectiveChange,
  onValidityChange,
  onSubmit,
  isLoading,
  isActive,
  isObjectiveValid,
  researchObjectiveRef
}) => {
  // Validate objective when it changes
  useEffect(() => {
    const isValid = objective.trim().length >= 10 && objective.trim().length <= 500;
    onValidityChange(isValid);
  }, [objective, onValidityChange]);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onObjectiveChange(e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && isObjectiveValid && !isLoading) {
      e.preventDefault();
      onSubmit();
    }
  };
  
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <Textarea
          ref={researchObjectiveRef}
          value={objective}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter your research objective or question..."
          className="min-h-[100px] resize-none text-base"
          disabled={isLoading}
        />
        
        {objective.length > 0 && (
          <div className="flex justify-end mt-2">
            <span className={`text-xs ${objective.length > 500 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {objective.length}/500
            </span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={!isObjectiveValid || isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Start Research
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
