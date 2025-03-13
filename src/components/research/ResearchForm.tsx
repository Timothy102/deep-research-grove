
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type ResearchFormProps = {
  onSubmit: (query: string, userModel: string, useCase: string) => void;
  isLoading: boolean;
};

export const ResearchForm = ({ onSubmit, isLoading }: ResearchFormProps) => {
  const [query, setQuery] = useState("");
  const [userModel, setUserModel] = useState("");
  const [useCase, setUseCase] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSubmit(query, userModel, useCase);
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
