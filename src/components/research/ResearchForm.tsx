
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ResearchFormProps {
  query: string;
  isLoading?: boolean;
  requireHumanApproval: boolean;
  maxSteps: number;
  onRequireApprovalChange: (value: boolean) => void;
  onMaxStepsChange: (value: number) => void;
  onSubmit: (query: string) => void;
}

export const ResearchForm = ({ 
  query: initialQuery = "", 
  isLoading = false,
  requireHumanApproval,
  maxSteps,
  onRequireApprovalChange,
  onMaxStepsChange,
  onSubmit 
}: ResearchFormProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [userModel, setUserModel] = useState("");
  const [useCase, setUseCase] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    onSubmit(query);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Enter your research query..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-24 resize-none"
          required
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Input
            placeholder="User model (e.g. entrepreneur, researcher)"
            value={userModel}
            onChange={(e) => setUserModel(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Use case (e.g. market research, academic)"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch 
            id="human-approval" 
            checked={requireHumanApproval}
            onCheckedChange={onRequireApprovalChange}
          />
          <Label htmlFor="human-approval">Require human approval</Label>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="max-steps">Max steps: {maxSteps}</Label>
          <Slider 
            id="max-steps"
            min={5} 
            max={50} 
            step={5}
            value={[maxSteps]} 
            onValueChange={(vals) => onMaxStepsChange(vals[0])} 
          />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full transition-all duration-300 hover:scale-[1.02]" 
        disabled={isLoading || !query.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Researching...
          </>
        ) : (
          "Start Research"
        )}
      </Button>
    </form>
  );
};

export default ResearchForm;
