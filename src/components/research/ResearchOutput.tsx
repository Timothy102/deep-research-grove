
import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Download, CheckCircle2, FileDown, Newspaper, ChevronDown, ChevronUp } from "lucide-react";
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { captureEvent } from '@/integrations/posthog/client';

export interface ReportSection {
  node_id: string;
  synthesis: string;
  confidence?: number;
  timestamp?: string;
  depth?: number;
  query?: string;
  parent_id?: string;
  is_root?: boolean;
  findings?: any[];
}

export interface ReportData {
  sections: ReportSection[];
  finalSynthesis?: string;
  confidence?: number;
  sources?: string[];
  findings?: any[];
}

export interface ResearchOutputProps {
  output: string;
  isLoading?: boolean;
  userName?: string;
  userModels?: any[];
  onSelectModel?: (modelId: string) => void;
  reportData?: ReportData;
  sessionId?: string;
}

const ResearchOutput: React.FC<ResearchOutputProps> = ({ 
  output, 
  isLoading = false, 
  userName,
  userModels = [],
  onSelectModel,
  reportData,
  sessionId
}) => {
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);
  const [expandedReport, setExpandedReport] = useState(false);
  const [startTime] = useState<number>(Date.now());

  useEffect(() => {
    if (output && !isLoading && sessionId) {
      // Calculate the duration from start time to now
      const duration = Date.now() - startTime;
      
      // Capture research completed event with metrics
      captureEvent('research_completed', {
        session_id: sessionId,
        time_taken_ms: duration,
        output_length: output.length,
        has_report_data: !!reportData,
        section_count: reportData?.sections?.length || 0
      });
    }
  }, [output, isLoading, sessionId, reportData, startTime]);

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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setIsCopied(true);
      toast.success("Output copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
      
      captureEvent('research_output_copied', { 
        output_length: output.length,
        session_id: sessionId
      });
    } catch (err) {
      console.error("Failed to copy text:", err);
      toast.error("Failed to copy text");
      
      captureEvent('research_output_copy_error', {
        error: err instanceof Error ? err.message : String(err),
        session_id: sessionId
      });
    }
  };

  const exportToPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text("Research Results", 20, 20);
      
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(output, 170);
      doc.text(splitText, 20, 30);
      
      doc.save("research-output.pdf");
      toast.success("PDF downloaded successfully");
      
      captureEvent('research_output_exported', { 
        format: 'pdf',
        output_length: output.length,
        session_id: sessionId,
        completion_method: 'pdf'
      });
    } catch (err) {
      console.error("Failed to export as PDF:", err);
      toast.error("Failed to export as PDF");
      
      captureEvent('research_output_export_error', {
        format: 'pdf',
        error: err instanceof Error ? err.message : String(err),
        session_id: sessionId
      });
    }
  };

  const exportToDocx = async () => {
    try {
      // Create document with sections if report data exists
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "Research Results",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              text: "",
            }),
            ...(reportData && reportData.sections && reportData.sections.length > 0 
              ? [
                  ...reportData.sections.map(section => [
                    new Paragraph({
                      text: section.synthesis ? `${section.query || "Research Section"}` : "",
                      heading: HeadingLevel.HEADING_2,
                    }),
                    new Paragraph({
                      text: section.synthesis || "",
                    }),
                    new Paragraph({
                      text: section.confidence ? `Confidence: ${(section.confidence * 100).toFixed(0)}%` : "",
                      italics: true,
                    }),
                    new Paragraph({ text: "" }),
                  ]).flat()
                ]
              : [
                  new Paragraph({
                    text: output,
                  }),
                ]
            ),
            ...(reportData && reportData.sources && reportData.sources.length > 0
              ? [
                  new Paragraph({
                    text: "Sources",
                    heading: HeadingLevel.HEADING_2,
                  }),
                  ...reportData.sources.map(source => 
                    new Paragraph({
                      text: source,
                      bullet: {
                        level: 0
                      }
                    })
                  )
                ]
              : []
            )
          ],
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "research-output.docx");
      toast.success("DOCX downloaded successfully");
      
      captureEvent('research_output_exported', { 
        format: 'docx',
        output_length: output.length,
        section_count: reportData?.sections?.length || 0,
        has_structured_data: !!reportData,
        session_id: sessionId,
        completion_method: 'docx'
      });
    } catch (err) {
      console.error("Failed to export as DOCX:", err);
      toast.error("Failed to export as DOCX");
      
      captureEvent('research_output_export_error', {
        format: 'docx',
        error: err instanceof Error ? err.message : String(err),
        session_id: sessionId
      });
    }
  };

  const exportToMarkdown = () => {
    try {
      let markdownContent = "# Research Results\n\n";
      
      if (reportData && reportData.sections && reportData.sections.length > 0) {
        reportData.sections.forEach((section) => {
          if (section.synthesis) {
            markdownContent += `## ${section.query || "Research Section"}\n\n`;
            markdownContent += `${section.synthesis}\n\n`;
            if (section.confidence) {
              markdownContent += `*Confidence: ${(section.confidence * 100).toFixed(0)}%*\n\n`;
            }
          }
        });
        
        if (reportData.sources && reportData.sources.length > 0) {
          markdownContent += "## Sources\n\n";
          reportData.sources.forEach((source) => {
            markdownContent += `- ${source}\n`;
          });
        }
      } else {
        markdownContent += output;
      }
      
      const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
      saveAs(blob, "research-output.md");
      toast.success("Markdown file downloaded successfully");
      
      captureEvent('research_output_exported', { 
        format: 'markdown',
        output_length: markdownContent.length,
        section_count: reportData?.sections?.length || 0,
        has_structured_data: !!reportData,
        session_id: sessionId,
        completion_method: 'markdown'
      });
    } catch (err) {
      console.error("Failed to export as Markdown:", err);
      toast.error("Failed to export as Markdown");
      
      captureEvent('research_output_export_error', {
        format: 'markdown',
        error: err instanceof Error ? err.message : String(err),
        session_id: sessionId
      });
    }
  };

  const renderReportSections = () => {
    if (!reportData || !reportData.sections || reportData.sections.length === 0) {
      return null;
    }
    
    return (
      <div className="mt-4 space-y-4">
        <div 
          className="flex items-center justify-between cursor-pointer p-2 hover:bg-muted rounded-md"
          onClick={() => setExpandedReport(!expandedReport)}
        >
          <h3 className="text-lg font-medium flex items-center">
            <Newspaper className="h-5 w-5 mr-2" />
            Detailed Research Report 
            {reportData.sections.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {reportData.sections.length} sections
              </Badge>
            )}
          </h3>
          {expandedReport ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
        
        {expandedReport && (
          <div className="space-y-4 pl-2 border-l-2 border-muted">
            {reportData.sections.map((section, index) => (
              <div key={section.node_id || index} className="p-3 border rounded-md">
                {section.query && (
                  <h4 className="font-medium mb-2">{section.query}</h4>
                )}
                {section.synthesis && (
                  <div className="whitespace-pre-wrap text-sm">{section.synthesis}</div>
                )}
                {section.confidence !== undefined && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center">
                    <span>Confidence: </span>
                    <div className="ml-1 w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${section.confidence * 100}%` }}
                      />
                    </div>
                    <span className="ml-1">{(section.confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
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
          <Download size={16} />
          <span>DOCX</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1" 
          onClick={exportToMarkdown}
        >
          <FileDown size={16} />
          <span>MD</span>
        </Button>
      </div>
      
      <div className="whitespace-pre-wrap">{output}</div>
      
      {renderReportSections()}
    </div>
  );
};

export default ResearchOutput;
