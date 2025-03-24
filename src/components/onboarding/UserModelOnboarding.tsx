
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
  onCompleted?: () => void;
}

const UserModelOnboarding: React.FC<UserModelOnboardingProps> = ({ 
  isOpen, 
  onClose,
  onCompleted 
}) => {
  const [domain, setDomain] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState("");
  const [cognitiveStyle, setCognitiveStyle] = useState("");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!domain || !expertiseLevel || !cognitiveStyle) {
        toast({
          title: "missing fields",
          description: "please fill out all fields",
          variant: "destructive",
        });
        return;
      }

      await createUserModel({
        name: `${domain} model`, // Adding a default name based on domain
        domain,
        expertise_level: expertiseLevel,
        cognitive_style: cognitiveStyle,
      });

      await markOnboardingCompleted();

      toast({
        title: "model created",
        description: "your user model has been created",
      });
      onClose();
      if (onCompleted) {
        onCompleted();
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
            <Label htmlFor="domain">domain</Label>
            <Input
              id="domain"
              placeholder="e.g. artificial intelligence"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expertise">expertise level</Label>
            <Input
              id="expertise"
              placeholder="e.g. beginner"
              value={expertiseLevel}
              onChange={(e) => setExpertiseLevel(e.target.value)}
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
