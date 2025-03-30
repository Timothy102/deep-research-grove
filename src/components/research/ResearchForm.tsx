
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { getUserModelById } from '@/services/userModelService';
import { getUserModels } from '@/services/userModelService';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast";
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

interface ResearchFormProps {
  isLoading: boolean;
  initialValue?: string;
  initialDomain?: string;
  initialExpertiseLevel?: string;
  initialUserContext?: string;
  initialCognitiveStyle?: string;
  initialLLM?: string;
  onLLMChange?: (llm: string) => void;
  onSubmit: (query: string, userModelText: string, useCase: string, selectedModelId?: string, currentUnderstanding?: string) => void;
  setResearchObjective: (value: string) => void;
  simplified?: boolean;
}

const formSchema = z.object({
  domain: z.string().min(2, {
    message: "Domain must be at least 2 characters.",
  }),
  expertiseLevel: z.string().min(2, {
    message: "Expertise level must be at least 2 characters.",
  }),
  userContext: z.string().min(10, {
    message: "User context must be at least 10 characters.",
  }),
  cognitiveStyle: z.string().min(2, {
    message: "Cognitive style must be at least 2 characters.",
  }),
  includedSources: z.array(z.string()).optional(),
  sourcePriorities: z.array(z.number()).optional(),
  useCase: z.string().min(2, {
    message: "Use case must be at least 2 characters.",
  }),
  currentUnderstanding: z.string().optional(),
})

export const ResearchForm: React.FC<ResearchFormProps> = ({ 
  isLoading,
  initialValue = '',
  initialDomain = '',
  initialExpertiseLevel = '',
  initialUserContext = '',
  initialCognitiveStyle = '',
  initialLLM = 'auto',
  onLLMChange,
  onSubmit,
  setResearchObjective,
  simplified = false
}) => {
  const [query, setQuery] = useState(initialValue);
  const [userModels, setUserModels] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);
  const [userModelDetails, setUserModelDetails] = useState<any>(null);
  const [useCase, setUseCase] = useState('research');
  const [currentUnderstanding, setCurrentUnderstanding] = useState('');
  const { toast } = useToast()
  
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);
  
  useEffect(() => {
    const loadUserModels = async () => {
      try {
        const models = await getUserModels();
        setUserModels(models);
        
        if (models.length > 0) {
          setSelectedModelId(models[0].id);
          await loadUserModelDetails(models[0].id);
        }
      } catch (error) {
        console.error("Error loading user models:", error);
      }
    };
    
    loadUserModels();
  }, []);
  
  const loadUserModelDetails = async (modelId: string) => {
    try {
      const model = await getUserModelById(modelId);
      setUserModelDetails(model);
    } catch (error) {
      console.error("Error loading user model details:", error);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    const userModelText = JSON.stringify({
      domain: initialDomain || userModelDetails?.domain || '',
      expertise_level: initialExpertiseLevel || userModelDetails?.expertise_level || '',
      cognitiveStyle: initialCognitiveStyle || userModelDetails?.cognitive_style || '',
      session_id: '', // Will be set by the handler
    });
    
    onSubmit(query, userModelText, useCase, selectedModelId, currentUnderstanding);
  };
  
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    setResearchObjective(e.target.value);
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      domain: initialDomain,
      expertiseLevel: initialExpertiseLevel,
      userContext: initialUserContext,
      cognitiveStyle: initialCognitiveStyle,
      useCase: useCase,
      currentUnderstanding: currentUnderstanding,
    },
  })
  
  function onSubmitForm(values: z.infer<typeof formSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    })
  }
  
  if (simplified) {
    return (
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <Input
            placeholder="How can I help you today?"
            value={query}
            onChange={handleQueryChange}
            disabled={isLoading}
            className="pr-20 py-6 text-base rounded-xl bg-slate-50 border-slate-200"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-slate-900 hover:bg-slate-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    );
  }
  
  // Render the full form with all options if not simplified
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domain</FormLabel>
                <FormControl>
                  <Input placeholder="deep research" {...field} value={initialDomain} onChange={(e) => {
                    form.setValue("domain", e.target.value)
                  }}/>
                </FormControl>
                <FormDescription>
                  What field of study are you researching?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expertiseLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expertise Level</FormLabel>
                <FormControl>
                  <Input placeholder="expert" {...field} value={initialExpertiseLevel} onChange={(e) => {
                    form.setValue("expertiseLevel", e.target.value)
                  }}/>
                </FormControl>
                <FormDescription>
                  What is your level of expertise in this field?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="userContext"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Context</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="I am a researcher looking for information on..."
                  className="resize-none"
                  {...field}
                  value={initialUserContext}
                  onChange={(e) => {
                    form.setValue("userContext", e.target.value)
                  }}
                />
              </FormControl>
              <FormDescription>
                What is your context for this research?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cognitiveStyle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cognitive Style</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={initialCognitiveStyle}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a cognitive style" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="analytical">Analytical</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="practical">Practical</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  What is your preferred cognitive style?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="useCase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Use Case</FormLabel>
                <FormControl>
                  <Input placeholder="research" {...field} value={useCase} onChange={(e) => {
                    setUseCase(e.target.value);
                    form.setValue("useCase", e.target.value)
                  }}/>
                </FormControl>
                <FormDescription>
                  What is the use case for this research?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="relative mt-4">
          <Input
            placeholder="How can I help you today?"
            value={query}
            onChange={handleQueryChange}
            disabled={isLoading}
            className="pr-20 py-6 text-base"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
};
