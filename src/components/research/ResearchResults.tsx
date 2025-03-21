
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Copy, CheckCircle2, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

export type Finding = {
  content: string;
  source: string;
};

export type ResearchResult = {
  query: string;
  answer: string;
  sources: string[];
  reasoning_path: string[];
  confidence: number;
  session_id?: string;
};

const SourcesList = ({ sources }: { sources: string[] }) => {
  return (
    <div className="mt-4 space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground mb-2">Sources:</h3>
      <div className="space-y-2">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sources yet</p>
        ) : (
          sources.map((source, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 rounded-md source-item neo-morphism bg-background border border-muted-foreground/10"
            >
              <span className="text-sm truncate flex-1">{source}</span>
              <a 
                href={source} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-2 text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ReasoningPath = ({ path }: { path: string[] }) => {
  // Pre-defined colors for reasoning path steps to ensure persistence
  const stepTypes = [
    { pattern: "search", color: "bg-violet-100 dark:bg-violet-900/80 border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-300" },
    { pattern: "reason", color: "bg-amber-100 dark:bg-amber-900/80 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300" },
    { pattern: "synthe", color: "bg-emerald-100 dark:bg-emerald-900/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300" },
    { pattern: "read", color: "bg-blue-100 dark:bg-blue-900/80 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300" },
    { pattern: "objective", color: "bg-indigo-100 dark:bg-indigo-900/80 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300" },
    { pattern: "plan", color: "bg-sky-100 dark:bg-sky-900/80 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-300" }
  ];

  const getStepColor = (step: string): string => {
    const stepLower = step.toLowerCase();
    const matchedType = stepTypes.find(type => stepLower.includes(type.pattern));
    return matchedType ? matchedType.color : "bg-gray-100 dark:bg-gray-800/90 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-300";
  };

  return (
    <div className="mt-4">
      <h3 className="font-medium text-sm text-muted-foreground mb-2">Reasoning Path:</h3>
      <div className="space-y-2 mt-2">
        {path.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reasoning path available</p>
        ) : (
          path.map((step, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium">{index + 1}</span>
              </div>
              <div className={`flex-1 p-3 rounded-md border-l-4 ${getStepColor(step)}`}>
                <p className="text-sm">{step}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ResearchAnswer = ({ answer }: { answer: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="relative mt-4">
      <div className="absolute top-2 right-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={copyToClipboard} 
          className="h-8 w-8 p-0"
        >
          {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
        </Button>
      </div>
      <div className="p-4 rounded-md bg-background neo-morphism overflow-auto max-h-[500px]">
        <p className="text-sm whitespace-pre-wrap">{answer}</p>
      </div>
    </div>
  );
};

const ResearchResults = ({ result }: { result: ResearchResult | null }) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [result]);

  if (!result) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No research results yet. Start a query to see results here.</p>
      </div>
    );
  }

  const handleSessionClick = () => {
    if (result.session_id) {
      navigate(`/research/${result.session_id}`);
    }
  };

  return (
    <div ref={resultRef} className="animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-1">Research Results</h2>
          {result.session_id && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1 text-primary"
              onClick={handleSessionClick}
            >
              <MessageSquare className="h-4 w-4" />
              <span>View Session</span>
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Query: {result.query}</p>
      </div>

      <Tabs defaultValue="answer">
        <TabsList className="mb-4">
          <TabsTrigger value="answer">Answer</TabsTrigger>
          <TabsTrigger value="sources">Sources ({result.sources.length})</TabsTrigger>
          <TabsTrigger value="reasoning">Reasoning Path</TabsTrigger>
        </TabsList>
        
        <TabsContent value="answer">
          <ResearchAnswer answer={result.answer} />
        </TabsContent>
        
        <TabsContent value="sources">
          <SourcesList sources={result.sources} />
        </TabsContent>
        
        <TabsContent value="reasoning">
          <ReasoningPath path={result.reasoning_path} />
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 text-sm text-right text-muted-foreground">
        <span>Confidence score: {(result.confidence * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default ResearchResults;
