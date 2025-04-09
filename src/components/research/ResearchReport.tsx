import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Copy, Download, CheckCircle2, BookOpen } from "lucide-react";
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle } from 'docx';
import { captureEvent } from '@/integrations/posthog/client';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey } from '@/lib/constants';

export interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
  raw_data?: string;
  finding?: {
    title?: string;
    summary?: string;
    confidence_score?: number;
    url?: string;
  };
}

export interface SynthesisData {
  node_id: string;
  query: string;
  synthesis: string;
  confidence: number;
  timestamp?: string;
  depth?: number;
  parent_id?: string;
  is_root?: boolean;
  findings?: Finding[];
}

export interface ReportUpdateData {
  synthesis: string;
  confidence: number;
  timestamp: string;
  node_id: string;
  query: string;
}

export interface ResearchReportProps {
  sessionId?: string;
  isLoading?: boolean;
  initialQuery?: string;
  initialSources?: string[];
  initialFindings?: Finding[];
}

const ResearchReport: React.FC<ResearchReportProps> = ({
  sessionId,
  isLoading = false,
  initialQuery = '',
  initialSources = [],
  initialFindings = [],
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [report, setReport] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [sources, setSources] = useState<string[]>(initialSources);
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [syntheses, setSyntheses] = useState<SynthesisData[]>([]);
  
  useEffect(() => {
    if (syntheses.length === 0) return;
    
    const sortedSyntheses = [...syntheses].sort((a, b) => {
      if (a.is_root) return -1;
      if (b.is_root) return 1;
      if (a.depth !== undefined && b.depth !== undefined) return a.depth - b.depth;
      return a.node_id.localeCompare(b.node_id);
    });
    
    const rootSynthesis = sortedSyntheses.find(s => s.is_root || s.node_id === "0");
    if (rootSynthesis && !title) {
      const lines = rootSynthesis.synthesis.split('\n');
      if (lines.length > 0) {
        const potentialTitle = lines[0].trim();
        if (potentialTitle.length > 0 && potentialTitle.length < 100) {
          setTitle(potentialTitle);
        } else {
          setTitle(`Research on: ${rootSynthesis.query}`);
        }
      }
    }
    
    let reportText = '';
    
    if (title) {
      reportText += `# ${title}\n\n`;
    } else if (initialQuery) {
      reportText += `# Research on: ${initialQuery}\n\n`;
    }
    
    sortedSyntheses.forEach((synthesis, index) => {
      if (synthesis.is_root) {
        const contentLines = synthesis.synthesis.split('\n');
        if (contentLines.length > 1) {
          reportText += contentLines.slice(1).join('\n').trim() + '\n\n';
        }
      } else {
        const headingLevel = (synthesis.depth && synthesis.depth > 1) ? '#'.repeat(Math.min(synthesis.depth + 1, 6)) : '##';
        reportText += `${headingLevel} ${synthesis.query}\n\n${synthesis.synthesis}\n\n`;
      }
    });
    
    if (sources.length > 0) {
      reportText += '## Sources\n\n';
      sources.forEach((source, index) => {
        reportText += `${index + 1}. ${source}\n`;
      });
      reportText += '\n';
    }
    
    if (findings.length > 0) {
      reportText += '## Key Findings\n\n';
      
      const findingsBySource = findings.reduce((acc, finding) => {
        if (!finding.source) return acc;
        
        if (!acc[finding.source]) {
          acc[finding.source] = [];
        }
        
        if (!acc[finding.source].some(f => 
          f.finding?.title === finding.finding?.title && 
          f.finding?.summary === finding.finding?.summary
        )) {
          acc[finding.source].push(finding);
        }
        
        return acc;
      }, {} as Record<string, Finding[]>);
      
      Object.entries(findingsBySource).forEach(([source, sourceFindings]) => {
        reportText += `### From ${source}\n\n`;
        
        sourceFindings.forEach((finding, i) => {
          if (finding.finding?.title) {
            reportText += `**${finding.finding.title}**\n\n`;
          }
          
          if (finding.finding?.summary) {
            reportText += `${finding.finding.summary}\n\n`;
          } else if (finding.content) {
            reportText += `${finding.content}\n\n`;
          }
        });
      });
    }
    
    setReport(reportText);
  }, [syntheses, sources, findings, title, initialQuery]);
  
  useEffect(() => {
    if (!sessionId) return;
    
    const handleRealtimeUpdate = (event: CustomEvent) => {
      const payload = event.detail?.payload;
      if (!payload) return;
      
      if (payload.event_type === 'report_update' && payload.data) {
        const reportData = payload.data as ReportUpdateData;
        console.log(`[${new Date().toISOString()}] 📝 Received report update:`, reportData);
        
        setSyntheses(prev => {
          const existingIndex = prev.findIndex(s => s.node_id === reportData.node_id);
          
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              synthesis: reportData.synthesis,
              confidence: reportData.confidence,
              timestamp: reportData.timestamp
            };
            return updated;
          } else {
            return [...prev, {
              node_id: reportData.node_id,
              query: reportData.query,
              synthesis: reportData.synthesis,
              confidence: reportData.confidence,
              timestamp: reportData.timestamp,
              is_root: reportData.node_id === "0"
            }];
          }
        });
      }
      
      if ((payload.event_type === 'synthesis' || payload.event === 'synthesis') && payload.data) {
        const synthesisData = payload.data as SynthesisData;
        console.log(`[${new Date().toISOString()}] 🧠 Received synthesis:`, synthesisData);
        
        setSyntheses(prev => {
          const existingIndex = prev.findIndex(s => s.node_id === synthesisData.node_id);
          
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...synthesisData
            };
            return updated;
          } else {
            return [...prev, synthesisData];
          }
        });
        
        if (synthesisData.findings && Array.isArray(synthesisData.findings)) {
          setFindings(prev => {
            const newFindings = [...prev];
            
            synthesisData.findings?.forEach(finding => {
              if (!newFindings.some(f => 
                f.node_id === finding.node_id && 
                f.source === finding.source &&
                f.finding?.title === finding.finding?.title
              )) {
                newFindings.push(finding);
              }
            });
            
            return newFindings;
          });
        }
      }
      
      if ((payload.event_type === 'final_report' || payload.event === 'final_report') && payload.data) {
        console.log(`[${new Date().toISOString()}] 🏁 Received final report:`, payload.data);
        
        const finalReportData = payload.data;
        
        if (finalReportData.sources && Array.isArray(finalReportData.sources)) {
          setSources(finalReportData.sources);
        }
        
        if (finalReportData.findings && Array.isArray(finalReportData.findings)) {
          setFindings(finalReportData.findings);
        }
        
        if (finalReportData.synthesis) {
          setSyntheses(prev => {
            const rootIndex = prev.findIndex(s => s.is_root || s.node_id === "0");
            
            if (rootIndex >= 0) {
              const updated = [...prev];
              updated[rootIndex] = {
                ...updated[rootIndex],
                synthesis: finalReportData.synthesis,
                confidence: finalReportData.confidence || updated[rootIndex].confidence,
                timestamp: finalReportData.timestamp,
                is_root: true
              };
              return updated;
            } else {
              return [...prev, {
                node_id: "0",
                query: finalReportData.query || initialQuery,
                synthesis: finalReportData.synthesis,
                confidence: finalReportData.confidence || 1.0,
                timestamp: finalReportData.timestamp,
                is_root: true
              }];
            }
          });
        }
        
        toast.success("Research completed!", {
          description: "Final report is ready for review"
        });
      }
      
      if (payload.table === 'research_states' && payload.new && payload.new.session_id === sessionId) {
        if (payload.new.sources && Array.isArray(payload.new.sources)) {
          setSources(payload.new.sources);
        }
        
        if (payload.new.findings && Array.isArray(payload.new.findings)) {
          setFindings(payload.new.findings);
        }
      }
    };
    
    window.addEventListener('research_state_update', handleRealtimeUpdate as EventListener);
    window.addEventListener('research-new-event', handleRealtimeUpdate as EventListener);
    
    return () => {
      window.removeEventListener('research_state_update', handleRealtimeUpdate as EventListener);
      window.removeEventListener('research-new-event', handleRealtimeUpdate as EventListener);
    };
  }, [sessionId, initialQuery]);
  
  useEffect(() => {
    if (!sessionId) return;
    
    try {
      const sessionSynthesesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SYNTHESIS_CACHE, sessionId);
      const synthesesCache = localStorage.getItem(sessionSynthesesKey);
      
      if (synthesesCache) {
        const parsedSyntheses = JSON.parse(synthesesCache);
        if (typeof parsedSyntheses === 'object') {
          if (!Array.isArray(parsedSyntheses)) {
            const synthesesArray = Object.entries(parsedSyntheses).map(([nodeId, data]) => ({
              node_id: nodeId,
              ...(data as any)
            }));
            setSyntheses(synthesesArray);
          } else {
            setSyntheses(parsedSyntheses);
          }
        }
      }
      
      const sessionFindingsKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINDINGS_CACHE, sessionId);
      const findingsCache = localStorage.getItem(sessionFindingsKey);
      
      if (findingsCache) {
        const parsedFindings = JSON.parse(findingsCache);
        if (Array.isArray(parsedFindings)) {
          setFindings(parsedFindings);
        }
      }
      
      const sessionSourcesKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.SOURCES_CACHE, sessionId);
      const sourcesCache = localStorage.getItem(sessionSourcesKey);
      
      if (sourcesCache) {
        const parsedSources = JSON.parse(sourcesCache);
        if (Array.isArray(parsedSources)) {
          setSources(parsedSources);
        }
      }
    } catch (e) {
      console.error("Error loading from session cache:", e);
    }
  }, [sessionId]);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setIsCopied(true);
      toast.success("Report copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
      
      captureEvent('research_report_copied', { 
        report_length: report.length,
        session_id: sessionId
      });
    } catch (err) {
      console.error("Failed to copy text:", err);
      toast.error("Failed to copy text");
      
      captureEvent('research_report_copy_error', {
        error: err instanceof Error ? err.message : String(err),
        session_id: sessionId
      });
    }
  };

  const exportToPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(title || `Research Report: ${initialQuery}`, 20, 20);
      
      const splitText = doc.splitTextToSize(report, 170);
      doc.text(splitText, 20, 30);
      
      doc.save("research-report.pdf");
      toast.success("PDF downloaded successfully");
      
      captureEvent('research_report_exported', { 
        format: 'pdf',
        report_length: report.length,
        session_id: sessionId
      });
    } catch (err) {
      console.error("Failed to export as PDF:", err);
      toast.error("Failed to export as PDF");
      
      captureEvent('research_report_export_error', {
        format: 'pdf',
        error: err instanceof Error ? err.message : String(err),
        session_id: sessionId
      });
    }
  };

  const exportToDocx = async () => {
    try {
      const sections = report.split(/#{1,6}\s+/);
      const headings = report.match(/#{1,6}\s+[^\n]+/g) || [];
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: title || `Research Report: ${initialQuery}`,
              heading: HeadingLevel.TITLE,
            }),
            ...sections.map((section, index) => {
              if (index === 0 && !section.trim()) return [];
              
              const heading = index > 0 ? headings[index - 1] : null;
              const headingLevel = heading ? Math.min((heading.match(/^#+/) || ['#'])[0].length, 6) : 0;
              const headingText = heading ? heading.replace(/^#+\s+/, '') : '';
              
              const paragraphs = [];
              
              if (heading) {
                paragraphs.push(
                  new Paragraph({
                    text: headingText,
                    heading: headingLevel === 1 ? HeadingLevel.HEADING_1 :
                             headingLevel === 2 ? HeadingLevel.HEADING_2 :
                             headingLevel === 3 ? HeadingLevel.HEADING_3 :
                             headingLevel === 4 ? HeadingLevel.HEADING_4 :
                             headingLevel === 5 ? HeadingLevel.HEADING_5 :
                             HeadingLevel.HEADING_6
                  })
                );
              }
              
              section.split('\n').forEach(line => {
                if (line.trim()) {
                  paragraphs.push(
                    new Paragraph({
                      children: [new TextRun({ text: line })],
                    })
                  );
                } else {
                  paragraphs.push(new Paragraph({}));
                }
              });
              
              return paragraphs;
            }).flat(),
          ],
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "research-report.docx");
      toast.success("DOCX downloaded successfully");
      
      captureEvent('research_report_exported', { 
        format: 'docx',
        report_length: report.length,
        session_id: sessionId
      });
    } catch (err) {
      console.error("Failed to export as DOCX:", err);
      toast.error("Failed to export as DOCX");
      
      captureEvent('research_report_export_error', {
        format: 'docx',
        error: err instanceof Error ? err.message : String(err),
        session_id: sessionId
      });
    }
  };

  if (isLoading && !report) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="space-y-2 mt-6">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center space-y-6">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <div>
          <h3 className="text-lg font-medium">No Report Yet</h3>
          <p className="text-muted-foreground">
            Your research report will appear here as the analysis progresses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="m-0 text-xl font-semibold">Research Report</h2>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>
      
      <div className="bg-card rounded-lg border p-4 shadow-sm">
        <div className="whitespace-pre-wrap report-content">
          {report.split("\n").map((line, i) => {
            if (line.startsWith("# ")) {
              return <h1 key={i} className="mt-2 mb-4 text-2xl font-bold">{line.substring(2)}</h1>;
            }
            if (line.startsWith("## ")) {
              return <h2 key={i} className="mt-6 mb-3 text-xl font-bold">{line.substring(3)}</h2>;
            }
            if (line.startsWith("### ")) {
              return <h3 key={i} className="mt-4 mb-2 text-lg font-bold">{line.substring(4)}</h3>;
            }
            
            if (line.includes("**")) {
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <p key={i} className="mb-3">
                  {parts.map((part, j) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return <strong key={j}>{part.substring(2, part.length - 2)}</strong>;
                    }
                    return <span key={j}>{part}</span>;
                  })}
                </p>
              );
            }
            
            if (line.trim() === "") {
              return <div key={i} className="h-2"></div>;
            }
            
            return <p key={i} className="mb-3">{line}</p>;
          })}
        </div>
        
        {syntheses.length > 0 && (
          <div className="mt-4 flex items-center">
            <Badge 
              variant="outline" 
              className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
            >
              {syntheses.length} synthesis nodes
            </Badge>
            
            {sources.length > 0 && (
              <Badge 
                variant="outline" 
                className="ml-2 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
              >
                {sources.length} sources
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchReport;
