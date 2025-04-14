
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createUserModel, markOnboardingCompleted } from "@/services/userModelService";
import { cn } from '@/lib/utils';

interface UserModelOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: (model: any) => void; 
  onComplete?: (model: any) => Promise<void>;
}

const UserModelOnboarding: React.FC<UserModelOnboardingProps> = ({ 
  isOpen, 
  onClose = () => {},
  onCompleted,
  onComplete
}) => {
  const [name, setName] = useState("My Research Model"); // Added default name since we're removing domain
  const [researchDepth, setResearchDepth] = useState(""); 
  const [cognitiveStyle, setCognitiveStyle] = useState("");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!researchDepth || !cognitiveStyle) {
        toast({
          title: "missing fields",
          description: "please fill out all fields",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const modelData = {
        name,
        research_depth: researchDepth,
        cognitive_style: cognitiveStyle,
      };

      const createdModel = await createUserModel(modelData);

      await markOnboardingCompleted();

      toast({
        title: "model created",
        description: "your user model has been created",
      });
      
      onClose();
      
      if (onCompleted) {
        onCompleted(createdModel);
      }
      
      if (onComplete) {
        await onComplete(createdModel);
      }
    } catch (error) {
      console.error("Error creating user model:", error);
      toast({
        title: "error creating model",
        description: "there was an error creating your user model",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>tell us about you</DialogTitle>
          <DialogDescription>
            create a user model to help us tailor your research experience.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">model name</Label>
            <Input
              id="name"
              placeholder="e.g. My Research Model"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="researchDepth">research depth</Label>
            <Input
              id="researchDepth"
              placeholder="e.g. beginner"
              value={researchDepth}
              onChange={(e) => setResearchDepth(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cognitiveStyle">cognitive style</Label>
            <Textarea
              id="cognitiveStyle"
              placeholder="e.g. i prefer concise answers"
              value={cognitiveStyle}
              onChange={(e) => setCognitiveStyle(e.target.value)}
              className="resize-none"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                creating model...
              </>
            ) : (
              <>create model</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserModelOnboarding;
