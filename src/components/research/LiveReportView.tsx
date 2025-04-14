
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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

type LiveReportViewProps = {
  syntheses: ReportSynthesis[];
  finalReport: FinalReport | null;
  isComplete: boolean;
  sessionId: string | null;
};

const LiveReportView = ({
  syntheses,
  finalReport,
  isComplete,
  sessionId
}: LiveReportViewProps) => {
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b pb-2 mb-4">
        <h2 className="text-lg font-semibold">Research Report</h2>
        <p className="text-sm text-muted-foreground">
          {isComplete 
            ? "Final research report ready" 
            : `Building report${syntheses.length > 0 ? ` (${syntheses.length} updates)` : ""}`}
        </p>
      </div>
      
      <ScrollArea className="flex-1 pr-4 -mr-4">
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
              <Card 
                key={`${synthesis.node_id}-${index}`} 
                className={cn(
                  "p-4 animate-fade-in", 
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
              </Card>
            ))}
          </div>
        )}
        
        {/* Final report */}
        {isComplete && finalReport && (
          <div className="space-y-6">
            <Card className="p-4">
              <h2 className="text-lg font-medium mb-2">Report Summary</h2>
              <p className="text-sm whitespace-pre-wrap mb-2">{finalReport.synthesis}</p>
              <div className="flex justify-end">
                <Badge className="bg-primary/20 text-primary">
                  Confidence: {Math.round(finalReport.confidence * 100)}%
                </Badge>
              </div>
            </Card>
            
            {/* Sources and findings */}
            {finalReport.sources.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Sources & Findings</h3>
                <div className="space-y-3">
                  {finalReport.sources.map((source, sourceIndex) => {
                    const sourceFindings = finalReport.findings.filter(f => f.source === source);
                    
                    return (
                      <Card 
                        key={`source-${sourceIndex}`} 
                        className="overflow-hidden"
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
                          <div className="p-3 space-y-3 border-t">
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
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default LiveReportView;
