
import { useState } from "react";
import { Copy, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResearchOutputProps {
  output: string;
  isLoading?: boolean;
  rawFindings?: string; // Add support for displaying raw findings data
}

const ResearchOutput = ({ output, isLoading = false, rawFindings }: ResearchOutputProps) => {
  const [copied, setCopied] = useState(false);
  const [showRawFindings, setShowRawFindings] = useState(false);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  
  if (!output && !rawFindings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Research output will appear here after reasoning is complete...</p>
      </div>
    );
  }
  
  return (
    <div className="relative space-y-4">
      {/* Main research output */}
      <div className="relative">
        <div className="absolute top-3 right-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-8 w-8 p-0 rounded-full bg-background/80 backdrop-blur-sm"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="p-4 whitespace-pre-wrap text-sm rounded-md border">
          {isLoading && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {output}
        </div>
      </div>
      
      {/* Raw findings data section */}
      {rawFindings && (
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Raw Research Data</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowRawFindings(!showRawFindings)}
              className="text-xs"
            >
              {showRawFindings ? "Hide Details" : "Show Details"}
            </Button>
          </div>
          
          {showRawFindings && (
            <pre className="p-3 overflow-auto text-xs bg-zinc-950 text-zinc-200 dark:bg-zinc-900 rounded-md border border-zinc-800 max-h-[400px]">
              {rawFindings}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchOutput;
