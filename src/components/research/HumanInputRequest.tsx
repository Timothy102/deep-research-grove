
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, MessageCircleQuestion } from 'lucide-react';

interface HumanInputRequestProps {
  humanInteractionRequest: string;
  onClose: () => void;
  onSubmit: (result: string) => Promise<void>;
}

const HumanInputRequest: React.FC<HumanInputRequestProps> = ({
  humanInteractionRequest,
  onClose,
  onSubmit
}) => {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  let parsedRequest;
  try {
    parsedRequest = JSON.parse(humanInteractionRequest);
  } catch (e) {
    parsedRequest = { content: 'Invalid request format' };
  }
  
  const handleSubmit = async () => {
    if (!response.trim()) {
      setError('Please provide a response');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onSubmit(response);
    } catch (error) {
      setError('Failed to submit your response. Please try again.');
      console.error('Error submitting human input:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-blue-500" />
          Human Input Required
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-md">
          <p className="font-medium mb-2">Question:</p>
          <p className="text-muted-foreground">{parsedRequest.content}</p>
        </div>
        
        <div>
          <p className="font-medium mb-2">Your Response:</p>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your response here..."
            className="min-h-[150px]"
          />
        </div>
        
        {error && (
          <div className="bg-destructive/10 p-3 rounded-md flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : (
            'Submit Response'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default HumanInputRequest;
