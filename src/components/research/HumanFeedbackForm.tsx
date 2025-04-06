
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface HumanFeedbackFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
  onFeedbackChange: (approved: boolean, comment: string) => void;
}

const HumanFeedbackForm: React.FC<HumanFeedbackFormProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  onFeedbackChange
}) => {
  const [approval, setApproval] = useState<string>('approved');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleApprovalChange = (value: string) => {
    setApproval(value);
    onFeedbackChange(value === 'approved', comment);
  };
  
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    onFeedbackChange(approval === 'approved', e.target.value);
  };
  
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit();
    } catch (error) {
      setError('Failed to submit feedback. Please try again.');
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogDescription>
            Your feedback helps improve the research process. Please review and provide your assessment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <RadioGroup
            value={approval}
            onValueChange={handleApprovalChange}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer transition-colors hover:bg-muted">
              <RadioGroupItem value="approved" id="approved" />
              <div className="flex flex-1 items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <Label htmlFor="approved" className="cursor-pointer">
                  <div className="font-medium">Approve</div>
                  <div className="text-sm text-muted-foreground">
                    The information is accurate and helpful
                  </div>
                </Label>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer transition-colors hover:bg-muted">
              <RadioGroupItem value="rejected" id="rejected" />
              <div className="flex flex-1 items-start space-x-3">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <Label htmlFor="rejected" className="cursor-pointer">
                  <div className="font-medium">Reject</div>
                  <div className="text-sm text-muted-foreground">
                    The information is incorrect or unhelpful
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
          
          <div className="space-y-2">
            <Label htmlFor="comment">Additional Comments</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={handleCommentChange}
              placeholder="Add any additional feedback or details..."
              className="min-h-[100px]"
            />
          </div>
          
          {error && (
            <div className="bg-destructive/10 p-3 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HumanFeedbackForm;
