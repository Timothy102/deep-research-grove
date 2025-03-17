
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserModel, getUserModels, getDefaultUserModel } from "@/services/userModelService";

type ResearchFormProps = {
  onSubmit: (query: string, userModel: string, useCase: string, selectedModelId?: string) => void;
  isLoading: boolean;
};

export const ResearchForm = ({ onSubmit, isLoading }: ResearchFormProps) => {
  const [query, setQuery] = useState("");
  const [userModel, setUserModel] = useState("");
  const [useCase, setUseCase] = useState("");
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
    onSubmit(query, userModel, useCase, selectedModelId);
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
      
      {userModels.length > 0 && (
        <div className="space-y-2">
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
              <SelectItem value="">None (Custom)</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedModelId && (
            <div className="text-sm text-muted-foreground mt-1">
              {getSelectedModelDetails() && (
                <>
                  <span className="font-medium">Model details: </span>
                  {getSelectedModelDetails()?.domain}, {getSelectedModelDetails()?.expertise_level} level,
                  {getSelectedModelDetails()?.cognitive_style} cognitive style
                  {getSelectedModelDetails()?.included_sources && 
                   getSelectedModelDetails()?.included_sources.length > 0 && 
                   `, ${getSelectedModelDetails()?.included_sources.length} sources`}
                </>
              )}
            </div>
          )}
        </div>
      )}
      
      {!selectedModelId && (
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
      )}
      
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
