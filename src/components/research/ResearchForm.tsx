import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { getUserModels } from "@/services/userModelService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ResearchFormProps {
  onSubmit: (query: string, userModelText: string, useCase: string, selectedModelId?: string, currentUnderstanding?: string) => Promise<void>;
  isLoading: boolean;
  initialObjective?: string;
  setResearchObjective?: React.Dispatch<React.SetStateAction<string>>;
  selectedLLM?: string;
  setSelectedLLM?: React.Dispatch<React.SetStateAction<string>>;
}

export const ResearchForm: React.FC<ResearchFormProps> = ({ 
  onSubmit, 
  isLoading, 
  initialObjective = '',
  setResearchObjective,
  selectedLLM = 'claude-3.5-sonnet',
  setSelectedLLM
}) => {
  const [query, setQuery] = useState(initialObjective);
  const [userModelText, setUserModelText] = useState("");
  const [useCase, setUseCase] = useState("");
  const [userModels, setUserModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  const [currentUnderstanding, setCurrentUnderstanding] = useState("");

  useEffect(() => {
    if (initialObjective) {
      setQuery(initialObjective);
      if (setResearchObjective) {
        setResearchObjective(initialObjective);
      }
    }
  }, [initialObjective, setResearchObjective]);

  useEffect(() => {
    const fetchUserModels = async () => {
      try {
        const models = await getUserModels();
        setUserModels(models);
      } catch (error) {
        console.error("Error fetching user models:", error);
      }
    };

    fetchUserModels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setResearchObjective) {
      setResearchObjective(query);
    }
    await onSubmit(query, userModelText, useCase, selectedModelId, currentUnderstanding);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-center space-x-4">
        <Input
          type="text"
          placeholder="Enter your research objective"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Select onValueChange={setSelectedLLM} defaultValue={selectedLLM}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select LLM" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={isLoading}>
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
    </div>
  );
};
