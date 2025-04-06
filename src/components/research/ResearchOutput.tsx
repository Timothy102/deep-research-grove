
import React, { useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileText, FileCode, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface ResearchOutputProps {
  output: string;
  isLoading?: boolean;
  userName?: string;
  userModels?: any[];
  onSelectModel?: (modelId: string) => void;
}

const ResearchOutput: React.FC<ResearchOutputProps> = ({ 
  output, 
  isLoading = false, 
  userName,
  userModels = [],
  onSelectModel
}) => {
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setIsCopied(true);
      toast.success("Research output copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Failed to copy text");
    }
  };

  const downloadAsDocx = () => {
    try {
      // Create a Blob with the text content
      const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-output-${new Date().toISOString().split('T')[0]}.docx`;
      // Trigger download
      document.body.appendChild(a);
      a.click();
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloaded as DOCX");
    } catch (err) {
      console.error("Failed to download as DOCX: ", err);
      toast.error("Failed to download as DOCX");
    }
  };

  const downloadAsPdf = () => {
    try {
      // Create a Blob with the text content
      const blob = new Blob([output], { type: 'application/pdf' });
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-output-${new Date().toISOString().split('T')[0]}.pdf`;
      // Trigger download
      document.body.appendChild(a);
      a.click();
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloaded as PDF");
    } catch (err) {
      console.error("Failed to download as PDF: ", err);
      toast.error("Failed to download as PDF");
    }
  };

  const downloadAsText = () => {
    try {
      // Create a Blob with the text content
      const blob = new Blob([output], { type: 'text/plain' });
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-output-${new Date().toISOString().split('T')[0]}.txt`;
      // Trigger download
      document.body.appendChild(a);
      a.click();
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloaded as text file");
    } catch (err) {
      console.error("Failed to download as text: ", err);
      toast.error("Failed to download as text file");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!output.trim()) {
    return (
      <div className="text-center space-y-6">
        {userName ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Hey, {userName}</h2>
            <p className="text-muted-foreground text-lg">Who are you today?</p>
            
            {userModels && userModels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-w-4xl mx-auto">
                {userModels.map((model) => (
                  <Card 
                    key={model?.id || Math.random().toString()} 
                    className="cursor-pointer hover:border-primary transition-colors duration-200"
                    onClick={() => onSelectModel && model?.id && onSelectModel(model.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{model?.name || "Unnamed Model"}</span>
                          {model?.is_default && (
                            <Badge variant="outline" className="text-xs px-1 py-0">Default</Badge>
                          )}
                        </div>
                        
                        {model?.domain && (
                          <span className="text-xs text-muted-foreground truncate">
                            Domain: {model.domain}
                          </span>
                        )}
                        
                        {model?.expertise_level && (
                          <span className="text-xs text-muted-foreground truncate">
                            Expertise: {model.expertise_level}
                          </span>
                        )}
                        
                        {model?.cognitive_style && (
                          <span className="text-xs text-muted-foreground truncate">
                            Style: {model.cognitive_style}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground mt-4">
                <p>No user models found. Create one to get started!</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No research output yet. Start a search to see results here.</p>
        )}
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <div className="flex justify-end mb-2 space-x-2">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={copyToClipboard}
        >
          {isCopied ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span>Copy</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={downloadAsDocx}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Download as DOCX</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadAsPdf}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Download as PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadAsText}>
              <FileCode className="mr-2 h-4 w-4" />
              <span>Download as TXT</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="whitespace-pre-wrap">{output}</div>
    </div>
  );
};

export default ResearchOutput;
