
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Brain } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { UserModel, getUserModels, getDefaultUserModel } from "@/services/userModelService";

type ResearchFormProps = {
  onSubmit: (query: string, userModel: string, useCase: string, selectedModelId?: string) => void;
  isLoading: boolean;
};

export const ResearchForm = ({ onSubmit, isLoading }: ResearchFormProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [currentUnderstanding, setCurrentUnderstanding] = useState("");
  const [userModels, setUserModels] = useState<UserModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    loadUserModels();
  }, []);

  const loadUserModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await getUserModels();
      setUserModels(models);
      
      // Try to get default model
      const defaultModel = await getDefaultUserModel();
      if (defaultModel?.id) {
        setSelectedModelId(defaultModel.id);
      } else if (models.length > 0 && models[0].id) {
        // If no default, use first model
        setSelectedModelId(models[0].id);
      }
    } catch (error) {
      console.error("Error loading user models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSubmit(query, currentUnderstanding, "", selectedModelId);
  };

  const getSelectedModelDetails = () => {
    const selected = userModels.find(m => m.id === selectedModelId);
    if (!selected) return null;
    
    return {
      domain: selected.domain,
      expertise_level: selected.expertise_level,
      cognitive_style: selected.cognitive_style,
      included_sources: selected.included_sources,
      source_priorities: selected.source_priorities
    };
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="research-objective">Research Objective</Label>
        <Textarea
          id="research-objective"
          placeholder="Explain your research objective strongly and explain what would be your ideal outcome"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-24 resize-none"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="current-understanding">Current Understanding</Label>
        <Textarea
          id="current-understanding"
          placeholder="Explain in your own words what you already know about this topic. Use 2-5 sentences."
          value={currentUnderstanding}
          onChange={(e) => setCurrentUnderstanding(e.target.value)}
          className="min-h-20 resize-none"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1 mr-4">
          <Label htmlFor="model-select">Research Model</Label>
          <Select 
            value={selectedModelId} 
            onValueChange={setSelectedModelId}
            disabled={isLoadingModels}
          >
            <SelectTrigger id="model-select" className="w-full">
              <SelectValue placeholder="Select a research model" />
            </SelectTrigger>
            <SelectContent>
              {userModels.map(model => (
                <SelectItem key={model.id} value={model.id || ""}>
                  {model.name} {model.is_default ? "(Default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/models")}
          className="self-end"
        >
          <Brain className="mr-2 h-4 w-4" />
          Manage Models
        </Button>
      </div>
      
      {selectedModelId && (
        <div className="text-sm text-muted-foreground mt-1 bg-muted/40 p-3 rounded-md">
          {getSelectedModelDetails() && (
            <>
              <span className="font-medium">Selected model: </span>
              {getSelectedModelDetails()?.domain}, {getSelectedModelDetails()?.expertise_level} level,{" "}
              {getSelectedModelDetails()?.cognitive_style} cognitive style
              {getSelectedModelDetails()?.included_sources && 
               getSelectedModelDetails()?.included_sources.length > 0 && 
               `, ${getSelectedModelDetails()?.included_sources.length} trusted sources`}
            </>
          )}
        </div>
      )}
      
      {userModels.length === 0 && (
        <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
          You haven't created any research models yet. 
          <Button 
            variant="link" 
            className="px-1 h-auto text-amber-600" 
            onClick={() => navigate("/models")}
          >
            Create one now
          </Button>
          to personalize your research experience.
        </div>
      )}
      
      <Button 
        type="submit" 
        className="w-full transition-all duration-300 hover:scale-[1.02]" 
        disabled={isLoading || !query.trim() || (!selectedModelId && userModels.length > 0)}
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
