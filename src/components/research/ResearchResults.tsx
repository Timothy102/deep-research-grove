
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
              className="flex items-center justify-between p-3 rounded-md source-item neo-morphism bg-background"
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
              <div className="flex-1 p-3 rounded-md bg-background neo-morphism">
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

  return (
    <div ref={resultRef} className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">Research Results</h2>
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
