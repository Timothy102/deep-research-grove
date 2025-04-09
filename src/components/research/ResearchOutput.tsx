
import React, { useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Download, CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { captureEvent } from '@/integrations/posthog/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey } from '@/lib/constants';

export interface ResearchResult {
  query: string;
  synthesis?: string;
  confidence: number;
  reasoning_path?: string[];
  findings?: any[];
  sources?: string[];
  timestamp?: string;
  node_id?: string;
}

export interface ResearchOutputProps {
  output: string;
  isLoading?: boolean;
  userName?: string;
  userModels?: any[];
  onSelectModel?: (modelId: string) => void;
  reportData?: ResearchResult;
  result?: ResearchResult;
}

const ResearchOutput: React.FC<ResearchOutputProps> = ({ 
  output, 
  isLoading = false, 
  userName,
  userModels = [],
  onSelectModel,
  reportData,
  result
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isReportExpanded, setIsReportExpanded] = useState(true);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const [isConfidenceExpanded, setIsConfidenceExpanded] = useState(false);

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

  if (!output.trim() && !reportData && !result) {
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

  // Use reportData or result if available, otherwise use the output string
  const reportContent = reportData?.synthesis || result?.synthesis || output;
  const reportQuery = reportData?.query || result?.query || '';
  const reportConfidence = reportData?.confidence || result?.confidence || 0;
  const reportSources = reportData?.sources || result?.sources || [];
  const reportFindings = reportData?.findings || result?.findings || [];

  const copyToClipboard = async () => {
    try {
      const contentToCopy = reportContent;
      await navigator.clipboard.writeText(contentToCopy);
      setIsCopied(true);
      toast.success("Output copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
      
      captureEvent('research_output_copied', { 
        output_length: contentToCopy.length 
      });
    } catch (err) {
      console.error("Failed to copy text:", err);
      toast.error("Failed to copy text");
      
      captureEvent('research_output_copy_error', {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  };

  const exportToPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(reportQuery || "Research Results", 20, 20);
      
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(reportContent, 170);
      doc.text(splitText, 20, 30);
      
      if (reportSources && reportSources.length > 0) {
        const lastTextY = Math.min(doc.internal.pageSize.height - 20, 30 + splitText.length * 5);
        doc.text("Sources:", 20, lastTextY + 10);
        
        let sourceY = lastTextY + 15;
        reportSources.forEach((source, index) => {
          const sourceLine = `${index + 1}. ${source}`;
          const splitSource = doc.splitTextToSize(sourceLine, 170);
          
          // Add new page if needed
          if (sourceY + splitSource.length * 5 > doc.internal.pageSize.height - 10) {
            doc.addPage();
            sourceY = 20;
          }
          
          doc.text(splitSource, 20, sourceY);
          sourceY += splitSource.length * 5 + 5;
        });
      }
      
      doc.save("research-output.pdf");
      toast.success("PDF downloaded successfully");
      
      captureEvent('research_output_exported', { 
        format: 'pdf',
        output_length: reportContent.length
      });
    } catch (err) {
      console.error("Failed to export as PDF:", err);
      toast.error("Failed to export as PDF");
      
      captureEvent('research_output_export_error', {
        format: 'pdf',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  };

  const exportToDocx = async () => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: reportQuery || "Research Results", bold: true, size: 28 }),
              ],
            }),
            new Paragraph({
              text: reportContent,
            }),
          ],
        }],
      });
      
      // Add sources if available
      if (reportSources && reportSources.length > 0) {
        doc.addSection({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Sources", bold: true, size: 24 }),
              ],
            }),
            ...reportSources.map((source, index) => 
              new Paragraph({
                text: `${index + 1}. ${source}`,
              })
            ),
          ],
        });
      }
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "research-output.docx");
      toast.success("DOCX downloaded successfully");
      
      captureEvent('research_output_exported', { 
        format: 'docx',
        output_length: reportContent.length
      });
    } catch (err) {
      console.error("Failed to export as DOCX:", err);
      toast.error("Failed to export as DOCX");
      
      captureEvent('research_output_export_error', {
        format: 'docx',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  };

  const exportToMarkdown = () => {
    try {
      let markdown = `# ${reportQuery || 'Research Results'}\n\n`;
      markdown += reportContent;
      
      if (reportSources && reportSources.length > 0) {
        markdown += '\n\n## Sources\n\n';
        reportSources.forEach((source, index) => {
          markdown += `${index + 1}. ${source}\n`;
        });
      }
      
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      saveAs(blob, "research-output.md");
      toast.success("Markdown downloaded successfully");
      
      captureEvent('research_output_exported', { 
        format: 'markdown',
        output_length: reportContent.length
      });
    } catch (err) {
      console.error("Failed to export as Markdown:", err);
      toast.error("Failed to export as Markdown");
      
      captureEvent('research_output_export_error', {
        format: 'markdown',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  };

  const renderConfidenceScore = (confidence: number) => {
    let color = 'text-red-500';
    if (confidence >= 0.8) {
      color = 'text-green-500';
    } else if (confidence >= 0.5) {
      color = 'text-yellow-500';
    }
    
    const percentage = Math.round(confidence * 100);
    
    return (
      <div className="flex items-center">
        <span className={`text-sm font-semibold ${color}`}>
          {percentage}%
        </span>
        <div className="ml-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24">
          <div 
            className={`h-full rounded-full ${
              confidence >= 0.8 ? 'bg-green-500' : 
              confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {reportConfidence > 0 && (
            <Collapsible open={isConfidenceExpanded} onOpenChange={setIsConfidenceExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <span>Confidence</span> 
                  {renderConfidenceScore(reportConfidence)}
                  {isConfidenceExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-2 border rounded-md">
                <p className="text-sm">
                  {reportConfidence >= 0.8 
                    ? "High confidence: This research has strong supporting evidence and comprehensive analysis."
                    : reportConfidence >= 0.5 
                    ? "Medium confidence: This research has reasonable supporting evidence but may benefit from additional sources."
                    : "Low confidence: Consider this research preliminary. Additional sources and analysis are recommended."
                  }
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1" 
            onClick={copyToClipboard}
          >
            {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            <span>{isCopied ? "Copied" : "Copy"}</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1" 
            onClick={exportToPdf}
          >
            <FileText size={16} />
            <span>PDF</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1" 
            onClick={exportToDocx}
          >
            <FileSpreadsheet size={16} />
            <span>DOCX</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1" 
            onClick={exportToMarkdown}
          >
            <Download size={16} />
            <span>MD</span>
          </Button>
        </div>
      </div>
      
      {reportQuery && (
        <h2 className="text-xl font-bold mt-0 mb-4">{reportQuery}</h2>
      )}
      
      <Collapsible open={isReportExpanded} onOpenChange={setIsReportExpanded}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold m-0">Report</h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isReportExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="transition-all">
          <div className="whitespace-pre-wrap">{reportContent}</div>
        </CollapsibleContent>
      </Collapsible>
      
      {reportSources && reportSources.length > 0 && (
        <Collapsible open={isSourcesExpanded} onOpenChange={setIsSourcesExpanded} className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold m-0">Sources ({reportSources.length})</h3>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isSourcesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="transition-all">
            <ul className="pl-5 mt-2">
              {reportSources.map((source, index) => (
                <li key={index} className="mb-1 text-sm">
                  {source}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default ResearchOutput;
