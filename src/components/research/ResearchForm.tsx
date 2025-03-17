import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, HelpCircle } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserModel, getUserModels, getDefaultUserModel } from "@/services/userModelService";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const exampleObjective = `I was always interested as to why life needs to exist. Which biological/thermodynamical processes were in play that explain why we need to survive? My objective comes from curiosity, I'd love to understand the fundamentals behind this research objective. Feel free to synthesize more than one theory.`;

type ResearchFormProps = {
  onSubmit: (query: string, userModel: string, useCase: string, selectedModelId?: string, currentUnderstanding?: string) => void;
  isLoading: boolean;
};

export const ResearchForm = ({ onSubmit, isLoading }: ResearchFormProps) => {
  const [query, setQuery] = useState("");
  const [currentUnderstanding, setCurrentUnderstanding] = useState("");
  const [userModel, setUserModel] = useState("");
  const [useCase, setUseCase] = useState("");
  const [userModels, setUserModels] = useState<UserModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedLLM, setSelectedLLM] = useState("claude-3.5-sonnet");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showExample, setShowExample] = useState(false);

  useEffect(() => {
    loadUserModels();
  }, []);

  const loadUserModels = async () => {
    setIsLoadingModels(true);
    try {
      const models = await getUserModels();
      setUserModels(models);
      
      const defaultModel = await getDefaultUserModel();
      if (defaultModel?.id) {
        setSelectedModelId(defaultModel.id);
      } else if (models.length > 0 && models[0].id) {
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
    onSubmit(query, userModel, useCase, selectedModelId, currentUnderstanding);
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

  const handleModelChange = (value: string) => {
    setSelectedModelId(value === "custom" ? "" : value);
  };

  const llmOptions = [
    { value: "claude-3.5-sonnet", label: "claude 3.5 sonnet" },
    { value: "claude-3-opus", label: "claude 3 opus" },
    { value: "claude-3-haiku", label: "claude 3 haiku" },
    { value: "deepseek-coder", label: "deepseek coder" },
    { value: "mixtral-8x7b", label: "mixtral 8x7b" },
    { value: "llama-3", label: "llama 3" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Research Objective Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="research-objective" className="text-base font-medium lowercase">
              research objective
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-0 h-auto"
                    onClick={() => setShowExample(!showExample)}
                    type="button"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="lowercase">click to see an example research objective</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowExample(!showExample)}
            className="text-sm text-muted-foreground hover:text-foreground lowercase"
          >
            {showExample ? "hide example" : "show example"}
          </Button>
        </div>
        
        {showExample && (
          <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            {exampleObjective}
          </div>
        )}
        
        <Textarea
          id="research-objective"
          placeholder="What do you want to research? Be specific about your objectives and desired outcomes."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-24 resize-none"
          required
        />
      </div>

      {/* Current Understanding Section */}
      <div className="space-y-2">
        <Label htmlFor="current-understanding" className="text-base font-medium lowercase">
          current understanding
        </Label>
        <Textarea
          id="current-understanding"
          placeholder="What do you already know about this topic? Explain in 2-5 sentences."
          value={currentUnderstanding}
          onChange={(e) => setCurrentUnderstanding(e.target.value)}
          className="min-h-20 resize-none"
        />
      </div>

      {/* Model Selection Section */}
      <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="research-model" className="text-base font-medium lowercase">
            research model
          </Label>
          <Select 
            value={selectedModelId || "custom"} 
            onValueChange={handleModelChange}
            disabled={isLoadingModels}
          >
            <SelectTrigger id="research-model" className="w-full">
              <SelectValue placeholder="select a research model" className="lowercase" />
            </SelectTrigger>
            <SelectContent>
              {userModels.map(model => (
                <SelectItem 
                  key={model.id} 
                  value={model.id || `model-${Date.now()}`}
                  className="lowercase whitespace-normal"
                >
                  {model.name?.toLowerCase()} {model.is_default ? "(default)" : ""}
                </SelectItem>
              ))}
              <SelectItem value="custom" className="lowercase">none (custom)</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedModelId && (
            <div className="text-sm text-muted-foreground mt-1 bg-muted p-2 rounded lowercase">
              {getSelectedModelDetails() && (
                <>
                  <span className="font-medium">model details: </span>
                  {getSelectedModelDetails()?.domain}, {getSelectedModelDetails()?.expertise_level} level,{" "}
                  {getSelectedModelDetails()?.cognitive_style} cognitive style
                  {getSelectedModelDetails()?.included_sources && 
                   getSelectedModelDetails()?.included_sources.length > 0 && 
                   `, ${getSelectedModelDetails()?.included_sources.length} sources`}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* LLM Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="llm-model" className="text-base font-medium lowercase">
            llm model
          </Label>
          <Select 
            value={selectedLLM} 
            onValueChange={setSelectedLLM}
          >
            <SelectTrigger id="llm-model" className="w-full">
              <SelectValue placeholder="select an llm model" className="lowercase" />
            </SelectTrigger>
            <SelectContent>
              {llmOptions.map(option => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  className="lowercase"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full transition-all duration-300 hover:scale-[1.02] lowercase" 
        disabled={isLoading || !query.trim()}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> researching...
          </>
        ) : (
          "start research"
        )}
      </Button>
    </form>
  );
};
