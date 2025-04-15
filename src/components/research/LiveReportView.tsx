
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink, Clock, FileText, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReportSynthesis, Finding, FinalReport } from "@/types/research";
import ReportCompletionAlert from "./ReportCompletionAlert";

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
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  
  useEffect(() => {
    // When report becomes complete, show the notification
    if (isComplete && finalReport) {
      setShowNotification(true);
    }
  }, [isComplete, finalReport]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleNotificationClick = () => {
    setIsExpanded(true);
    setShowNotification(false);
  };

  return (
    <div className="h-full flex flex-col">
      <ReportCompletionAlert 
        isVisible={showNotification} 
        onClick={handleNotificationClick}
        onClose={() => setShowNotification(false)}
      />
      
      <div className="border-b pb-2 mb-4 flex justify-between items-center">
        <h2 className="font-semibold text-xl flex items-center gap-2 mb-1">
          <FileText className="h-5 w-5" />
          Research Report
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={toggleExpand}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        {isComplete 
          ? "Final research report ready" 
          : `Building report${syntheses.length > 0 ? ` (${syntheses.length} updates)` : ""}`}
      </p>
      
      {isExpanded && (
        <ScrollArea className="flex-1 pr-4 -mr-4">
          {!isComplete && syntheses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 animate-pulse" />
              <p>Preparing your report...</p>
            </div>
          )}
          
          {/* Report being built up */}
          {!isComplete && syntheses.length > 0 && (
            <div className="space-y-6">
              {syntheses.map((synthesis, index) => (
                <div 
                  key={`${synthesis.node_id}-${index}`}
                  className={cn(
                    "animate-fade-in"
                  )}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge variant={index === syntheses.length - 1 ? "default" : "outline"} className="bg-primary/10">
                      Update {synthesis.node_id}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(synthesis.timestamp)}
                    </span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="leading-relaxed whitespace-pre-wrap">{synthesis.synthesis}</p>
                  </div>
                  {synthesis.confidence > 0 && (
                    <div className="mt-2 flex justify-end">
                      <Badge 
                        variant="outline" 
                        className="bg-primary/10"
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
            <div className="space-y-8">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <h1 className="text-2xl font-semibold mb-4">{finalReport.query}</h1>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {finalReport.synthesis}
                </div>
                <div className="flex justify-end mt-4">
                  <Badge className="bg-primary/20">
                    Confidence: {Math.round(finalReport.confidence * 100)}%
                  </Badge>
                </div>
              </div>
              
              {finalReport.sources.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Sources & Findings</h3>
                  <div className="space-y-4">
                    {finalReport.sources.map((source, sourceIndex) => {
                      const sourceFindings = finalReport.findings.filter(f => 
                        f.url === source || f.source === source
                      );
                      
                      return (
                        <Card 
                          key={`source-${sourceIndex}`} 
                          className="overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-4 bg-muted/30">
                            <span className="text-sm truncate flex-1">{source}</span>
                            <a 
                              href={source} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary hover:text-primary/80 transition-colors ml-2"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </div>
                          
                          {sourceFindings.length > 0 && (
                            <div className="p-4 space-y-4 border-t">
                              {sourceFindings.map((finding, findingIndex) => (
                                <div 
                                  key={`finding-${findingIndex}`} 
                                  className="prose prose-sm dark:prose-invert"
                                >
                                  {(finding.title || finding.finding?.title) && (
                                    <h4 className="text-base font-medium mb-2">
                                      {finding.title || finding.finding?.title}
                                    </h4>
                                  )}
                                  <p className="text-muted-foreground leading-relaxed">
                                    {finding.summary || finding.finding?.summary || finding.content || "No content available"}
                                  </p>
                                  {(finding.confidence_score || finding.finding?.confidence_score) && (
                                    <Badge 
                                      variant="outline" 
                                      className="mt-2"
                                    >
                                      Confidence: {Math.round((finding.confidence_score || finding.finding?.confidence_score || 0) * 100)}%
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
      )}
    </div>
  );
};

export default LiveReportView;
