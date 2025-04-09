
import { useState, useEffect } from "react";
import { UserModel, UserModelSourcePriority } from "@/services/userModelService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Loader2, Plus, X, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define your research depths and cognitive styles
const researchDepths = ["shallow", "moderate", "deep"]; // Changed from expertise_levels to researchDepths
const cognitiveStyles = [
  { id: "systematic", label: "systematic" },
  { id: "general", label: "general" },
  { id: "first-principles", label: "first-principles" },
  { id: "creative", label: "creative" },
  { id: "practical", label: "practical applier" },
];

interface UserModelFormProps {
  initialData?: UserModel;
  onSubmit: (data: UserModel) => Promise<void>;
  isSubmitting: boolean;
}

const UserModelForm = ({ initialData, onSubmit, isSubmitting }: UserModelFormProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(initialData?.name || "");
  const [domain, setDomain] = useState(initialData?.domain || "");
  const [researchDepth, setResearchDepth] = useState(initialData?.research_depth || "moderate"); // Changed from expertiseLevel to researchDepth
  const [cognitiveStyle, setCognitiveStyle] = useState(initialData?.cognitive_style || "general");
  const [includedSources, setIncludedSources] = useState<string[]>(initialData?.included_sources || []);
  const [currentSource, setCurrentSource] = useState("");
  const [sourcePriorities, setSourcePriorities] = useState<UserModelSourcePriority[]>(
    initialData?.source_priorities || []
  );

  // Effect to ensure source priorities are initialized from included sources
  useEffect(() => {
    if (initialData?.included_sources && initialData.included_sources.length > 0) {
      // If we have included sources but no priorities, initialize them
      if (!initialData.source_priorities || initialData.source_priorities.length === 0) {
        const priorities = initialData.included_sources.map((url, index) => ({
          url,
          priority: index + 1
        }));
        setSourcePriorities(priorities);
      }
    }
  }, [initialData]);

  const addSource = () => {
    if (!currentSource.trim()) return;
    
    try {
      // Basic URL validation
      new URL(currentSource);
      
      if (includedSources.includes(currentSource)) {
        toast({
          title: "Source already added",
          description: "This source is already in your list",
          variant: "destructive"
        });
        return;
      }
      
      const updatedSources = [...includedSources, currentSource];
      setIncludedSources(updatedSources);
      
      // Add to priorities at the end
      const newPriority = {
        url: currentSource,
        priority: sourcePriorities.length + 1
      };
      setSourcePriorities([...sourcePriorities, newPriority]);
      
      setCurrentSource("");
    } catch (e) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive"
      });
    }
  };

  const removeSource = (sourceUrl: string) => {
    const updatedSources = includedSources.filter(url => url !== sourceUrl);
    setIncludedSources(updatedSources);
    
    // Remove from priorities and reorder
    const updatedPriorities = sourcePriorities
      .filter(item => item.url !== sourceUrl)
      .map((item, index) => ({
        ...item,
        priority: index + 1
      }));
    
    setSourcePriorities(updatedPriorities);
  };

  const moveSourceUp = (index: number) => {
    if (index === 0) return;
    
    const newPriorities = [...sourcePriorities];
    const temp = newPriorities[index];
    newPriorities[index] = newPriorities[index - 1];
    newPriorities[index - 1] = temp;
    
    // Reassign priorities
    const updatedPriorities = newPriorities.map((item, idx) => ({
      ...item,
      priority: idx + 1
    }));
    
    setSourcePriorities(updatedPriorities);
  };

  const moveSourceDown = (index: number) => {
    if (index === sourcePriorities.length - 1) return;
    
    const newPriorities = [...sourcePriorities];
    const temp = newPriorities[index];
    newPriorities[index] = newPriorities[index + 1];
    newPriorities[index + 1] = temp;
    
    // Reassign priorities
    const updatedPriorities = newPriorities.map((item, idx) => ({
      ...item,
      priority: idx + 1
    }));
    
    setSourcePriorities(updatedPriorities);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !domain.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await onSubmit({
        ...initialData,
        name,
        domain,
        research_depth: researchDepth, // Changed from expertise_level to research_depth
        cognitive_style: cognitiveStyle,
        included_sources: includedSources,
        source_priorities: sourcePriorities
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "There was an error saving your model",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Model Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Research Model"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain">Your Domain/Field</Label>
          <Input
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. Computer Science, Medicine, Finance..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Research Depth</Label> {/* Changed from Expertise Level to Research Depth */}
          <div className="grid grid-cols-3 gap-2">
            {researchDepths.map((depth) => ( /* Changed from expertiseLevels to researchDepths */
              <div key={depth} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`depth-${depth}`} /* Changed from level to depth */
                  name="research-depth" /* Changed from expertise-level to research-depth */
                  className="radio"
                  value={depth}
                  checked={researchDepth === depth} /* Changed from expertiseLevel to researchDepth */
                  onChange={() => setResearchDepth(depth)} /* Changed from setExpertiseLevel to setResearchDepth */
                />
                <Label htmlFor={`depth-${depth}`} className="cursor-pointer"> {/* Changed from level to depth */}
                  {depth}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Cognitive Style</Label>
          <RadioGroup 
            value={cognitiveStyle} 
            onValueChange={setCognitiveStyle}
            className="grid grid-cols-2 md:grid-cols-3 gap-2"
          >
            {cognitiveStyles.map((style) => (
              <div key={style.id} className="flex items-center space-x-2">
                <RadioGroupItem value={style.id} id={`style-${style.id}`} />
                <Label htmlFor={`style-${style.id}`} className="cursor-pointer">
                  {style.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Source Prioritization</CardTitle>
            <CardDescription>
              Add trusted sources and arrange them in order of priority
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={currentSource}
                onChange={(e) => setCurrentSource(e.target.value)}
                placeholder="https://example.com"
                className="flex-1"
              />
              <Button type="button" onClick={addSource} className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {sourcePriorities.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Priority Order (drag to reorder)</Label>
                <div className="border rounded-md">
                  {sourcePriorities.map((source, index) => (
                    <div
                      key={`${source.url}-${index}`}
                      className="flex items-center p-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center mr-2 text-muted-foreground">
                        <GripVertical className="h-5 w-5 cursor-grab" />
                        <span className="ml-1 text-sm font-medium">{index + 1}</span>
                      </div>
                      <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {source.url}
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSourceUp(index)}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveSourceDown(index)}
                          disabled={index === sourcePriorities.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSource(source.url)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Model"
        )}
      </Button>
    </form>
  );
};

export default UserModelForm;
