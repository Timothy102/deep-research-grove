
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { UserModel, createUserModel, updateUserOnboardingStatus } from "@/services/userModelService";
import UserModelForm from "@/components/user-models/UserModelForm";
import { useToast } from "@/hooks/use-toast";

interface UserModelOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

const UserModelOnboarding = ({ isOpen, onClose, onCompleted }: UserModelOnboardingProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  
  const handleCreate = async (model: UserModel) => {
    setIsSubmitting(true);
    try {
      await createUserModel({ ...model, is_default: true });
      await updateUserOnboardingStatus(true);
      toast({
        title: "Model created",
        description: "Your research model has been created successfully",
      });
      onClose();
      if (onCompleted) {
        onCompleted();
      }
      navigate("/research");
    } catch (error) {
      console.error("Error creating model:", error);
      toast({
        title: "Error",
        description: "Failed to create model",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSkip = async () => {
    try {
      await updateUserOnboardingStatus(true);
      onClose();
      if (onCompleted) {
        onCompleted();
      }
      navigate("/research");
    } catch (error) {
      console.error("Error updating onboarding status:", error);
    }
  };
  
  if (step === 1) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to Deep Research</DialogTitle>
            <DialogDescription>
              Create a personalized research model to get better results
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p>
              A research model helps tailor your research experience to your specific domain,
              expertise level, and preferences. This improves the quality and relevance of your results.
            </p>
            <p className="text-muted-foreground">
              You can create multiple models later and switch between them based on your needs.
            </p>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSkip} className="sm:order-1 order-2">
              Skip for now
            </Button>
            <Button onClick={() => setStep(2)} className="sm:order-2 order-1">
              Create a Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Your Research Model</DialogTitle>
          <DialogDescription>
            Define your expertise and preferences to get better research results
          </DialogDescription>
        </DialogHeader>
        
        <UserModelForm 
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setStep(1)}>
            Back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserModelOnboarding;
