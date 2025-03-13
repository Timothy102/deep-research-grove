
import { useState } from "react";
import { Copy, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResearchOutputProps {
  output: string;
  isLoading?: boolean;
}

const ResearchOutput = ({ output, isLoading = false }: ResearchOutputProps) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  
  if (!output && !isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Research output will appear here after reasoning is complete...</p>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {!isLoading && (
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
      )}
      <div className="p-4 whitespace-pre-wrap text-sm rounded-md border">
        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          output
        )}
      </div>
    </div>
  );
};

export default ResearchOutput;
