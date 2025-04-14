
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, FileText, X, ExternalLink, Copy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export type ReportSynthesis = {
  synthesis: string;
  confidence: number;
  timestamp: string;
  node_id: string;
  query: string;
};

export type SourceFinding = {
  source: string;
  content?: string;
  finding?: {
    title?: string;
    summary?: string;
    confidence_score?: number;
  };
  node_id?: string;
};

export type FinalReport = {
  query: string;
  synthesis: string;
  confidence: number;
  reasoning_path: string[];
  findings: SourceFinding[];
  sources: string[];
  timestamp: string;
};

type ReportBuildupDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  syntheses: ReportSynthesis[];
  finalReport: FinalReport | null;
  isComplete: boolean;
};

export const ReportBuildupDialog = ({
  isOpen,
  onClose,
  syntheses,
  finalReport,
  isComplete,
}: ReportBuildupDialogProps) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = async () => {
    try {
      const textToCopy = finalReport 
        ? finalReport.synthesis 
        : syntheses.map(s => s.synthesis).join("\n\n");
        
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Report copied to clipboard");
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Failed to copy to clipboard");
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isComplete ? "Research Report" : "Building Report"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isComplete && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>Copy</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-8 h-8 p-0" 
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 -mr-4 mt-2">
          {!isComplete && syntheses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 animate-pulse" />
              <p>Preparing your report...</p>
            </div>
          )}
          
          {/* Report being built up */}
          {!isComplete && syntheses.length > 0 && (
            <div className="space-y-4">
              {syntheses.map((synthesis, index) => (
                <div 
                  key={`${synthesis.node_id}-${index}`} 
                  className={cn(
                    "p-4 border rounded-md bg-card animate-fade-in", 
                    index === syntheses.length - 1 && "border-primary/50 bg-primary/5"
                  )}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge variant={index === syntheses.length - 1 ? "default" : "outline"}>
                      Step {synthesis.node_id}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(synthesis.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{synthesis.synthesis}</p>
                  {synthesis.confidence > 0 && (
                    <div className="mt-2 flex justify-end">
                      <Badge 
                        variant="outline" 
                        className="bg-primary/10 text-primary-foreground/80"
                      >
                        Confidence: {Math.round(synthesis.confidence * 100)}%
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Final report */}
          {isComplete && finalReport && (
            <div className="space-y-6">
              <div className="p-4 border rounded-md bg-card">
                <h2 className="text-lg font-medium mb-2">Report Summary</h2>
                <p className="text-sm whitespace-pre-wrap mb-2">{finalReport.synthesis}</p>
                <div className="flex justify-end">
                  <Badge className="bg-primary/20 text-primary">
                    Confidence: {Math.round(finalReport.confidence * 100)}%
                  </Badge>
                </div>
              </div>
              
              {/* Sources and findings */}
              {finalReport.sources.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground">Sources & Findings</h3>
                  <div className="space-y-3">
                    {finalReport.sources.map((source, sourceIndex) => {
                      const sourceFindings = finalReport.findings.filter(f => f.source === source);
                      
                      return (
                        <div 
                          key={`source-${sourceIndex}`} 
                          className="border rounded-md overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-3 bg-muted/30">
                            <span className="text-sm truncate flex-1">{source}</span>
                            <a 
                              href={source} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary hover:text-primary/80 transition-colors"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </div>
                          
                          {sourceFindings.length > 0 && (
                            <div className="p-3 space-y-3 border-t bg-card">
                              {sourceFindings.map((finding, findingIndex) => (
                                <div 
                                  key={`finding-${findingIndex}`} 
                                  className="text-sm p-2 rounded-sm bg-muted/30"
                                >
                                  {finding.finding?.title && (
                                    <h4 className="font-medium mb-1">{finding.finding.title}</h4>
                                  )}
                                  <p className="text-muted-foreground">
                                    {finding.finding?.summary || finding.content || "No content available"}
                                  </p>
                                  {finding.finding?.confidence_score && (
                                    <Badge 
                                      variant="outline" 
                                      className="mt-2 text-xs bg-green-50 text-green-700"
                                    >
                                      Confidence: {Math.round(finding.finding.confidence_score * 100)}%
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
