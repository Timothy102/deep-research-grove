
import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ResearchOutput = ({ output }: { output: string }) => {
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
  
  if (!output) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Research output will appear here...</p>
      </div>
    );
  }
  
  return (
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
        {output}
      </div>
    </div>
  );
};

export default ResearchOutput;
