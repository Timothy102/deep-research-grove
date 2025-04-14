
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ResearchFormProps {
  onSubmit: (query: string, userModelText: string, useCase: string, selectedModelId?: string, currentUnderstanding?: string) => Promise<void>;
  isLoading: boolean;
  initialObjective?: string;
  setResearchObjective?: React.Dispatch<React.SetStateAction<string>>;
  selectedLLM?: string;
  setSelectedLLM?: React.Dispatch<React.SetStateAction<string>>;
  initialValue?: string;
  initialDomain?: string;
  initialResearchDepth?: string;
  initialUserContext?: string;
  initialCognitiveStyle?: string;
  initialLLM?: string;
  onLLMChange?: React.Dispatch<React.SetStateAction<string>>;
  userModels?: any[];
  onModelSelect?: (modelId: string) => Promise<void> | void;
}

export const ResearchForm: React.FC<ResearchFormProps> = ({ 
  onSubmit, 
  isLoading, 
  initialObjective = '',
  setResearchObjective,
  selectedLLM = 'auto',
  setSelectedLLM,
  initialValue,
  initialDomain = '',
  initialResearchDepth = 'moderate',
  initialUserContext = '',
  initialCognitiveStyle = 'general',
  initialLLM,
  onLLMChange,
  userModels = [],
  onModelSelect
}) => {
  const [query, setQuery] = useState(initialObjective || initialValue || '');
  const [userModelText, setUserModelText] = useState("");
  const [useCase, setUseCase] = useState("");
  const [currentUnderstanding, setCurrentUnderstanding] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [domain, setDomain] = useState(initialDomain || '');
  const [researchDepth, setResearchDepth] = useState(initialResearchDepth || 'moderate');
  const [userContext, setUserContext] = useState(initialUserContext || '');
  const [cognitiveStyle, setCognitiveStyle] = useState(initialCognitiveStyle || 'general');

  useEffect(() => {
    if (initialObjective) {
      setQuery(initialObjective);
      if (setResearchObjective) {
        setResearchObjective(initialObjective);
      }
    } else if (initialValue) {
      setQuery(initialValue);
      if (setResearchObjective) {
        setResearchObjective(initialValue);
      }
    }
  }, [initialObjective, initialValue, setResearchObjective]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdvancedOpen(false);
    
    if (setResearchObjective) {
      setResearchObjective(query);
    }
    
    await onSubmit(
      query, 
      userModelText, 
      useCase, 
      undefined, // Removed selectedModelId 
      currentUnderstanding
    );
  };

  const handleLLMChange = (value: string) => {
    if (onLLMChange) {
      onLLMChange(value);
    } else if (setSelectedLLM) {
      setSelectedLLM(value);
    }
  };

  const getModelDisplayName = (modelId: string) => {
    const modelMap: Record<string, string> = {
      'auto': 'Auto',
      'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
      'o3-mini': 'GPT-4o Mini',
      'o1': 'GPT-4o',
      'gpt4-turbo': 'GPT-4 Turbo',
      'gemini-2.0-flash': 'Gemini 2.0 Flash',
      'gemini-2.0-flash-lite-preview-02-05': 'Gemini 2.0 Flash Lite',
      'gemini-2.0-flash-thinking-exp-01-21': 'Gemini 2.0 Flash Thinking',
      'deepseek-ai/DeepSeek-R1': 'DeepSeek R1'
    };
    
    return modelMap[modelId] || modelId;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 mt-10">
      <div className="text-center mb-5">
        <h1 className="text-3xl font-bold mb-2">Hey, Tim Cvetko</h1>
        <p className="text-gray-600">Who are you today?</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="border rounded-lg p-4 text-center">
          <p className="font-medium">student applying to masters</p>
          <p className="text-sm text-gray-500">Style: systematic</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="font-medium">perfumes</p>
          <p className="text-sm text-gray-500">Style: general</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <p className="font-medium">fitness enthusiast</p>
          <p className="text-sm text-gray-500">Style: practical</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="border rounded-lg p-4 text-center">
          <p className="font-medium">just an ai tinkerer</p>
          <p className="text-sm text-gray-500">Style: general</p>
        </div>
        <div className="border rounded-lg p-4 text-center relative">
          <p className="font-medium">computer vision researcher</p>
          <p className="text-sm text-gray-500">Style: practical</p>
          <span className="absolute right-2 top-2 text-xs bg-gray-100 px-2 py-0.5 rounded">Default</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Enter your research objective"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select 
          onValueChange={handleLLMChange} 
          defaultValue={initialLLM || selectedLLM || "auto"}
          value={initialLLM || selectedLLM}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Auto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{getModelDisplayName('auto')}</SelectItem>
            <SelectItem value="claude-3.5-sonnet">{getModelDisplayName('claude-3.5-sonnet')}</SelectItem>
            <SelectItem value="o3-mini">{getModelDisplayName('o3-mini')}</SelectItem>
            <SelectItem value="o1">{getModelDisplayName('o1')}</SelectItem>
            <SelectItem value="gpt4-turbo">{getModelDisplayName('gpt4-turbo')}</SelectItem>
            <SelectItem value="gemini-2.0-flash">{getModelDisplayName('gemini-2.0-flash')}</SelectItem>
            <SelectItem value="gemini-2.0-flash-lite-preview-02-05">{getModelDisplayName('gemini-2.0-flash-lite-preview-02-05')}</SelectItem>
            <SelectItem value="gemini-2.0-flash-thinking-exp-01-21">{getModelDisplayName('gemini-2.0-flash-thinking-exp-01-21')}</SelectItem>
            <SelectItem value="deepseek-ai/DeepSeek-R1">{getModelDisplayName('deepseek-ai/DeepSeek-R1')}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={isLoading} className="bg-black text-white px-4 hover:bg-black/90">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              researching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              research
            </>
          )}
        </Button>
      </form>

      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen} className="mt-4">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center w-full justify-between">
            <span>Advanced options</span>
            {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="research-depth">Research Depth</Label>
              <Select value={researchDepth} onValueChange={setResearchDepth}>
                <SelectTrigger id="research-depth">
                  <SelectValue placeholder="Select research depth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shallow">Shallow</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="deep">Deep</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cognitive-style">Cognitive Style</Label>
              <Select value={cognitiveStyle} onValueChange={setCognitiveStyle}>
                <SelectTrigger id="cognitive-style">
                  <SelectValue placeholder="Select cognitive style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="systematic">Systematic</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="first-principles">First Principles</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="practical">Practical Applier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2 col-span-full">
            <Label htmlFor="current-understanding">Current Understanding (Optional)</Label>
            <Textarea
              id="current-understanding"
              placeholder="Describe your current understanding of the topic..."
              value={currentUnderstanding}
              onChange={(e) => setCurrentUnderstanding(e.target.value)}
              rows={3}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      <div className="fixed bottom-10 right-10 bg-white rounded-lg border p-4 shadow-md w-80">
        <p className="font-semibold">Signed in successfully</p>
        <p className="text-sm text-gray-600">Welcome to Deep Research!</p>
      </div>
    </div>
  );
};
