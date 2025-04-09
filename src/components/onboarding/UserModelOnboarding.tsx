import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createUserModel, markOnboardingCompleted } from "@/services/userModelService";

interface UserModelOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: (model: any) => void; 
  onComplete?: (model: any) => Promise<void>;
}

const UserModelOnboarding: React.FC<UserModelOnboardingProps> = ({ 
  isOpen, 
  onClose,
  onCompleted,
  onComplete
}) => {
  const [name, setName] = useState("");
  const [researchDepth, setResearchDepth] = useState("moderate");
  const [cognitiveStyle, setCognitiveStyle] = useState("");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!name || !researchDepth || !cognitiveStyle) {
        toast({
          title: "missing fields",
          description: "please fill out all fields",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const modelData = {
        name: name || `${researchDepth} research model`, 
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
              placeholder="e.g. my research assistant"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="researchDepth">research depth</Label>
            <Select
              value={researchDepth}
              onValueChange={setResearchDepth}
            >
              <SelectTrigger id="researchDepth">
                <SelectValue placeholder="Select research depth" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shallow">Shallow</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="deep">Deep</SelectItem>
              </SelectContent>
            </Select>
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
